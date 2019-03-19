const jsonGateway = require('./Gateway.json')
var crypto = require('crypto')
var Web3 = require('web3')
var Web3UtiL = require('web3-utils')
var EthUtiL = require('ethereumjs-util')
var EthWaLLet = require('ethereumjs-wallet')
var EthTx = require('ethereumjs-tx')
var FiLeSystem = require('fs')
var Https = require('https')
var Axios = require('axios')

var {
  CryptoUtils
} = require('loom-js/dist')

var Env = require('../../.env.json')
const HotWaLLetAddr = Env.hot_wallet_url + ':' + Env.hot_wallet_port
var Agent = Axios.create({
  baseURL: HotWaLLetAddr,
  httpsAgent: new Https.Agent({
    rejectUnauthorized: false,
  })
})

function saveKeyStore(path, wallet, password) {
  const filename = wallet.getV3Filename(Date.now())
  const v3 = wallet.toV3(password)
  FiLeSystem.writeFileSync(path + filename, JSON.stringify(v3), 'utf8')
  var address = wallet.getAddressString()
  var obj = {
    address,
    filename
  }
  if (FiLeSystem.existsSync(path + "key_manager.json")) {
    var key_manager = JSON.parse(FiLeSystem.readFileSync(path + "key_manager.json"))
    key_manager.push(obj)
    FiLeSystem.writeFileSync(path + 'key_manager.json', JSON.stringify(key_manager), 'utf8')
    return key_manager.length - 1
  } else {
    FiLeSystem.writeFileSync(path + 'key_manager.json', '[' + JSON.stringify(obj) + ']', 'utf8')
    return 0
  }
}

function loadKeyStore(index, path, password) {
  const key_manager = JSON.parse(FiLeSystem.readFileSync(path + 'key_manager.json', 'utf8'))
  const filename = key_manager[index].filename
  const v3 = JSON.parse(FiLeSystem.readFileSync(path + filename, 'utf8'))
  return EthWaLLet.fromV3(v3, password)
}

async function getDappPrivateKey(wallet) {
  var Token
  var Sign
  var PrivateKey = ''
  var Enc = false

  var EncKey = wallet.getPrivateKeyString()
  EncKey = EncKey.replace('0x', '')
  EncKey = new Buffer(EncKey, 'hex')

  await Agent.post('/query_get_token', {})
    .then(await
      function(res) {
        var MsgStr = res.data.string
        var msg = Buffer.from(MsgStr, 'utf8')
        const prefix = new Buffer("\x19Ethereum Signed Message:\n")
        const prefixedMsg = Buffer.concat([prefix, new Buffer(String(msg.length)), msg])
        const PreSign = EthUtiL.ecsign(EthUtiL.keccak256(prefixedMsg), wallet.getPrivateKey())
        Sign = EthUtiL.bufferToHex(PreSign.r) + EthUtiL.bufferToHex(PreSign.s).substr(2) + EthUtiL.bufferToHex(PreSign.v).substr(2)
        Token = res.data.token
      })
    .catch(err => console.log('error: ' + JSON.stringify(err)))

  const ConfirmData = {
    addr: wallet.getAddressString(),
    sign: Sign
  }

  var CipheredKey = CryptoUtils.generatePrivateKey()
  var Cipher = crypto.createCipheriv('aes-256-ecb', EncKey, '')
  Cipher.setAutoPadding(false)
  var CipheredKey = Cipher.update(CipheredKey).toString('base64')
  CipheredKey += Cipher.final('base64')
  console.log('suggested key: ' + CipheredKey)

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
    .catch(err => console.log('error: ' + JSON.stringify(err)))
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
            console.log("status: " + res.data.status)
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
    const wallet = EthWaLLet.generate()
    var index = saveKeyStore('./keystore/', wallet, password)
    console.log("index: " + index)
    console.log("new account: " + wallet.getAddressString())
    return index
  }

  static async importAccount(privateKey, password) {
    const wallet = EthWaLLet.fromPrivateKey(EthUtiL.toBuffer(privateKey))
    return saveKeyStore('./keystore/', wallet, password)
  }

  static async exportAccount(index, password) {
    const wallet = loadKeyStore(index, './keystore/', password)
    return wallet.getPrivateKeyString()
  }

  static async removeAccount(index) {
    if (!FiLeSystem.existsSync('./keystore/key_manager.json')) {
      console.error("no account exists")
      return
    }
    const keyManager = JSON.parse(FiLeSystem.readFileSync('./keystore/key_manager.json'))
    const filename = keyManager[index].filename
    keyManager.splice(index, index + 1)
    FiLeSystem.writeFileSync('./keystore/key_manager.json', JSON.stringify(keyManager), 'utf8')
    await FiLeSystem.unlink('./keystore/' + filename, function(error) {
      if (error) {
        console.log("error occured: " + error)
      }
    })
  }

  static async listAccount() {
    if (!FiLeSystem.existsSync('./keystore/key_manager.json')) {
      console.error("no account exists")
      return
    }
    return JSON.parse(FiLeSystem.readFileSync('./keystore/key_manager.json'))

  }

  static async createAsync(index, password) {
    var Provider = new Web3.providers.WebsocketProvider('wss://rinkeby.infura.io/ws')
    var web3 = new Web3(Provider)
    console.log("# web3 version: " + web3.version)

    const wallet = loadKeyStore(index, './keystore/', password)
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
    console.log("# EstimateGas: " + EstimateGas)

    rawTx.gas = EstimateGas
    var tx = new EthTx(rawTx)
    tx.sign(this._Wallet.getPrivateKey())
    var serializedTx = tx.serialize()
    EstimateGas = await this._Web3.eth.estimateGas(rawTx)

    const transaction = await this._Web3.eth.sendSignedTransaction("0x" + serializedTx.toString('hex'))
    console.log("transaction: " + JSON.stringify(transaction))
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
    console.log("# EstimateGas: " + EstimateGas)

    rawTx = {
      nonce: '0x' + (await this._Web3.eth.getTransactionCount(from)).toString(16),
      from: from,
      to: this._GatewayCon.options.address,
      gasPrice: (await this._Web3.eth.getGasPrice()),
      gas: EstimateGas,
      value: Web3UtiL.toHex(Web3UtiL.toWei(amount, unit)),
    }

    EstimateGas = await this._Web3.eth.estimateGas(rawTx)
    var tx = new EthTx(rawTx)
    tx.sign(this._Wallet.getPrivateKey())
    var serializedTx = tx.serialize()

    const transaction = await this._Web3.eth.sendSignedTransaction("0x" + serializedTx.toString('hex'))
    console.log("transaction: " + JSON.stringify(transaction))
  }

  async GetBaLanceAsync(address) {
    return await this._Web3.eth.getBalance(address)
  }

  async sendAggregatedReceipt() {
    let msg = {
      channel_id: "0",
      receiver: this._Wallet.getAddressString(),
      sender: '0xb73C9506cb7f4139A4D6Ac81DF1e5b6756Fab7A2',
      count: 10,
      chunk_list: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    }
    const Msg = Buffer.from(JSON.stringify(msg))
    const ECSign = EthUtiL.ecsign(EthUtiL.keccak256(Msg), this._Wallet.getPrivateKey())
    const Sign = EthUtiL.bufferToHex(ECSign.r) + EthUtiL.bufferToHex(ECSign.s).substr(2) + EthUtiL.bufferToHex(ECSign.v).substr(2)

    await Axios({
        method: 'post',
        url: 'http://127.0.0.1:3003/get_receipt',
        data: {
          msg,
          Sign
        }
      })
      .then((res) => {
        console.log(JSON.stringify(res.data))

        // console.log(JSON.stringify(res))
      })
  }
}
