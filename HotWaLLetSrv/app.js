const fiLeSystem = require('fs')
const bodyParser = require('body-parser')
const randomString = require('randomstring')

const ethUtiL = require('ethereumjs-util')
const loom = require('loom-js')

const express = require('express')
const http = require('http')
const https = require('https')
var cors = require('cors')
const App = express()

App.use(cors())
App.use(bodyParser.json())
App.use(bodyParser.urlencoded({
  extended: true
}))

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
    console.log(err)
  }
}

function find_key(key_path, account) {
  var keys = read_key_path(key_path)
  console.log("account = " + account)
  if (keys == -1) {
    return -1
  } else {
    var key = JSON.parse(keys)[account]
    console.log("key = " + key)
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

App.post('/query_string', (req, res) => {
  console.log('/query_string')
  _RandomStr = randomString.generate({
    length: 256,
    charset: 'alphabetic'
  })
  res.json({
    status: 'rs',
    string: _RandomStr
  })
})

App.post('/query_prv_key', (req, res) => {
  console.log('/query_prv_key() called')
  console.log(JSON.stringify(req.body))
  try {
    var targetAccount = req.body.confirmData.ethAddress
    var targetSign = req.body.confirmData.sign

    var msg = Buffer.from(_RandomStr, 'utf8')
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
        pub_key = loom.CryptoUtils.Uint8ArrayToB64(Util.toBuffer(loom.CryptoUtils.bytesToHexAddr(pub_key)))
        save_key(_PrvateKey_Path, targetAccount.toLowerCase(), prv_key)
        save_key(_PublicKey_Path, address, pub_key)
        console.log("prv_key: " + prv_key)
        res.json({
          status: 'create',
          prv_key: prv_key
        })
      } else {
        console.log("savedKey: " + savedKey)
        res.json({
          status: 'return',
          prv_key: savedKey
        })
      }
    } else {
      console.log(targetAccount.toLowerCase() + " / " + addr)
      res.json({
        status: 'verify failed'
      })
    }
  } catch (err) {
    console.log('query_registered error: ' + err)
    res.json({
      status: 'error occured'
    })
  }
})

App.post('/query_pub_key', (req, res) => {
  console.log('/query_pub_key() called')
  try {
    var savedKey = find_key(_PublicKey_Path, req.body.receiver)

    if (savedKey == -1) {
      res.json({code: "-1", error: "public key with input address does not exist"})
    } else {
      res.json({status: 'return', pub_key: savedKey})
    }
  } catch (err) {
    console.log('query_registered error: ' + err)
    res.json({
      status: 'error occured'
    })
  }
})

const HttpPort = 3000
var Server = http.createServer(App).listen(HttpPort, function() {
  console.log("Http server listening on port " + HttpPort);
})

const HttpsPort = 3001
var OptionS = {
  key: fiLeSystem.readFileSync('./key.pem'),
  cert: fiLeSystem.readFileSync('./cert.pem')
}

var Server = https.createServer(OptionS, App).listen(HttpsPort, function() {
  console.log("Https server listening on port " + HttpsPort);
})
