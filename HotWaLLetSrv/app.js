var fiLeSystem = require('fs')
var log4js = require('log4js')
var logger = log4js.getLogger('HotWalletServer')
logger.level = 'debug'

var randomString = require('randomstring')
var utiL = require('util')

var ethUtiL = require('ethereumjs-util')
var loom = require('loom-js')

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

App.use(function(req, res, next) {
	logger.debug(' ------>>>>>> new request for %s',req.originalUrl);
	if (req.originalUrl.indexOf('/query_token') >= 0) {
		return next();
	}

	var Token = req.token;
  logger.debug('token: ' + Token )
	jwt.verify(Token, App.get('secret'), function(err, decoded) {
		if (err) {
			res.send({
				success: false,
				message: 'Failed to authenticate token. Make sure to include the ' +
					'token returned from /query_token call in the authorization header ' +
					' as a Bearer token'
			});
			return;
		} else {
			// add the decoded user name and org name to the request object
			// for the downstream code to use
			req.random_str = decoded.random_str;
			logger.debug(utiL.format('Decoded from JWT token: random_str - %s', decoded.random_str));
			return next();
		}
	});
});

var _PrvateKey_Path = './priv_keys.json'
var _PublicKey_Path = './pub_keys.json'

function read_key_path(key_path) {
  try {
    return fiLeSystem.readFileSync(key_path, 'utf-8')
  } catch (err) {
    return -1
  }
}

function write_key_path(key_path, obj) {
  try {
    fiLeSystem.writeFileSync(key_path, JSON.stringify(obj), 'utf-8')
  } catch (err) {
    logger.error(err)
  }
}

function find_key(key_path, account) {
  var KeyS = read_key_path(key_path)
  logger.debug("account = " + account)
  if (KeyS == -1) {
    return -1
  } else {
    var Key = JSON.parse(KeyS)[account]
    logger.debug("key: " + Key)
    if (typeof Key === "undefined") {
      return -1
    } else {
      return Key
    }
  }
}

function save_key(key_path, account, key) {
  var prev_keys = read_key_path(key_path)
  if (prev_keys == -1) {
    var obj = new Object()
    obj[account] = key
    write_key_path(key_path, obj)
  } else {
    var prev_keys_obj = JSON.parse(prev_keys)
    prev_keys_obj[account] = key
    write_key_path(key_path, prev_keys_obj)
  }
}

App.post('/query_token', (req, res) => {
  logger.debug('>>> /query_token')
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

App.post('/query_prv_key', (req, res) => {
  logger.debug('>>> /query_prv_key')

  //
  logger.debug(JSON.stringify(req.body))
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

    if (TgtAccount.toLowerCase() == EthAddr) {
      var LoomPrivateKey = find_key(_PrvateKey_Path, TgtAccount.toLowerCase())
      if (LoomPrivateKey == -1) {
        var PrivateKey = loom.CryptoUtils.generatePrivateKey()
        var PubLicKey = loom.CryptoUtils.publicKeyFromPrivateKey(PrivateKey)
        var Addr = loom.LocalAddress.fromPublicKey(PubLicKey).toString()
        PrivateKey = loom.CryptoUtils.Uint8ArrayToB64(PrivateKey)
        PubLicKey = loom.CryptoUtils.Uint8ArrayToB64(ethUtiL.toBuffer(loom.CryptoUtils.bytesToHexAddr(PubLicKey)))
        save_key(_PrvateKey_Path, TgtAccount.toLowerCase(), PrivateKey)
        save_key(_PublicKey_Path, Addr, PubLicKey)
        logger.debug("saved private key: " + PrivateKey)
        logger.debug("saved public key: " + PubLicKey)
        res.json({
          status: 'create',
          prv_key: PrivateKey
        })
      } else {
        // public key가 저장되어 있지 않다면 생성(기존 rinkeby어드레스 매핑 유지)
        var LoomPubLicKey = find_key(_PublicKey_Path, TgtAccount.toLowerCase())
        if (LoomPubLicKey == -1) {
          var PrivateKey = loom.CryptoUtils.B64ToUint8Array(LoomPrivateKey)
          var PubLicKey = loom.CryptoUtils.publicKeyFromPrivateKey(PrivateKey)
          var Addr = loom.LocalAddress.fromPublicKey(PubLicKey).toString()
          PubLicKey = loom.CryptoUtils.Uint8ArrayToB64(ethUtiL.toBuffer(loom.CryptoUtils.bytesToHexAddr(PubLicKey)))
          save_key(_PublicKey_Path, Addr, PubLicKey)
          logger.debug("saved public key: " + PubLicKey)
        }
        logger.debug("found private key: " + LoomPrivateKey)
        res.json({
          status: 'return',
          prv_key: LoomPrivateKey
        })
      }
    } else {
      logger.debug(TgtAccount.toLowerCase() + " / " + EthAddr)
      res.json({
        status: 'verify failed'
      })
    }
  } catch (err) {
    logger.error('error: ' + err)
    res.json({
      status: 'error occured'
    })
  }
})

App.post('/query_pub_key', (req, res) => {
  logger.debug('>>> /query_pub_key')
  try {
    var LoomPubLicKey = find_key(_PublicKey_Path, req.body.receiver)
    if (LoomPubLicKey == -1) {
      res.json({code: "-1", error: "public key with input address does not exist"})
    } else {
      res.json({status: 'return', pub_key: LoomPubLicKey})
    }
  } catch (err) {
    logger.error('error: ' + err)
    res.json({
      status: 'error occured'
    })
  }
})

const HttpPort = 3000
var Server = http.createServer(App).listen(HttpPort, function() {
  logger.info("Http server listening on port " + HttpPort);
})

const HttpsPort = 3001
var OptionS = {
  key: fiLeSystem.readFileSync('./key.pem'),
  cert: fiLeSystem.readFileSync('./cert.pem')
}

var Server = https.createServer(OptionS, App).listen(HttpsPort, function() {
  logger.info("Https server listening on port " + HttpsPort);
})
