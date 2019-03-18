var Crypto = require('crypto')
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

var privateSchema = require('./modeLS/private_keys.js')

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

async function insert_private_key(address, key, enc){
  var New_item = new privateSchema({addr: address, key: key, enc: enc, timestamp: new Date() })
  await New_item.save(function(err, item){
      if(err){
          logger.error('insert_private_key, error: ' + err)
      }
      else{
          logger.debug('insert_private_key, item: ' + item)
      }
  })
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
    string: RandomStr,
    token: Token
  })
})

App.post('/query_prv_key', async function(req, res){
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
      //PrivateLock.writeLock(function(release){
      await CLusterLock.acquireWrite('PrivateLock', async function(){
        const FoundKey = await privateSchema.findOne({addr: TgtAccount.toLowerCase()})
        if(!FoundKey){
          var PrivateKey = loom.CryptoUtils.generatePrivateKey()
          var PrivateKeyB64 = loom.CryptoUtils.Uint8ArrayToB64(PrivateKey)
          await insert_private_key(TgtAccount.toLowerCase(), PrivateKeyB64, false)
          logger.debug("saved private key: " + PrivateKeyB64)
          res.json({
            status: 'create',
            prv_key: PrivateKeyB64,
            enc: false
          })
        }
        else{
          logger.debug("found item: " + JSON.stringify(FoundKey))
          res.json({
            status: 'return',
            prv_key: FoundKey.key,
            enc: FoundKey.enc
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
  mongoose.connect('mongodb://127.0.0.1/waLLet', {useNewUrlParser: true})
  var DB = mongoose.connection
  DB.on('error', function(err){
    logger.error("start_server, error: " + err)
  })
  DB.once('open', function(){
    logger.info(">>> connected to mongod server")
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
  var Secret = {
    secret: Crypto.randomBytes(256).toString('hex')
  }
  logger.debug('master secret: ' + JSON.stringify(Secret))

	for(let i = 0; i < numCPU; i++){
		var Worker = cLuster.fork()
    Worker.send(Secret)
	}

	cLuster.on('exit', function(worker, code, signal){
		logger.info('worker ' + worker.process.pid + ' died')
	})
}
else{
  process.on( 'message', function(msg){
    if (msg.secret){
      var Secret = msg.secret
      logger.debug( 'secret: ' + Secret)
      App.set('secret', msg.secret)
      App.use(expressJWT({
      	secret: Secret
      }).unless({
      	path: ['/query_token']
      }))
    }
	})

	logger.info( 'worker pid: %d', process.pid )
  start_server()
}
