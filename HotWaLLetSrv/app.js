var fiLeSystem = require('fs')
//var lockFile = require('lockfile')
var log4js = require('log4js')
var logger = log4js.getLogger('HotWalletServer')
logger.level = 'debug'

var randomString = require('randomstring')
var utiL = require('util')

var ethUtiL = require('ethereumjs-util')
var loom = require('loom-js')

var mongoose = require('mongoose')

var express = require('express')
var session = require('express-session')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var http = require('http')
var https = require('https')

var expressJWT = require('express-jwt')
var jwt = require('jsonwebtoken')
var cors = require('cors')
var bearerToken = require('express-bearer-token')
//var rwLock = require('rwlock')
var cLuster = require('cluster')
var cLusterLock = require("cluster-readwrite-lock");
var numCPU = require( 'os' ).cpus().length

var privateSchema = require('./modeLS/private.js')

//워커 스케쥴을 OS에 맡긴다
//cLuster.schedulingPolicy = cLuster.SCHED_NONE

//워커 스케쥴을 Round Robin 방식으로 한다
cLuster.schedulingPolicy = cLuster.SCHED_RR

//var PrivateLock = new rwLock()
//var PublicLock = new rwLock()
var CLusterLock = new cLusterLock(cLuster)
const App = express()
App.options('*', cors())
App.use(cors())

App.use(bodyParser.json())
App.use(bodyParser.urlencoded({
  extended: true
}))

App.set('secret', 'thisismysecret')
App.use(expressJWT({
	secret: 'thisismysecret'
}).unless({
	path: ['/query_token']
}));
App.use(bearerToken())

App.use(function(req, res, next){
	logger.debug('--->>> new request for %s',req.originalUrl)
	if(req.originalUrl.indexOf('/query_token') >= 0){
		return next()
	}

	var Token = req.token;
  logger.debug('token: ' + Token)
	jwt.verify(Token, App.get('secret'), function(err, decoded){
		if(err){
			res.send({
				success: false,
				message: 'Failed to authenticate token. Make sure to include the ' +
					'token returned from /query_token call in the authorization header ' +
					' as a Bearer token'
			})
			return
		}
    else{
			// add the decoded user name and org name to the request object
			// for the downstream code to use
			req.random_str = decoded.random_str
			logger.debug(utiL.format('Decoded from JWT token: random_str - %s', decoded.random_str))
			return next()
		}
	})
})

var _PrvateKey_Path = './priv_keys.json'

function read_key_path(key_path){
  try{
    return fiLeSystem.readFileSync(key_path, 'utf-8')
  }
  catch(err){
    logger.error('read_key_path, error: ' + err)
    return -1
  }
}

function write_key_path(key_path, obj){
  try{
    fiLeSystem.writeFileSync(key_path, JSON.stringify(obj), 'utf-8')
  }
  catch(err){
    logger.error('write_key_path, error: ' + err)
  }
}

function find_key(key_path, address){
  privateSchema.findOne({addr: address}, function(err, key){
      if(err){
        logger.debug('----------database failure')
      }
      else {
        logger.debug('----------key: ' + key + 'account: ' + address)
      }
  })

  var KeyS = read_key_path(key_path)
  //logger.debug("address: " + address)
  if(KeyS == -1){
    return -1
  }
  else{
    var Key = JSON.parse(KeyS)[address]
    //logger.debug("key: " + Key)
    if(typeof Key === 'undefined'){
      return -1
    }
    else{
      return Key
    }
  }
}

function save_key(key_path, address, key){
  var KeyS = read_key_path(key_path)
  if(KeyS == -1){
    var Obj = new Object()
    Obj[address] = key
    write_key_path(key_path, Obj)
  }
  else{
    var ObjS = JSON.parse(KeyS)
    ObjS[address] = key
    write_key_path(key_path, ObjS)
  }
}

App.post('/query_token', (req, res)=>{
  logger.debug('>>> /query_token')

  //
  var RandomStr = randomString.generate({length: 256, charset: 'alphabetic'});
  var Token = jwt.sign({
  		exp: Math.floor(Date.now() / 1000) + 1000,
  		random_str: RandomStr
  	}, App.get('secret'));

  res.json({
    status: 'rs',
    string: RandomStr,
    token: Token
  })
})

App.post('/query_prv_key', async function(req, res) {
  logger.debug('>>> /query_prv_key')

  //
  logger.debug('body: ' + JSON.stringify(req.body))
  try {
    var TgtAccount = req.body.confirmData.ethAddress
    var TgtSign = req.body.confirmData.sign
    var RandomStr = req.random_str

    var Msg = Buffer.from(RandomStr, 'utf8')
    const Prefix = new Buffer("\x19Ethereum Signed Message:\n")
    const PrefixedMsg = Buffer.concat([Prefix, new Buffer(String(Msg.length)), Msg])
    const PrefixedMsgHash = ethUtiL.keccak256(PrefixedMsg)

    const {
      v,
      r,
      s
    } = ethUtiL.fromRpcSig(TgtSign)

    const EthPubLicKey = ethUtiL.ecrecover(PrefixedMsgHash, v, r, s)
    const EthAddrBuf = ethUtiL.pubToAddress(EthPubLicKey)
    const EthAddr = ethUtiL.bufferToHex(EthAddrBuf)

    if(TgtAccount.toLowerCase() == EthAddr){
      //
      var PrivateKeyB64
      //PrivateLock.writeLock(function(release){
      await CLusterLock.acquireWrite('PrivateLock', ()=>{
        PrivateKeyB64 = find_key(_PrvateKey_Path, TgtAccount.toLowerCase())
        if(PrivateKeyB64 == -1){
          var PrivateKey = loom.CryptoUtils.generatePrivateKey()
          PrivateKeyB64 = loom.CryptoUtils.Uint8ArrayToB64(PrivateKey)
          save_key(_PrvateKey_Path, TgtAccount.toLowerCase(), PrivateKeyB64)

          logger.debug("saved private key: " + PrivateKeyB64)
          res.json({
            status: 'create',
            prv_key: PrivateKeyB64
          })
        }
        else{
          logger.debug("found private key: " + PrivateKeyB64)
          res.json({
            status: 'return',
            prv_key: PrivateKeyB64
          })
        }
        //release()
      }).then((res)=>{
        if(typeof res !== 'undefined'){
          logger.debug('private write lock, result: ' + res)
        }
      }).catch((err)=>{
        logger.error('private write lock, error: ' + err)
      })
    }
    else{
      res.json({
        status: 'verify failed'
      })
    }
  } catch(err){
    logger.error('/query_prv_key, error: ' + err)
    res.json({
      status: 'error occured'
    })
  }
})

async function start_server(){
  mongoose.connect('mongodb://127.0.0.1/waLLet2', {useNewUrlParser: true})
  var DB = mongoose.connection
  DB.on('error', function(err){
    logger.error("start_server, err: " + err)
  })
  DB.once('open', function(){
    logger.info(">>> connected to mongod server")
  })


  await privateSchema.find({addr: '0xd53000e41163a892b4d83b19a2fec184677a1272'}, function(err, key){
      if(err){
        logger.debug('----------database failure')
      }
      else {
        logger.debug('----------key: ' + key)
      }
  })


  /*var newPrivate = new privateSchema({addr:'aaaaaaaaa', key:'bbbbbbbbbbbb', enc:false})
  newPrivate.save(function(error, data){
      if(error){
          console.log(error);
      }else{
          console.log('----------Saved! ' + data)
      }
  })*/

  await privateSchema.find(function(err, keyS){
      if(err){
        logger.debug('----------database failure')
      }
      else {
        logger.debug('----------keys: ' +keyS +  JSON.stringify(keyS))
      }
  })
  /*const HttpPort = 3000
  var HttpSrv = http.createServer(App).listen(HttpPort, function(){
    logger.info("http server listening on port " + HttpPort);
  })
  HttpSrv.timeout = 240000*/

  const HttpsPort = 3001
  var OptionS = {
    key: fiLeSystem.readFileSync('./key.pem'),
    cert: fiLeSystem.readFileSync('./cert.pem')
  }

  var HttpsServ = https.createServer(OptionS, App).listen(HttpsPort, function(){
    logger.info("https server listening on port " + HttpsPort)
  })
  HttpsServ.timeout = 240000
}

numCPU = (numCPU < 4) ? numCPU * 2 : numCPU
logger.info("num of cpus: " + numCPU)
if(cLuster.isMaster){
	for(let i = 0; i < numCPU; i++){
		var Worker = cLuster.fork()
	}
	cLuster.on('exit', function(worker, code, signal){
		logger.info('worker ' + worker.process.pid + ' died')
	})
}
else{
	logger.info( 'worker pid: %d', process.pid )
  start_server()
}
