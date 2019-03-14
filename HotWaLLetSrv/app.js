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
var _RandomStr

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
  var keys = read_key_path(key_path)
  logger.debug("account = " + account)
  if (keys == -1) {
    return -1
  } else {
    var key = JSON.parse(keys)[account]
    logger.debug("key = " + key)
    if (typeof key === "undefined") {
      return -1
    } else {
      return key
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
    var targetAccount = req.body.confirmData.ethAddress
    var targetSign = req.body.confirmData.sign
    var RandomStr = req.random_str

    var msg = Buffer.from(RandomStr, 'utf8')
    const prefix = new Buffer("\x19Ethereum Signed Message:\n")
    const prefixedMsg = Buffer.concat([prefix, new Buffer(String(msg.length)), msg])
    const prefixedMsgInput = ethUtiL.keccak256(prefixedMsg)

    const {
      v,
      r,
      s
    } = ethUtiL.fromRpcSig(targetSign)

    const pubKeyBuf = ethUtiL.ecrecover(prefixedMsgInput, v, r, s)
    const addrBuf = ethUtiL.pubToAddress(pubKeyBuf)
    const addr = ethUtiL.bufferToHex(addrBuf)

    if (targetAccount.toLowerCase() == addr) {
      var savedKey = find_key(_PrvateKey_Path, targetAccount.toLowerCase())

      if (savedKey == -1) {
        var prv_key = loom.CryptoUtils.generatePrivateKey()
        var pub_key = loom.CryptoUtils.publicKeyFromPrivateKey(prv_key)
        var address = loom.LocalAddress.fromPublicKey(pub_key).toString()
        prv_key = loom.CryptoUtils.Uint8ArrayToB64(prv_key)
        pub_key = loom.CryptoUtils.Uint8ArrayToB64(ethUtiL.toBuffer(loom.CryptoUtils.bytesToHexAddr(pub_key)))
        save_key(_PrvateKey_Path, targetAccount.toLowerCase(), prv_key)
        save_key(_PublicKey_Path, address, pub_key)
        logger.debug("prv_key: " + prv_key)
        res.json({
          status: 'create',
          prv_key: prv_key
        })
      } else {
        logger.debug("savedKey: " + savedKey)
        res.json({
          status: 'return',
          prv_key: savedKey
        })
      }
    } else {
      logger.debug(targetAccount.toLowerCase() + " / " + addr)
      res.json({
        status: 'verify failed'
      })
    }
  } catch (err) {
    logger.error('query_registered error: ' + err)
    res.json({
      status: 'error occured'
    })
  }
})

App.post('/query_pub_key', (req, res) => {
  logger.debug('>>> /query_pub_key')
  try {
    var savedKey = find_key(_PublicKey_Path, req.body.receiver)

    if (savedKey == -1) {
      res.json({code: "-1", error: "public key with input address does not exist"})
    } else {
      res.json({status: 'return', pub_key: savedKey})
    }
  } catch (err) {
    logger.error('query_registered error: ' + err)
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
