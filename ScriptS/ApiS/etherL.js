var Env = require('../../.env.json')
var crypto = require('crypto')
var ethUtiL = require('ethereumjs-util')
var ethWaLLet = require('ethereumjs-wallet')
var Https = require('https')
var Axios = require('axios')
var Log4JS = require('log4js')
var Logger = Log4JS.getLogger('EtherL')
Logger.level = Env.log_level

var homePath= "";
function getHomeDir() {
  if( homePath == "" ) {
     homePath =  __dirname
  }
  return homePath;
}

var FiLeSystem = require('fs')
const {
  unlinkSync,
  readdirSync,
  existsSync,
  readFileSync,
  writeFileSync
} = require('fs')
//const { join } = require('path')

var {
  CryptoUtils
} = require('loom-js/dist')


const HotWaLLetAddr = Env.hot_wallet_url + ':' + Env.hot_wallet_port
var Agent = Axios.create({
  baseURL: HotWaLLetAddr,
  httpsAgent: new Https.Agent({
    rejectUnauthorized: false,
  })
})

function getKeyFiles(path) {
  var FiLeS = readdirSync(path)
  FiLeS = FiLeS.filter(el => !(el.indexOf('UTC')))
  FiLeS.sort()
  return FiLeS
}

async function loadKeyStore(address, path, password) {
  var FiLeS = getKeyFiles(path)
  if (FiLeS.length == 0) {
    throw ('error: can\'t not found any account in keystore: ' + path)
  }

  var KeyFiLe = FiLeS.find(function(el) {
    return el.indexOf(address) != -1
  })

  var V3 = JSON.parse(readFileSync(path + KeyFiLe, 'utf8'))
  ethWaLLet.fromV3(V3, password)
  return ethWaLLet.fromV3(V3, password)
}

async function getDappPrivateKey(wallet) {
  var Token
  var Sign
  var PrivateKey = ''
  var Enc = false

  var EncKey = wallet.getPrivateKey().toString('hex')
  //EncKey = EncKey.replace('0x', '')
  EncKey = new Buffer(EncKey, 'hex')

  await Agent.post('/query_get_token', {})
    .then(await
      function(res) {
        var MsgStr = res.data.string
        var msg = Buffer.from(MsgStr, 'utf8')
        const prefix = new Buffer("\x19Ethereum Signed Message:\n")
        const prefixedMsg = Buffer.concat([prefix, new Buffer(String(msg.length)), msg])
        const PreSign = ethUtiL.ecsign(ethUtiL.keccak256(prefixedMsg), wallet.getPrivateKey())
        Sign = ethUtiL.bufferToHex(PreSign.r) + ethUtiL.bufferToHex(PreSign.s).substr(2) + ethUtiL.bufferToHex(PreSign.v).substr(2)
        Token = res.data.token
      })
    .catch(err => Logger.error(err))

  const ConfirmData = {
    addr: wallet.getAddressString(),
    sign: Sign
  }

  var CipheredKey = CryptoUtils.generatePrivateKey()
  var Cipher = crypto.createCipheriv('aes-256-ecb', EncKey, '')
  Cipher.setAutoPadding(false)
  var CipheredKey = Cipher.update(CipheredKey).toString('base64')
  CipheredKey += Cipher.final('base64')

  await Agent.post('/query_get_private_key', {
      confirm_data: ConfirmData,
      suggested_key: CipheredKey
    }, {
      headers: {
        Authorization: "Bearer " + Token
      }
    })
    .then(await
      function(res) {
        var QueryStatus = res.data.status
        if (QueryStatus == 'succeed') {
          PrivateKey = res.data.key
          Enc = res.data.enc
        } else {}
      })
    .catch(err => Logger.error('>>> ' + err))
  if (Enc) {
    var DecipheredKey = CryptoUtils.B64ToUint8Array(PrivateKey)
    var Decipher = crypto.createDecipheriv("aes-256-ecb", EncKey, '')
    Decipher.setAutoPadding(false)
    var DecipheredKey = Decipher.update(DecipheredKey).toString('base64')
    DecipheredKey += Decipher.final('base64')
    PrivateKey = DecipheredKey
  } else {
    // 키가 암호화되어 있지 않다면 암오화 하여 업데이트
    var Cipher = crypto.createCipheriv('aes-256-ecb', EncKey, '')
    Cipher.setAutoPadding(false)
    CipheredKey = CryptoUtils.B64ToUint8Array(PrivateKey)
    if (CipheredKey.length == 64) {
      CipheredKey = Cipher.update(CipheredKey).toString('base64')
      CipheredKey += Cipher.final('base64')

      await Agent.post('/query_update_private_key', {
          confirm_data: ConfirmData,
          suggested_key: CipheredKey
        }, {
          headers: {
            Authorization: "Bearer " + Token
          }
        })
        .then(await
          function(res) {
            Logger.debug("status: " + res.data.status)
          })
    }
  }
  return PrivateKey
}

module.exports = class EtherInit_ {
  static async createAsync(address, password) {
    const wallet = await loadKeyStore(address, getHomeDir() + '/keystore/', password)
    const dappPrvKey = await getDappPrivateKey(wallet)
    return new EtherInit_(wallet, dappPrvKey)
  }

  constructor(wallet, dapp_private_key) {
    this._Wallet = wallet
    this._DappPrivateKey = dapp_private_key
  }

  getWallet() {
    return this._Wallet
  }

  getDappPrivateKey() {
    return this._DappPrivateKey
  }
  static async setHomeDir ( homedir ) {
   homePath = homedir
  }
  static async setLogger( log ) {
    Logger = log
 }
}
