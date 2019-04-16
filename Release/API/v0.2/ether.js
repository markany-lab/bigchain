var Env = require('./.env.json')
const jsonGateway = require('./jsons/Gateway.json')
var crypto = require('crypto')
var Web3 = require('web3')
var Web3UtiL = require('web3-utils')
var ethUtiL = require('ethereumjs-util')
var ethWaLLet = require('ethereumjs-wallet')
var ethTx = require('ethereumjs-tx')
var Https = require('https')
var Axios = require('axios')
var Log4JS = require('log4js')
var Logger = Log4JS.getLogger('Ether')
Logger.level = Env.log_level

var FiLeSystem = require('fs')
const {
  unlinkSync,
  readdirSync,
  existsSync,
  readFileSync,
  writeFileSync
} = require('fs')

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

async function saveKeyStore(path, wallet, password) {
  var FiLeS = getKeyFiles(path)
  var RedundancyCheck = FiLeS.findIndex(function(el) {
    return el.indexOf(wallet.getAddressString().substring(2)) != -1
  })

  if (RedundancyCheck != -1) {
    Logger.debug("account already exists")
    return 0
  }

  var FiLeName = wallet.getV3Filename(Date.now())
  const V3 = wallet.toV3(password)
  writeFileSync(path + FiLeName, JSON.stringify(V3), 'utf8')
  return 1
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

function getEthContract(web3) {
  return new web3.eth.Contract(
    jsonGateway.abi,
    jsonGateway.networks[Object.keys(jsonGateway.networks)[0]].address
  )
}

module.exports = class EtherInit_ {
  static async generateAccount(password) {
    const wallet = ethWaLLet.generate()
    return [await saveKeyStore('./keystore/', wallet, password), wallet.getAddressString().substring(2)]
  }

  static async importAccount(privateKey, password) {
    const wallet = ethWaLLet.fromPrivateKey(ethUtiL.toBuffer(privateKey))
    return [await saveKeyStore('./keystore/', wallet, password), wallet.getAddressString().substring(2)]
  }

  static async exportAccount(address, password) {
    const wallet = await loadKeyStore(address, './keystore/', password)
    return wallet.getPrivateKeyString()
  }

  static async removeAccount(address) {
    var FiLeS = getKeyFiles('./keystore/')
    var KeyFiLe = FiLeS.find(function(el) {
      return el.indexOf(address) != -1
    })
    Logger.debug('remove account: ' + KeyFiLe)
    if(typeof KeyFiLe == 'undefined') {
      Logger.error('no such address: ' + address)
      return 'no such address key file'
    }
    unlinkSync('./keystore/' + KeyFiLe)
    return 'remove succeed'
  }

  static async listAccount() {
    return getKeyFiles('./keystore/')
  }

  static async createAsync(address, password) {
    var Provider = new Web3.providers.WebsocketProvider('wss://rinkeby.infura.io/ws')
    var web3 = new Web3(Provider)
    Logger.debug("web3 version: " + web3.version)

    const wallet = await loadKeyStore(address, './keystore/', password)
    const dappPrvKey = await getDappPrivateKey(wallet)
    const con = getEthContract(web3)

    return new EtherInit_(web3, wallet, dappPrvKey, con)
  }

  constructor(web3, wallet, dapp_private_key, gateway_contract) {
    this._Web3 = web3
    this._Wallet = wallet
    this._DappPrivateKey = dapp_private_key
    this._GatewayCon = gateway_contract
  }

  getWeb3() {
    return this._Web3
  }

  getWallet() {
    return this._Wallet
  }

  getDappPrivateKey() {
    return this._DappPrivateKey
  }

  getGatewayCon() {
    return this._GatewayCon
  }

  async WithdrawEthAsync(from, amount, sig) {
    const inputAmount = Web3UtiL.toHex(amount)
    const query = await this._GatewayCon.methods.withdrawETH(inputAmount, sig)
    const data = query.encodeABI()

    const nonce = '0x' + (await this._Web3.eth.getTransactionCount(from)).toString(16)
    const to = jsonGateway.networks[Object.keys(jsonGateway.networks)[0]].address

    var rawTx = {
      nonce,
      gasPrice: '0x09184e72a000',
      gasLimit: '0x27100',
      from: from,
      to,
      data,
      chainId: 4
    }

    let EstimateGas = await this._Web3.eth.estimateGas(rawTx)
    Logger.debug("EstimateGas: " + EstimateGas)

    rawTx.gas = EstimateGas
    var tx = new ethTx(rawTx)
    tx.sign(this._Wallet.getPrivateKey())
    var serializedTx = tx.serialize()
    EstimateGas = await this._Web3.eth.estimateGas(rawTx)

    const transaction = await this._Web3.eth.sendSignedTransaction("0x" + serializedTx.toString('hex'))
    Logger.debug("transaction: " + JSON.stringify(transaction))
  }

  async Deposit2GatewayAsync(from, unit, amount) {
    var rawTx = {
      nonce: '0x' + (await this._Web3.eth.getTransactionCount(from)).toString(16),
      from: from,
      to: this._GatewayCon.options.address,
      gasPrice: (await this._Web3.eth.getGasPrice()),
      value: Web3UtiL.toHex(Web3UtiL.toWei(amount, unit)),
    }

    let EstimateGas = await this._Web3.eth.estimateGas(rawTx)
    Logger.debug("EstimateGas: " + EstimateGas)

    rawTx = {
      nonce: '0x' + (await this._Web3.eth.getTransactionCount(from)).toString(16),
      from: from,
      to: this._GatewayCon.options.address,
      gasPrice: (await this._Web3.eth.getGasPrice()),
      gas: EstimateGas,
      value: Web3UtiL.toHex(Web3UtiL.toWei(amount, unit)),
    }

    EstimateGas = await this._Web3.eth.estimateGas(rawTx)
    var tx = new ethTx(rawTx)
    tx.sign(this._Wallet.getPrivateKey())
    var serializedTx = tx.serialize()

    const transaction = await this._Web3.eth.sendSignedTransaction("0x" + serializedTx.toString('hex'))
    Logger.debug("transaction: " + JSON.stringify(transaction))
  }

  async GetBaLanceAsync(address) {
    return await this._Web3.eth.getBalance(address)
  }
}
