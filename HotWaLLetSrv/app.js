var crypto = require('crypto')
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
	if(req.originalUrl.indexOf('/query_get_token') >= 0){
		return next()
	}

	var Token = req.token;
  logger.debug('token: ' + Token)
	jwt.verify(Token, App.get('secret'), function(err, decoded){
		if(err){
			res.send({
				success: false,
				message: 'Failed to authenticate token. Make sure to include the ' +
					'token returned from /query_get_token call in the authorization header ' +
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
  var New_item = new privateSchema({addr: address, key: key, enc: enc, timestamp: new Date()})
  await New_item.save(function(err, item){
      if(err){
          logger.error('insert_private_key, error: ' + err)
      }
      else{
          logger.debug('insert_private_key, item: ' + item)
      }
  })
}

App.post('/query_get_token', (req, res)=>{
  logger.debug('>>> /query_get_token')

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

App.post('/query_get_private_key', async function(req, res){
  logger.debug('>>> /query_get_private_key')

  //logger.debug('body: ' + JSON.stringify(req.body))
  try {
    var ConfirmAddr = req.body.confirm_data.addr
    var ConfirmSign = req.body.confirm_data.sign
    var SuggestedKeyB64 = req.body.suggested_key
    logger.debug('base64(key): ' + JSON.stringify(SuggestedKeyB64) + ', type: ' + typeof SuggestedKeyB64)
    var RandomStr = req.random_str

    //<-- 시뮬레이션...
    var _LoomKeyB64
    var _Enc
    try{
      var Key = loom.CryptoUtils.B64ToUint8Array(SuggestedKeyB64)
      if (Key.length != 64){
        throw('invalid key: ' + SuggestedKeyB64)
      }
      _LoomKeyB64 = SuggestedKeyB64
      _Enc = true
    }
    catch(err){
      logger.error('/query_get_private_key, error: ' + err)
      var GeneratedKey = loom.CryptoUtils.generatePrivateKey()
      _LoomKeyB64 = loom.CryptoUtils.Uint8ArrayToB64(GeneratedKey)
      _Enc = false

      /*logger.debug('++++++++ generated base64: ' + _LoomKeyB64)
      var EncKey = '0x7920ca01d3d1ac463dfd55b5ddfdcbb64ae31830f31be045ce2d51a305516a37'
      EncKey = EncKey.replace('0x', '')
      EncKey = new Buffer(EncKey, 'hex')
      var Cipher = crypto.createCipheriv('aes-256-ecb', EncKey, '')
      Cipher.setAutoPadding(false)
      var CipheredKey = Cipher.update(GeneratedKey).toString('base64')
      CipheredKey += Cipher.final('base64')
      logger.debug('++++++++ cyphered base64: ' + CipheredKey)

      var DecipheredKey = loom.CryptoUtils.B64ToUint8Array(CipheredKey)
      var Decipher = crypto.createDecipheriv("aes-256-ecb", EncKey, '')
      Decipher.setAutoPadding(false)
      var DecipheredKey = Decipher.update(DecipheredKey).toString('base64')
      DecipheredKey += Decipher.final('base64')
      logger.debug('++++++++ decyphered base64: ' + DecipheredKey)*/
    }

    logger.debug('!!!!!!!! _LoomKeyB64: ' + _LoomKeyB64)
    logger.debug('!!!!!!!! _Enc: ' + _Enc)
    //-->

    var Msg = Buffer.from(RandomStr, 'utf8')
    const Prefix = new Buffer("\x19Ethereum Signed Message:\n")
    const PrefixedMsg = Buffer.concat([Prefix, new Buffer(String(Msg.length)), Msg])
    const PrefixedMsgHash = ethUtiL.keccak256(PrefixedMsg)

    const {
      v,
      r,
      s
    } = ethUtiL.fromRpcSig(ConfirmSign)

    const EthPubLicKey = ethUtiL.ecrecover(PrefixedMsgHash, v, r, s)
    const EthAddrBuf = ethUtiL.pubToAddress(EthPubLicKey)
    const EthAddr = ethUtiL.bufferToHex(EthAddrBuf)
    const Addr = ConfirmAddr.toLowerCase()
    if(Addr == EthAddr){
      //PrivateLock.writeLock(function(release){
      await CLusterLock.acquireWrite('PrivateLock', async function(){
        const FoundKey = await privateSchema.findOne({addr: Addr})
        if(!FoundKey){
          var LoomKeyB64
          var Enc
          try{
            var Key = loom.CryptoUtils.B64ToUint8Array(SuggestedKeyB64)
            if (Key.length != 64){
              throw('invalid key: ' + SuggestedKeyB64)
            }
            LoomKeyB64 = SuggestedKeyB64
            Enc = true
          }
          catch(err){
            logger.error('/query_get_private_key, error: ' + err)
            var GeneratedKey = loom.CryptoUtils.generatePrivateKey()
            LoomKeyB64 = loom.CryptoUtils.Uint8ArrayToB64(GeneratedKey)
            Enc = false
          }

          await insert_private_key(Addr, LoomKeyB64, Enc)
          logger.debug("saved private key: " + LoomKeyB64)
          res.json({
            status: 'succeed',
            key: LoomKeyB64,
            enc: Enc
          })
        }
        else{
          await privateSchema.updateOne({addr: Addr}, {$set:{timestamp: new Date()}})
          logger.debug("found item: " + JSON.stringify(FoundKey))
          res.json({
            status: 'succeed',
            key: FoundKey.key,
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
        status: 'failed'
      })
    }
  } catch(err){
    logger.error('/query_get_private_key, error: ' + err)
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
    secret: crypto.randomBytes(256).toString('hex')
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
      	path: ['/query_get_token']
      }))
    }
	})

	logger.info( 'worker pid: %d', process.pid )
  start_server()
}
