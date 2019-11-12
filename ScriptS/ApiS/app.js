var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');
var Env = require('./.env.json')
var Ether = require('./ether.js')
var Dapp = require('./dapp.js')
var EtherL = require('./etherL.js')
var DappL = require('./dappL.js')
var Web3Util = require('web3-utils')
var Log4JS = require('log4js')
var Log4JSExtend = require('log4js-extend')
var session = require('express-session')
var sessionStore = require('session-file-store')(session)
var ipfilter = require('express-ipfilter').IpFilter
var IpDeniedError = require('express-ipfilter').IpDeniedError
var axios = require('axios')
var FormData = require('form-data')
var systemOs = require('os')
const fs = require('fs')
var https = require('https')
var program = require('commander')
const path = require('path')

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

//상수값  정의
const _programName = "maChain"
// 인자값 정의
var _isRunNode= ""
var _runMode = ""
var _httpPort = 55442
var _httpsPort = 55443
var _homePath = ""
var _procCnt = 1

// 내부 변수
var _sessionHome =""
var _logHome = __dirname

// 인자값 분석
for( i=0 ; i < process.argv.length ; i++ ) {
  if( process.argv[i] == "-runMode" ) {
    _runMode = process.argv[i+1]
    i++
  }
  if( process.argv[i] == "-httpPort" ) {
    _httpPort = parseInt( process.argv[i+1] )
    i++
  }
  if( process.argv[i] == "-httpsPort" ) {
    _httpsPort = parseInt( process.argv[i+1] )
    i++
  }
  if( process.argv[i] == "-homePath" ) {
    _homePath = process.argv[i+1]
    i++
  }
  if( process.argv[i] == "-node" ) {
    _isRunNode = process.argv[i]
  }
  if( process.argv[i] == "-win32" ) {
    _isRunNode = process.argv[i]
  }

  if( process.argv[i] == "-p" ) {
    _procCnt = parseInt( process.argv[i+1] );
    i++;
  }
}

// console.log( "_runMode:" + _runMode);
// console.log( "_httpPort:" + _httpPort);
// console.log( "_httpsPort:" + _httpsPort);
// console.log( "_homePath:" + _homePath);

// get homedir
var homePath = "";
function safeMakeFolder( fol ) {
  if( !fs.existsSync( fol ) ) {
    fs.mkdirSync(fol)
    // var mkdirp = require('mkdirp')
    // await  mkdirp('./omg', function(err){
    //    console.log(err); });
    }
}

if( _homePath == "" ) {

  if(_isRunNode == "-win32"  ){
      if( process.platform == "win32" ){
          var _localHome = require('os').homedir()
          _localHome += path.sep + "AppData" +  path.sep +"LocalLow" + path.sep + _programName
          homePath = _localHome
      }else {
        homePath =  path.dirname( process.argv[0] )
      }
  }else if( path.win32.basename(process.argv[0]) == "node" ||path.win32.basename(process.argv[0]) == "node.exe"  || _isRunNode == "-node" ){
    console.log( "run node proigram")
    homePath =  __dirname
//    console.log( "node mode:" + homePath);

  }else{
  homePath =  path.dirname( process.argv[0] )
  }
}else{
  homePath = _homePath
}

// 기본 폴더 만들기
safeMakeFolder(homePath )  // 제품 홈디렉토리
_logHome = homePath + path.sep +"logs"
 safeMakeFolder(_logHome ) // 로그 폴더
var _certHome = homePath + path.sep +"keystore"
 safeMakeFolder(_certHome ) // 인증서 폴더
_sessionHome = homePath + path.sep +"sessions"
 safeMakeFolder(_sessionHome ) // 인증서 폴더

// 로그 설정
Log4JS.configure({
   appenders: { ApiLog: { type: 'file', filename: _logHome + '/onchain.log', maxLogSize: 524288, backups: 2, compress: true }
                , EtherLog: { type: 'file', filename: _logHome + '/onchain.log', maxLogSize: 524288, backups: 2, compress: true }
                , DAppLog: { type: 'file', filename: _logHome + '/onchain.log', maxLogSize: 524288, backups: 2, compress: true }
    },
   categories: { default: { appenders: ['ApiLog'], level: 'error' } }
})

Log4JSExtend(Log4JS, {
  path: _logHome,
  format: "at @name (@file:@line:@column)"
})
var Logger = Log4JS.getLogger('ApiLog')
var LoggerEther = Log4JS.getLogger('EtherLog')
var LoggerDapp = Log4JS.getLogger('DAppLog')

Logger.level = Env.log_level
LoggerEther.level = Env.log_level
LoggerDapp.level = Env.log_level

Logger.debug('===============================================================' );
Logger.debug('http server running path:' + homePath );
Logger.debug('_runMode: ' + _runMode )
Logger.debug('_homePath: ' + _homePath )
Logger.debug('_httpsPort: ' + _httpsPort )
Logger.debug('_httpPort: ' + _httpPort )


if (cluster.isMaster) {
  console.log('ppid : ' + process.pid )

  let numReqs = 0;

  // Count requests
  function messageHandler(msg) {
    if (msg.cmd && msg.cmd === 'notifyRequest') {
      numReqs += 1;
    }
  }

  // Start workers and listen for messages containing notifyRequest
  for (let i = 0; i < _procCnt; i++) {
    cluster.fork();
  }

  for (const id in cluster.workers) {
    cluster.workers[id].on('message', messageHandler);
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
    cluster.fork();
  });

} else {
  console.log('pid : ' + process.pid )
  Logger.debug('=======================================')
  Logger.debug('pid : ' + process.pid )

  var {
    CryptoUtils
  } = require('loom-js')

  // 웹서버 설정
  var app = express();
  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true
  }));

  // allowed ip address
  var ips = ['::ffff:127.0.0.1', '127.0.0.1', '::1'];
  app.use(ipfilter(ips, {mode: 'allow'}));
  app.use(function(err, req, res, _next) {
      var userIp = req.connection.remoteAddress
      Logger.debug('userIp: ' + userIp )
      //console.log('Error handler', err);
      res.send('Access Denied');                     // page view 'Access Denied'
      Logger.debug('  error.message : ' +   err.message  )

      if(err instanceof IpDeniedError){
        res.status(401).end();
      }else{
        res.status(err.status || 500).end();
      }
      // res.render('error', {
      //   message: 'You shall not pass',
      //   error: err
      // });
  });

  var hour = 3600000; // session timeout, 1hour(1000*60*60)
  app.use(session({
   secret: '//*--usemysession--*//',
   resave: false,
   saveUninitialized: true,
  // cookie:{ expires : new Date(Date.now() + hour)},
   cookie:{ maxAge : hour },
   store: new sessionStore( { "path" : _sessionHome })
  }));

  async function initEnv() {
    /* init Ethereum elements */
    Logger.debug('init Home path...')
    await Ether.setHomeDir( homePath )
    await Ether.setLogger( LoggerEther )
    await Dapp.setHomeDir( homePath )
    await Dapp.setLogger(LoggerDapp)
  }

  async function initTools(address, password) {
    /* init Ethereum elements */
    Logger.debug('init ethereum tools...')
    var EtherTools = await Ether.createAsync(address, password)
    Logger.debug('init complete')

    /* init Dappchain elements */
    Logger.debug('init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    Logger.debug('init complete')
    return {
      EtherTools,
      DappTools
    }
  }

  async function initLTools(address, password) {
    /* init Ethereum elements */
    Logger.debug('init ethereum light tools...')
    var EtherTools = await EtherL.createAsync(address, password)
    Logger.debug('init complete')

    /* init Dappchain elements */
    Logger.debug('init dapp light tools...')
    var DappTools = await DappL.createAsync(EtherTools.getDappPrivateKey())
    Logger.debug('init complete')
    return {
      EtherTools,
      DappTools
    }
  }

  const roles = ['P', 'CP', 'SP', 'D']
  var Tools = null
  //------------------------------------------------------------ account apis -----------------------------------------------------------//
  app.get('/', async function(req, res){
      req.session;
  });

  app.post('/account/generate', async function (req, res) {
    try {
      Logger.debug('/account/generate req: ' + JSON.stringify(req.body))
      const password = req.body.password
      const address = await Ether.generateAccount(password)
      var ToolsForMapping = await initTools(address[1], password)
      var EtherTools = ToolsForMapping.EtherTools
      var DappTools = ToolsForMapping.DappTools
      const mappingResult = await DappTools.SignAsync(EtherTools.getWallet())
      res.json({
        resultCode: 0,
        state: 'new',
        accountId: mappingResult.ethAddress.toLowerCase(),
        dappAddress: mappingResult.dappAddress.toLowerCase()
      })
      Logger.debug('/account/generate : succeed' )
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error.message)
    }
  })

  app.post('/account/import', async function (req, res) {
    try {
      Logger.debug('/account/import req: ' + JSON.stringify(req.body))
      const privateKey = req.body.privateKey
      const password = req.body.password

      var _privateKey = "";
      if( privateKey.substr(0, 2).toLowerCase() != "0x") {
        _privateKey = "0x" + privateKey.toLowerCase();
      }else{
        _privateKey = privateKey.toLowerCase();
      }

      const address = await Ether.importAccount(_privateKey, password)
      var ToolsForMapping = await initTools(address[1], password)
      var EtherTools = ToolsForMapping.EtherTools
      var DappTools = ToolsForMapping.DappTools

      const state = address[0] ? "new" : "exists"
      const mappingResult = await DappTools.SignAsync(EtherTools.getWallet())
      res.json({
        resultCode: 0,
        state,
        accountId: mappingResult.ethAddress.toLowerCase(),
        dappAddress: mappingResult.dappAddress.toLowerCase()
      })
      Logger.debug('/account/import : succeed' )
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error.message)
    }
  })

  app.post('/account/export', async function (req, res) {
    try {
      Logger.debug('/account/export req: ' + JSON.stringify(req.body))
      var address = ""
      if( req.body.accountId.substr(0, 2).toLowerCase() == "0x") {
        address = req.body.accountId.substr(2, req.body.accountId.length).toLowerCase();
      }else{
        address = req.body.accountId.toLowerCase();
      }

      const password = req.body.password
      const privateKey = await Ether.exportAccount(address, password)
      res.json({
        resultCode: 0,
        privateKey
      })
      Logger.debug('/account/export : succeed' )
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error.message)
    }
  })

  app.post('/account/remove', async function (req, res) {
    try {
      Logger.debug('/account/remove req: ' + JSON.stringify(req.body))
      var address = ""
      if( req.body.deleteId.substr(0, 2).toLowerCase() == "0x") {
        address = req.body.deleteId.substr(2, req.body.deleteId.length).toLowerCase();
      }else{
        address = req.body.deleteId.toLowerCase();
      }

      const state = await Ether.removeAccount(address)
      res.json({
        resultCode: 0,
        state
      })
      Logger.debug('/account/remove : succeed' )
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error.message)
    }
  })

  app.post('/account/list', async function (req, res) {
    try {
      Logger.debug('/account/list req: ' + JSON.stringify(req.body))
      const fileList = await Ether.listAccount()
      let list = []
      for (var i = 0; i < fileList.length; i++) {
        list.push( '0x' + fileList[i].split('--')[2].toLowerCase())
      }
      res.json({
        resultCode: 0,
        list
      })
      Logger.debug('/account/list : succeed' )
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error.message)
    }
  })

  app.post('/account/login', async function (req, res) {
    try {
      Logger.debug('/account/login req: ' + JSON.stringify(req.body))
      var userIp = req.connection.remoteAddress
      // Logger.debug('userIp: ' + userIp )

      var address = ""
      if( req.body.accountId.substr(0, 2).toLowerCase() == "0x") {
        address = req.body.accountId.substr(2, req.body.accountId.length).toLowerCase();
      }else{
        address = req.body.accountId.toLowerCase();
      }
      const password = req.body.password

      Tools = await initTools(address, password)

      //generate session
      req.session.userId = address ;

      res.json({
        resultCode: 0,
        state: 'succeed'
      })

      Logger.debug('/account/login : succeed' )
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error.message)
    }
  })

  app.post('/account/logout', async function (req, res) {
    try {
      Logger.debug('/account/logout req: ' + JSON.stringify(req.body))
      Tools = null

      req.session.destroy() //  destory session
      res.clearCookie('sid') // 세션 쿠키 삭제

      res.json({
        resultCode: 0,
        state: 'succeed'
      })
      Logger.debug('/account/logout : succeed' )
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error.message)
    }
  })

  app.post('/account/balance', async function (req, res) {
    try {
      Logger.debug('/account/balance req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      const ethAddress = EtherTools.getWallet().getAddressString()
      const ethBalance = await EtherTools.GetBaLanceAsync(ethAddress)
      const dappBalance = await DappTools.GetBaLanceAsync()
      res.json({
        resultCode: 0,
        ethAddress,
        ethBalance,
        dappBalance
      })
      Logger.debug('/account/balance : succeed' )
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error.message)
    }
  })
  //-------------------------------------------------------------------------------------------------------------------------------------//

  //------------------------------------------------------------ gateway apis -----------------------------------------------------------//
  app.post('/send/ethereum', async function (req, res) {
    try {
      Logger.debug('/send/ethereum req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools

      const unit = req.body.unit
      const amount = req.body.amount
      var EthWeb3 = EtherTools.getWeb3()
      const ethAddress = EtherTools.getWallet().getAddressString()
      const balanceBefore = await EthWeb3.eth.getBalance(ethAddress)
      await EtherTools.Deposit2GatewayAsync(ethAddress, unit, amount)
      const balanceAfter = await EthWeb3.eth.getBalance(ethAddress)
      res.json({
        resultCode: 0,
        ethAddress,
        balanceBefore,
        balanceAfter
      })
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error.message)
    }
  })

  app.post('/send/loom', async function (req, res) {
    try {
      Logger.debug('/send/loom req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools
      const unit = req.body.unit
      const amount = req.body.amount

      /* send ether from dapp account to gateway */
      const balance = (await DappTools.GetBaLanceAsync()).toString()
      const sendAmount = Web3Util.toWei(amount, unit)
      if (balance < sendAmount) {
        console.log(JSON.stringify({resultMessage: 'insufficient balance'}))
        res.json({
          resultCode: 400,
          resultMessage: 'insufficient balance'
        })
        return
      }

      await DappTools.ApproveAsync(sendAmount)
      await DappTools.WithdrawEthAsync(sendAmount)
      res.json({
        resultCode: 0,
        sendAmount
      })
    } catch (error) {
      if (error.message.indexOf('pending') > -1) {
        res.json({
          resultCode: 500,
          resultMessage: 'pending already exists'
        })
      } else {
        res.json({
          resultCode: 500,
          resultMessage: error.message
        })
        Logger.error('error occured: ' + error)
      }
    }
  })

  app.post('/send/withdraw', async function (req, res) {
    try {
      Logger.debug('/send/withdraw req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      /* get ether from gateway to ethereum account */
      const Account = DappTools.GetAccount()
      const Data = await DappTools.WithdrawaLReceiptAsync(Account)

      let EtherBaLance = 0
      if (Data) {
        switch (Data.tokenKind) {
          case 0:
            EtherBaLance = +Data.value.toString(10)
            break
        }
      }

      const Owner = Data.tokenOwner.local.toString()
      const Signature = CryptoUtils.bytesToHexAddr(Data.oracleSignature)
      await EtherTools.WithdrawEthAsync(Owner, EtherBaLance, Signature)
      res.json({
        resultCode: 0,
        withdraw: EtherBaLance
      })
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })
  //-------------------------------------------------------------------------------------------------------------------------------------//

  //---------------------------------------------------------------- msp ----------------------------------------------------------------//
  app.post('/msp/appointManager', async function (req, res) {
    try {
      Logger.debug('/msp/appointManager req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      const target = req.body.target
      await DappTools.appointManager(target)
      res.json({
        resultCode: 0,
        result: 'succeed'
      })
      Logger.debug('/msp/appointManager : succeed' )
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error.message)
    }
  })

  app.post('/msp/authRequest', async function (req, res) {
    try {
      Logger.debug('/msp/authRequest req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      const role = req.body.role
      const roleIndex = roles.indexOf(role)
      if (roleIndex == -1) {
        res.json({
          resultCode: 100,
          resultMessage: 'invalid role. choose P|SP|D'
        })
        return
      }
      await DappTools.requestEnroll(2 ** roleIndex)
      res.json({
        resultCode: 0,
        result: 'succeed'
      })
      Logger.debug('/msp/authRequest : succeed' )
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error.message)
    }
  })

  app.post('/msp/getRequests', async function (req, res) {
    try {
      Logger.debug('/msp/getRequests req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      const list = await DappTools.getRequests()
      res.json({
        resultCode: 0,
        list
      })

      Logger.debug('/msp/getRequests : succeed' )
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message + "\nCheck your roles."
      })
      Logger.error('error occured: ' + error.message)
    }
  })

  app.post('/msp/approve', async function (req, res) {
    try {
      Logger.debug('/msp/approve: ' + JSON.stringify(req.body))
      const approvals = req.body.approvals
      Logger.debug("approvals: " + approvals )
      Logger.debug("approvals: " + JSON.parse(approvals) )

      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      await DappTools.approveRole(JSON.parse(approvals))
      res.json({
        resultCode: 0,
        result: 'succeed'
      })
      Logger.debug('/msp/approve : succeed' )
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error.message)
    }
  })

  app.post('/msp/verify', async function (req, res) {
    try {
      Logger.debug('/msp/verify req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      const role = req.body.role
      //const target = req.body.target
      var target = ""
      if( req.body.target.substr(0, 2).toLowerCase() == "0x") {
        target = req.body.target.substr(2, req.body.target.length).toLowerCase();
      }else{
        target = req.body.target.toLowerCase();
      }

      const roleIndex = roles.indexOf(role)
      if (roleIndex == -1) {
        res.json({
          resultCode: 100,
          resultMessage: 'invalid role. choose P|CP|SP|D'
        })
        return
      }
      const verify = await DappTools.verifyRole(target, 2 ** roleIndex)
      var result  = "false";
      if( verify == true ) {
        res.json({
          resultCode: 0,
          result : "succeed"
        })
      }else{
        res.json({
          resultCode: 400,
          resultMessage: " verify fail",
          result : "false"
        })
      }
      Logger.debug('/msp/verify : succeed' )
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error.message)
    }
  })

  app.post('/msp/test', async function (req, res) {
    try {
      Logger.debug('req: ' + JSON.stringify(req.body))
      var ContractOwner = '1ee77618b9e4f7651381e2ede71b0d389f27a5c6'
      var Packager = 'e8a524218524edc9af8a921aef70f0fa4fad7fb5'
      var Packager2 = 'e6b086ce68ab7bf68c712d820a38f33fb9f8d552'
      var ContentsPovider = '9bcecd9085fae8fa787ac3f3bd3c2f25a90e0610'
      var Distributor = 'c7cf04aa9a7a6d548e6d1dac8f7401f4a36ad32b'
      var ServiceProvider = 'eccc317d9cd4757b361ed355f66626b5f2fb6292'

      var OwnerTools = await initTools(ContractOwner, 'p@ssw0rd')
      var EtherTools = OwnerTools.EtherTools
      var DappTools = OwnerTools.DappTools

      if(!(await DappTools.verifyRole(ContractOwner, 16))) {
        await DappTools.appointManager(ContractOwner)
      }
      if(!(await DappTools.verifyRole(Packager, 1))) {
        let ReqTools = await initTools(Packager, 'p@ssw0rd')
        let ReqEtherTools = ReqTools.EtherTools
        let ReqDappTools = ReqTools.DappTools
        await ReqDappTools.requestEnroll(1)
        await DappTools.approveRole([true])
      }
      if(!(await DappTools.verifyRole(Packager2, 1))) {
        let ReqTools = await initTools(Packager2, 'p@ssw0rd')
        let ReqEtherTools = ReqTools.EtherTools
        let ReqDappTools = ReqTools.DappTools
        await ReqDappTools.requestEnroll(1)
        await DappTools.approveRole([true])
      }
      if(!(await DappTools.verifyRole(ContentsPovider, 2))) {
        let ReqTools = await initTools(ContentsPovider, 'p@ssw0rd')
        let ReqEtherTools = ReqTools.EtherTools
        let ReqDappTools = ReqTools.DappTools
        await ReqDappTools.requestEnroll(2)
        await DappTools.approveRole([true])
      }
      if(!(await DappTools.verifyRole(ServiceProvider, 4))) {
        let ReqTools = await initTools(ServiceProvider, 'p@ssw0rd')
        let ReqEtherTools = ReqTools.EtherTools
        let ReqDappTools = ReqTools.DappTools
        await ReqDappTools.requestEnroll(4)
        await DappTools.approveRole([true])
      }
      if(!(await DappTools.verifyRole(Distributor, 8))) {
        let ReqTools = await initTools(Distributor, 'p@ssw0rd')
        let ReqEtherTools = ReqTools.EtherTools
        let ReqDappTools = ReqTools.DappTools
        await ReqDappTools.requestEnroll(8)
        await DappTools.approveRole([true])
      }
      res.json({
        resultCode: 0,
        state: 'succeed'
      })
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })

  //-------------------------------------------------------------------------------------------------------------------------------------//

  //-------------------------------------------------------------- get cid --------------------------------------------------------------//
  function pad(n, width) {
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
  }

  app.post('/cid', async function (req, res) {
    try {
      Logger.debug('/cid req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

    //  const target = req.body.targetID
      var target = ""
      if( req.body.targetID.substr(0, 2).toLowerCase() == "0x") {
        target = req.body.targetID.substr(2, req.body.targetID.length).toLowerCase();
      }else{
        target = req.body.targetID.toLowerCase();
      }

      const cid = await DappTools.getCID(target)
      if(cid == -1) {
        res.json({
          resultCode: 400,
          resultMessage: 'target address is not mapped with dapp address'
        })
      } else {
        res.json({
          resultCode: 0,
          cid: "CID" + pad(cid, 13)
        })
      }
      Logger.debug('/cid : succeed' )
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })
  //-------------------------------------------------------------------------------------------------------------------------------------//

  //-------------------------------------------------------- invoke transaction ---------------------------------------------------------//
  app.post('/register/data', async function (req, res) {
    try {
      Logger.debug('register/data req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      let cid = ""
      if( req.body.cid.substr(0, 3) == "CID") {
        cid = Number( req.body.cid.substr(3, req.body.cid.length) );
      }else{
        cid = req.body.cid;
      }
      const ccid = req.body.ccid
      const version = req.body.version
      const fee = req.body.fee
      const file_hashes = req.body.fileHasheLists
      const chunks = req.body.chunkLists

      const info = req.body.info
      let targetDist = req.body.targetDist
      let targetUser = req.body.targetUser
      //사용권한 0:19세이상, 1:사용그룹제한, 2.추가정보 => max 5
      let UsageRestriction = req.body.UsageRestriction

      fileHashes = ''
      for (let i = 0; i < file_hashes.length; i++) {
        fileHashes += file_hashes[i]
      }
      //set distributor
      if(targetDist == null || targetDist=="" ) {
        targetDist = []
      }
      //set content buyer
      if(targetUser == null || targetUser=="" ) {
        targetUser = []
      }
      if(UsageRestriction == null || UsageRestriction=="" ) {
        UsageRestriction = []
      }
      Logger.debug('UsageRestriction : ' + JSON.stringify(UsageRestriction))
      const dataId = await DappTools.registerData(cid, ccid, version, fee, fileHashes, chunks, info, targetDist, targetUser, UsageRestriction)
      res.json({
        resultCode: 0,
        dataId
      })

      Logger.debug('/register/data : succeed' )
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })

  app.post('/register/product', async function (req, res) {
    try {
      Logger.debug('/register/product req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      const ccid = req.body.ccid
      const version = req.body.version
      const price = req.body.price
      const productId = await DappTools.registerProduct(ccid, version, price)
      res.json({
        resultCode: 0,
        productId
      })
      Logger.debug('/register/product : succeed' )
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })

  app.post('/register/buy', async function (req, res) {
    try {
      Logger.debug('/register/buy req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      const productId = req.body.productId
      const purchaseId = await DappTools.buyProduct(productId)
      res.json({
        resultCode: 0,
        purchaseId
      })

      Logger.debug('/register/buy : succeed' )
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })

  //------------------------------------------------
  //  app.post('/register/channelOpen', async function (req, res)  함수용
  function IsJsonString(str) {
    try {
      var json = JSON.parse(str);
      return (typeof json === 'object');
    } catch (e) {
      return false;
    }
  }

  async function isArriveVerifier( url , chkVal ) {
    try {
      const response = await axios({
          method: 'post',
          url: url + '/preReq',
          data: {
            'from_id' : 'check id',
            'retVal' : chkVal
          }
      })

      if( response.status == 200 )
      {
        if( response.data.resultCode == 0 ) {
          Logger.debug("isArriveVerifier send ok"  )
          return true
        }else{
          Logger.error("isArriveVerifier error =" + response.data.result )
        }
      }else {
        Logger.error("response.status error =" + response.status )
      }
    } catch (e) {
      Logger.error("isArriveVerifier.status catch error =" + e )
      return false
    }
    return false
  }


  async function httpMultiPart( url , formData  ) {
    try {
      Logger.debug("httpMultiPart formData : " + JSON.stringify(formData))
      const response = await axios({
          method: 'post',
          url: url + '/channelOpen',
          data: formData,
          // headers: {'Content-Type': 'multipart/form-data'}
          headers : formData.getHeaders()
      })
      Logger.debug("httpMultiPart res: " + JSON.stringify(response.data))
      if( response.status == 200 )
      {
        if( response.data.code == 0 ) {
          Logger.debug("httpMultiPart send ok"  )
          return true
        }else{
          Logger.error("httpMultiPart error =" + response.data.result )
        }
      }else{
        Logger.error("httpMultiPart error status=" + response.status + ", err=" + response.statusText )
      }

      //   if( IsJsonString(res.data) == true ) {
      //     var reqObj = JSON.parse(res.data)
      //     if( reqObj.result != 0) {
      //       Logger.error("http error =" + reqObj.desc )
      //       return false
      //     }else{
      //       Logger.debug("data reg ok"  )
      //       return true
      //     }
      // }
    } catch (e) {
      Logger.error("http error =" + e )
      return false
    }
    return false
  }

  function countRange( numString ) {
    if( numString == null || numString =="" || numString == "undefined") {
      return 0
    }
    let arrayInfo = numString.split("-")
    if( arrayInfo.length == 1 ) {
      return 1
    }else{
        return ( parseFloat(arrayInfo[1]) - parseFloat(arrayInfo[0]) + 1 )
    }
  }
  async function countRangeString ( numString ) {
    if( numString == null || numString =="" || numString == "undefined") {
      return 0
    }
    let totCount = 0
    let arrayInfo = numString.split(",")
    for( let i=0 ; i < arrayInfo.length ; i++ ) {
      totCount += countRange( arrayInfo[i] )
    }
    return totCount
  }

  async function countChunks( chunkFile ) {
    let chunkarray = fs.readFileSync(chunkFile).toString().split("\r\n")
    let chunkIn = 1
    let totChunkNo = 0
    for(chunkIn=1 ; chunkIn< chunkarray.length ; chunkIn++) {
      Logger.debug('countChunks: ' + chunkarray[chunkIn])
        let chunkDataArray = chunkarray[chunkIn].split( "\t")
        if(chunkDataArray.length < 2 ) {
          continue
        }
        totChunkNo += await countRangeString( chunkDataArray[1] )
    }
    return totChunkNo
  }

  app.post('/register/channelOpen2', async function (req, res) {
    try {
      Logger.debug('req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      const tokenId = req.body.purchaseId
      const key = req.body.publicKey
      const downChunk = req.body.downChunkList
      const channelId = await DappTools.channelOpen(tokenId, key)
      const envInfo = await DappTools.getConfigData()
      const channelOpenPeriod = envInfo[2]
      res.json({
        resultCode: 0,
        channelId,
        channelOpenPeriod,
      })
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })

  app.post('/register/channelOpen', async function (req, res) {
    try {
      Logger.debug('/register/channelOpen req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      const tokenId = req.body.purchaseId
      const key = req.body.publicKey
      const downChunk = req.body.downChunkList

      // chunk file exist check
      var fexists = fs.existsSync(downChunk)
      if(fexists == false) {
        res.json({
          resultCode: 400,
          resultMessage: 'chunks file is not exist.'
        })
        return
      }

      let totchunkNo = await countChunks( downChunk )
      Logger.debug('total chunk Number:' + totchunkNo)

      // productid check
      try {
        const checkRst = await DappTools.chkTokenForChannelOpen(tokenId)
        if( checkRst == false ) {
          res.json({
            resultCode: 300,
            resultMessage: "The user did not purchase the purchaseId."
          })
          Logger.error('error occured: ' + error)
          return;
        }
      }catch (error) {
        res.json({
          resultCode: 300,
          resultMessage: "PurchaseId does not exist."
        })
        Logger.error('error occured: ' + error)
        return;
      }

      const envInfo = await DappTools.getConfigData()
      const verifier_url = envInfo[0] + ':' + envInfo[1]
      Logger.debug('verifier_url: ' + verifier_url)
      // verifier 동작여부 체크
      var ret = await isArriveVerifier( verifier_url , tokenId )
      if( ret == false ) {
        res.json({
          resultCode: 400,
          resultMessage: 'verifier not running'
        })
        return
      }

      Logger.debug('isArriveVerifier rst: ' + ret)

      // 이더리움 전송
      const channelId = await DappTools.channelOpen(tokenId, key, totchunkNo )
      const channelOpenPeriod = envInfo[2]

      // const channelId = "114426687811524658431366252321416110879201900634181467220584788965978924532621"
      // const channelOpenPeriod = "10"

      //verifier 전송
      var formData = new FormData();
      formData.append('channel_id', channelId);
      formData.append('purchase_id', tokenId);
      formData.append('s_pubkey', key);
      formData.append('open_period', channelOpenPeriod);
      formData.append('chunk_file', fs.createReadStream(downChunk));
      ret = httpMultiPart( verifier_url , formData )
      if( ret == false ) {
        res.json({
          resultCode: 400,
          resultMessage: 'verifier send error'
        })
        return
      }

      res.json({
        resultCode: 0,
        channelId,
        channelOpenPeriod,
      })
      Logger.debug('/register/channelOpen : succeed' )
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })

  app.post('/register/channelClose', async function (req, res) {
    try {
      Logger.debug('/register/channelClose req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools
      const channelId = req.body.channelId
  //    const senderLists = req.body.senderLists
      const ChunkCountLists = req.body.ChunkCountLists
      const merkleRoot = req.body.merkleRoot

      var senderLists = []
      for (i=0; i<req.body.senderLists.length ; i++) {
        if( req.body.senderLists[i].substr(0, 2).toLowerCase() == "0x") {
          senderLists[i] = req.body.senderLists[i].toLowerCase()
        }else{
          senderLists[i] = "0x" + req.body.senderLists[i].toLowerCase();
        }
      }
      Logger.debug('senderLists.length : ' + senderLists.length )
      Logger.debug('senderLists : ' + senderLists )
      Logger.debug('ChunkCountLists.length : ' + ChunkCountLists.length )
      Logger.debug('ChunkCountLists : ' + ChunkCountLists )
      Logger.debug('merkleRoot : ' + merkleRoot )

      await DappTools.channelOff( channelId, senderLists,ChunkCountLists, merkleRoot )
      res.json({
        resultCode: 0,
        resultMessage : "succeed"
      })
      Logger.debug('/register/channelClose : succeed' )
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })
  //-------------------------------------------------------------------------------------------------------------------------------------//

  //--------------------------------------------------------------- list ----------------------------------------------------------------//
  app.post('/list', async function (req, res) {
    try {
      Logger.debug('/list req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      const dataList = await DappTools.getList(0)
      const productList = await DappTools.getList(1)
      const tokenList = await DappTools.getList(2)
      var data = []
      for (var i = 0; i < dataList.length; i++) {
        var fileList = await DappTools.listFileWithDataId(dataList[i])
        data.push({
          id: dataList[i],
          files: fileList
        })
      }

      res.json({
        resultCode: 0,
        dataList : data,
        productList: productList,
        purchaseList: tokenList
      })
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })
  //-------------------------------------------------------------------------------------------------------------------------------------//

  //-------------------------------------------------------------- details --------------------------------------------------------------//
  app.post('/info/data', async function (req, res) {
    try {
      Logger.debug('/info/data req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      const dataId = req.body.dataId
      const ccid = req.body.ccid
      const version = req.body.version

      if(dataId == null && (ccid == null || version == null)) {
        res.json({
          code:500,
          resultMessage: 'data_id or ccid and version must be entered'
        })
      }

      if(dataId != null) {
          var dataInfo = await DappTools.getDataDetailsWithId(dataId)
          var UsageRestriction = await DappTools.getDataAtDetailsID(dataId)
      } else {
          var dataInfo = await DappTools.getDataDetailsWithCCIDNVersion(ccid, version)
          var UsageRestriction = await DappTools.getDataAtDetailsWithCCIDNVersion(ccid, version)
      }

      res.json({
        resultCode: 0,
        owner: dataInfo[0],
        cid:  "CID" + pad(dataInfo[1], 13),
        ccid: dataInfo[2],
        version: dataInfo[3],
        fee: dataInfo[4],
        validity: dataInfo[6],
        info: dataInfo[7],
        target_dist: dataInfo[8],
        target_user: dataInfo[9],
        getDataAtDetails: UsageRestriction,
      })
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })

  app.post('/info/file', async function (req, res) {
    try {
      Logger.debug('/info/file req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      const fileId = req.body.fileId
      const hash = req.body.hash

      if(fileId == null && hash == null) {
        res.json({
          resultCode: 500,
          resultMessage: 'file_id or hash must be entered'
        })
        return
      }

      if(fileId != null) {
        var fileInfo = await DappTools.getFileDetailsWithId(fileId)
      } else {
        var fileInfo = await DappTools.getFileDetailsWithHash(hash)
      }

      res.json({
        resultCode: 0,
        dataId: fileInfo[0],
        chunks: fileInfo[1],
      })
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })

  app.post('/info/product', async function (req, res) {
    try {
      Logger.debug('/info/product req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      const productId = req.body.productId
      const productInfo = await DappTools.getProductDetails(productId)
      const UsageRestriction = await DappTools.getDataAtDetailsID(productInfo[1])

      res.json({
        resultCode: 0,
        owner: productInfo[0],
        dataId: productInfo[1],
        price: productInfo[2],
        target_user: productInfo[3],
        validity: productInfo[4],
        getDataAtDetails: UsageRestriction
      })
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })

  app.post('/info/token', async function (req, res) {
    try {
      Logger.debug('/info/token req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      const tokenId = req.body.purchaseId
      var state = ['invalid', 'valid', 'in_progress']
      const detailsInfo = await DappTools.getTokenDetails(tokenId)
      const deposit = await DappTools.getDepositNCollateral(tokenId)
      res.json({
        resultCode: 0,
        info: {
          owner: detailsInfo[0],
          productId: detailsInfo[1],
          state: state[detailsInfo[2]]
        },
        deposit: {
          deposit: deposit[0],
          collateral: deposit[1],
          total: parseInt(deposit[0]) + parseInt(deposit[1])
        }
      })
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })

  app.post('/info/channel', async function (req, res) {
    try {
      Logger.debug('/info/channel req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      channelId = req.body.channelId
      var state = ['invalid', 'open', 'off', 'settle']
      const channelInfo = await DappTools.getChannelDetails(channelId)
      res.json({
        resultCode: 0,
        receiver: channelInfo[0],
        purchaseId: channelInfo[1],
        publicKey: channelInfo[2],
        deposit: channelInfo[3],
        collateral: channelInfo[4],
        timestamp: channelInfo[5],
        timeout: channelInfo[6],
        state: state[channelInfo[7]]
      })
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })

  app.post('/validation/channel', async function (req, res) {
    try {
      Logger.debug('/validation/channel req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      channelId = req.body.channelId
      var state = ['invalid', 'open', 'off', 'settled']
      const channelInfo = await DappTools.getChannelDetails(channelId)
      //(_C.receiver, _C.uTokenId, _C.key, _C.deposit, _C.collateral, _C.timestamp, _C.timeout, uint8(_C.state));
      const envInfo = await DappTools.getConfigData()

      if(channelInfo[7] == 1) {
        res.json({
          resultCode: 0,
          validity: state[channelInfo[7]],
          publicKey: channelInfo[2],
          receiptCollection: envInfo[3]
        })
      } else {
        res.json({
          resultCode: 400,
          validity: state[channelInfo[7]],
          publicKey: channelInfo[2]
        })
      }
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })

  app.post('/validation/token', async function (req, res) {
    try {
      Logger.debug('/validation/token req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      target = req.body.targetId
      //cid = req.body.cid
      var cid = ""
      if( req.body.cid.substr(0, 3) == "CID") {
        cid = Number( req.body.cid.substr(3, req.body.cid.length) );
      }else{
        cid = req.body.cid;
      }

      const validity = await DappTools.checkValidToken(target, cid)
      res.json({
        resultCode: 0,
        validity
      })
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })
  //-------------------------------------------------------------------------------------------------------------------------------------//

  //-------------------------------------------------------------- revoke ---------------------------------------------------------------//
  app.post('/revoke/user', async function (req, res) {
    try {
      Logger.debug('/revoke/user req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      const target = req.body.targetId
      const role = req.body.role
      const deleteDatas = req.body.delete_all_datas
      const deleteProducts = req.body.delete_all_products
      const roleIndex = roles.indexOf(role)
      if (roleIndex == -1) {
        res.json({
          resultCode: 100,
          resultMessage: 'invalid role. choose P|CP|SP|D'
        })
        return
      }
      await DappTools.revokeUser(target, 2 ** roleIndex, deleteDatas, deleteProducts)
      res.json({
        resultCode: 0,
        state: 'succeed'
      })
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })

  app.post('/revoke/data', async function (req, res) {
    try {
      Logger.debug('/revoke/data req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      dataId = req.body.dataId
      deleteAll = req.body.delete_all_products
      await DappTools.revokeData(dataId, deleteAll)
      res.json({
        resultCode: 0,
        state: 'succeed'
      })
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })

  app.post('/revoke/product', async function (req, res) {
    try {
      Logger.debug('/revoke/product req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      const productId = req.body.productId
      await DappTools.revokeProduct(productId)
      res.json({
        resultCode: 0,
        state: 'succeed'
      })
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })

  //-------------------------------------------------------------------------------------------------------------------------------------//

  //------------------------------------------------------------- sign apis -------------------------------------------------------------//
  app.post('/dsa/signTest', async function (req, res) {
    try {
      Logger.debug('req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }

      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

       var testFlag = 2
       if( testFlag == 1) {
          var msg = req.body.inData
          Logger.debug('req: 1 ' )
          const sign = await DappTools.signReceipt_d(msg)
          Logger.debug('req: 2 :'  + sign)
        //  const signData = JSON.parse( sign )
          Logger.debug('msg: ' + msg )
          Logger.debug('sign: ' + sign.sign )
          Logger.debug('pubkey: ' + sign.pubKey )

          console.time("time");
          for( var i=0 ; i <100 ; i++ ){
              var signVrf = await DappTools.verifyReceipt_d(msg,sign.sign, sign.pubKey)
          //    Logger.debug('verify rst: ' + signVrf )
          //    signVrf = await DappTools.verifyReceipt_d( msg + "1",sign.sign, sign.pubKey)
          //    Logger.debug('verify rst: ' + signVrf )
            }
          console.timeEnd("time");
        }
        if( testFlag == 2 ) {
          const pubKey = "29senRYgG6QeHulW9tZ6IR+BWVrhfWzPxEmfc6wut+g="
        //   const signMsg = "Emce7yVuSTMhb9WimAuwk5qZdAaEpPfUQhwdewx2et8ZImRqevt5AuaAFLv4hCVTSQvTSh2PEumJR/AotOFhCHsiRnJvbSI6IjFlZTc3NjE4YjllNGY3NjUxMzgxZTJlZGU3MWIwZDM4OWYyN2E1YzYiLCJUbyI6IjFlZTc3NjE4YjllNGY3NjUxMzgxZTJlZGU3MWIwZDM4OWYyN2E1YzYiLCJGaWxlIjoiUW1hM0RLbjNlZUhrMW1zaHJUZ2VVY3d1RlJyd0REclVlMTdtaERmdnNXaThnMiIsIkNodW5rcyI6IjYifQ=="
          const signMsg = "cwx6boEV6aOZw4VhPs5fr2MemcJnqFVLsFo6Mf6Q03ClsAk9PuZkcG471jQ3I8o+DuPPdrJ2BmvbInCSIwX9CnsiRnJvbSI6IjFlZTc3NjE4YjllNGY3NjUxMzgxZTJlZGU3MWIwZDM4OWYyN2E1YzYiLCJUbyI6ImVjY2MzMTdkOWNkNDc1N2IzNjFlZDM1NWY2NjYyNmI1ZjJmYjYyOTIiLCJGaWxlIjoiUW1hM0RLbjNlZUhrMW1zaHJUZ2VVY3d1RlJyd0REclVlMTdtaERmdnNXaThnMiIsIkNodW5rcyI6IjEtMTIifQ=="
          const msgData = await DappTools.verifyReceipt(signMsg, pubKey)
          Logger.debug('rst: ' + JSON.stringify(msgData) )
          // const msgData = await DappTools.verifyReceipt(msgData, pubKey)
          // Logger.debug('rst: ' + msgData)
          // var signVrf = await DappTools.verifyReceipt_d(signdata, signMsg, pubKey)
          // Logger.debug('signVrf: ' + signVrf)
        }
        if( testFlag == 3 ) {
          const signdata = '{"From":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","To":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","File":"Qma3DKn3eeHk1mshrTgeUcwuFRrwDDrUe17mhDfvsWi8g2","Chunks":"6"}​'
          const signData2 = await DappTools.getSignVal(signdata)
          Logger.debug('rst: ' + signData2)
        }

        res.json({
          resultCode: 0,
          signature: ""
        })


    } catch (error) {
      res.json({
        resultCode: 0,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })

  app.post('/dsa/sign', async function (req, res) {
    try {
      Logger.debug('/dsa/sign req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      const msg = req.body.inData
      const sign = await DappTools.signReceipt(msg)
      res.json({
        resultCode: 0,
        signature: sign
      })
    } catch (error) {
      res.json({
        resultCode: 0,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })

  app.post('/dsa/verify2', async function (req, res) {
    try {
     Logger.debug('/dsa/verify2 req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools


      const signJson = JSON.parse(req.body.signature )
      const msg = await DappTools.verifyReceipt(signJson.sign, signJson.pubKey)
      if (msg == null) {
        res.json({
          resultCode: 0,
          verify: false
        })
      } else {
        res.json({
          resultCode: 0,
          verify: true,
          msg
        })
      }
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })

  app.post('/dsa/verify', async function (req, res) {
    try {
      Logger.debug('/dsa/verify req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      const sign = req.body.signature
      const pubKey = req.body.publicKey
      const msg = await DappTools.verifyReceipt(sign, pubKey)
      if (msg == null) {
        res.json({
          resultCode: 0,
          verify: false
        })
      } else {
        res.json({
          resultCode: 0,
          verify: true,
          msg
        })
      }
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })
  //-------------------------------------------------------------------------------------------------------------------------------------//
  //-------------------------------------------------------------------------------------------------------------------------------------//

  app.post('/config/setconfig', async function (req, res) {
    try {
      Logger.debug('/config/setconfig req: ' + JSON.stringify(req.body))
    //  Logger.debug('req: ' + req.body)
      //verifierUrl, verifierPort, channelOpenPeriod, receiptCollection
      //string inUrl, uint inPort, uint inPeriod, uint inCol
      const verifierUrl = req.body.verifierUrl
      const verifierPort = req.body.verifierPort
      const channelOpenPeriod = req.body.channelOpenPeriod
      const receiptCollection = req.body.receiptCollection
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      const chunkPrice = req.body.chunkPrice
      const depositRatio = req.body.depositRatio
      const timeoutMili = req.body.timeoutMili

      if( chunkPrice == 0 ){
        chunkPrice = 1
      }
      if( depositRatio == 0 ){
        depositRatio = 10
      }
      if( timeoutMili == 0 ){
        timeoutMili = 10000
      }

      await DappTools.setConfigData(verifierUrl, verifierPort, channelOpenPeriod, receiptCollection, chunkPrice, depositRatio, timeoutMili)
      res.json({
        resultCode: 0,
        result : "succeed"
      })
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })

  app.post('/config/getconfig', async function (req, res) {
    try {
      Logger.debug('req: ' + JSON.stringify(req.body))
      //verifierUrl, verifierPort, channelOpenPeriod, receiptCollection
      //string inUrl, uint inPort, uint inPeriod, uint inCol

      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools
      const envInfo = await DappTools.getConfigData()
      Logger.debug('res: ' +JSON.stringify(envInfo)  )
      res.json({
        resultCode: 0,
        verifierUrl: envInfo[0],
        verifierPort: envInfo[1],
        channelOpenPeriod: envInfo[2],
        receiptCollection: envInfo[3]
      })
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })
  //-------------------------------------------------------------------------------------------------------------------------------------//

  //---------------------------------------------------------------- test ---------------------------------------------------------------//
  var url = require('url');
  app.get('/mediablockchain/content/register', async function (req, res) {
    try {
      Logger.debug('req: ' + JSON.stringify(req.body))
      var reqUrlString = req.url;
      var urlObject = url.parse(reqUrlString, true, false);
        Logger.debug(reqUrlString)
    Logger.debug(urlObject)
      res.json({
        result: 0,
        desc: 'Success'
      })
    } catch (error) {
      res.json({
        result: 500,
        desc: "fail"
      })
      Logger.error('error occured: ' + error)
    }
  })

  app.post('/send-to-verifier', async function (req, res) {
    try {
      Logger.debug('req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      const channelId = req.body.channelId
      const receipt = req.body.receipt
      const result = await DappTools.sendAggregatedReceipt(channelId, receipt)
      Logger.debug(result)
      res.json( result )
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })

  app.post('/send-to-verifier_test', async function (req, res) {
    try {
      Logger.debug('req: ' + JSON.stringify(req.body))
      if(Tools == null) {
        res.json({
          resultCode: 300,
          resultMessage: 'not logined'
        })
        return
      }
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools

      const channelId = "56521886046519942189098245080765454567131531301826814923885813238855738784308"

      var signdata = []
      signdata[0] = '{"From":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","To":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","File":"QmVwXox6Yciz7yZRkKW8R7noFNn29A7CvWfWc2BjJDYfasdf1","Chunks":"1"}'
      signdata[1] = '{"From":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","To":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","File":"QmVwXox6Yciz7yZRkKW8R7noFNn29A7CvWfWc2BjJDYfasdf2","Chunks":"2,3"}'
      signdata[2] = '{"From":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","To":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","File":"QmVwXox6Yciz7yZRkKW8R7noFNn29A7CvWfWc2BjJDYfasdf2","Chunks":"2,3,5"}'
      signdata[3] = '{"From":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","To":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","File":"QmVwXox6Yciz7yZRkKW8R7noFNn29A7CvWfWc2BjJDYfasdf2","Chunks":"7"}'
      signdata[4] = '{"From":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","To":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","File":"QmVwXox6Yciz7yZRkKW8R7noFNn29A7CvWfWc2BjJDYfasdf2","Chunks":"2,3,5,7,9"}'
      signdata[5] = '{"From":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","To":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","File":"QmVwXox6Yciz7yZRkKW8R7noFNn29A7CvWfWc2BjJDYfasdf3","Chunks":"10,12,30,45,22,45"}'
      signdata[6] = '{"From":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","To":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","File":"QmVwXox6Yciz7yZRkKW8R7noFNn29A7CvWfWc2BjJDYfasdf3","Chunks":"10-20"}'
      signdata[7] = '{"From":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","To":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","File":"QmVwXox6Yciz7yZRkKW8R7noFNn29A7CvWfWc2BjJDYfasdf3","Chunks":"10-20, 31-40, 102-200"}'
      signdata[8] = '{"From":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","To":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","File":"QmVwXox6Yciz7yZRkKW8R7noFNn29A7CvWfWc2BjJDYfasdf3","Chunks":"10-20, 22-30, 41"}'
      signdata[9] = '{"From":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","To":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","File":"QmVwXox6Yciz7yZRkKW8R7noFNn29A7CvWfWc2BjJDYfasdf3","Chunks":"10-40, 42-100, 102-200"}'
      signdata[10] = '{"From":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","To":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","File":"QmVwXox6Yciz7yZRkKW8R7noFNn29A7CvWfWc2BjJDYfasdf4","Chunks":"8,101"}'
      signdata[11] = '{"From":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","To":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","File":"QmVwXox6Yciz7yZRkKW8R7noFNn29A7CvWfWc2BjJDYfasdf5","Chunks":"4,6"}'
      signdata[12] = '{"From":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","To":"1ee77618b9e4f7651381e2ede71b0d389f27a5c6","File":"QmVwXox6Yciz7yZRkKW8R7noFNn29A7CvWfWc2BjJDYfasdf5","Chunks":"201-300"}'


      for( i=0; i<signdata.length ; i++) {
        const s = await DappTools.signReceipt( signdata[i] )
        Logger.debug('rst: ' + s.sign )
        const result = await DappTools.sendAggregatedReceipt(channelId, s.sign )
        console.log(result)
      }
      res.json({
        resultCode: 0,
        resultMessage: "Succeed"
      })
    } catch (error) {
      res.json({
        resultCode: 500,
        resultMessage: error.message
      })
      Logger.error('error occured: ' + error)
    }
  })



  async function executeTest(address, password) {
    try {
      var Tools = await initTools(address, password)
      var EtherTools = Tools.EtherTools
      var DappTools = Tools.DappTools
      await DappTools.executeTest()
    } catch (error) {
      console.log(JSON.stringify({resultMessage: error.message}))
      Logger.error('error occured: ' + error)
    }
  }

  async function addRequest() {
    try {
      var Tools = []
      var EtherTools = []
      var DappTools = []
      var Wallet = []
      const CO = '1ee77618b9e4f7651381e2ede71b0d389f27a5c6'
      const IS = 'e8a524218524edc9af8a921aef70f0fa4fad7fb5'

      Tools.push(await initTools(CO, 'p@ssw0rd'))
      Tools.push(await initTools(IS, 'p@ssw0rd'))
      EtherTools.push(Tools[0].EtherTools)
      EtherTools.push(Tools[1].EtherTools)
      DappTools.push(Tools[0].DappTools)
      DappTools.push(Tools[1].DappTools)
      Wallet.push(EtherTools[0].getWallet())
      Wallet.push(EtherTools[1].getWallet())

      Logger.debug("address[0]: " + Wallet[0].getAddressString())
      Logger.debug("address[1]: " + Wallet[1].getAddressString())

      var Issuer = await DappTools[0].enrollIssuer(Wallet[1].getAddressString())
      Logger.debug("Issuer: " + Issuer)

      var AddressKey = await DappTools[0].getAddressKey(DappTools[0].GetAddress())
      Logger.debug("AddressKey: " + AddressKey.toString('hex'))

      const Data = {
        age: 18
      }
      var DataHash = await DappTools[0].getDataHash(AddressKey, Data)
      Logger.debug("DataHash: " + DataHash.toString('hex'))

      var ReqKey = await DappTools[1].requestAdd(AddressKey, DataHash, Wallet[1].getPrivateKey())
      Logger.debug("request key: " + ReqKey)

      await DappTools[0].approveAdd(DataHash, ReqKey, true)

      var Signature = await DappTools[0].getSignature(AddressKey, DataHash)
      Logger.debug("signatrue info: " + JSON.stringify({
        signature: Signature.signature,
        signer: Signature.signer
      }))
    } catch (error) {
      console.log(JSON.stringify({resultMessage: error.message}))
      Logger.error('error occured: ' + error)
    }
  }

  async function manageClientSession() {

    if( Tools != null ) {
      let envInfo = await Tools.DappTools.getConfigData()
      Logger.debug('<=======================>')
      Logger.debug('testConntect to onchain:' + envInfo[0] + ':' + envInfo[1])
    }
  }
  //=초기화 프로그램 ===============================


  initEnv()
  //==============================
  app.listen(_httpPort, () => {
    Logger.debug('http server listening on port ' + _httpPort);
  });

  //==============================
  var OptionS = {
    method : 'POST',
    key: Env.server_key,
    cert: Env.server_crt,
    ca: Env.rootca_crt
  }

  var HttpsServ = https.createServer(OptionS, app).listen(_httpsPort, function(){
    Logger.debug("https server listening on port " + _httpsPort)
  })
  HttpsServ.timeout = 240000

  setInterval(manageClientSession, 60*60*1000)
}
//-------------------------------------------------------------------------------------------------------------------------------------//
