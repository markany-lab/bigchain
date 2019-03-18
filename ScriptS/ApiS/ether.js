const jsonGateway = require('./Gateway.json')
var Web3 = require('web3')
var Web3UtiL = require('web3-utils')
var EthUtiL = require('ethereumjs-util')
var EthWaLLet = require('ethereumjs-wallet')
var EthTx = require('ethereumjs-tx')
var FiLeSystem = require('fs')
var Https = require('https')
var Axios = require('axios')
var Rinkeby = require('./rinkeby.json')

var Env = require('../../.env.json')
const HotWaLLetAddr = Env.key_server_ip + ':' + Env.key_server_port
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
  if(FiLeSystem.existsSync(path + "key_manager.json")) {
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

async function getDappPrivateKey(web3, wallet, method) {
  var Token
  var Sign
  await Agent.post('/query_token', {})
  .then(await function (res) {
    var TgtStr = res.data.string
    if (method == 'web3') {
      web3.eth.accounts.wallet.add(wallet.getPrivateKeyString())
      return web3.eth.sign(TgtStr, wallet.getAddressString(), async function (error, result) {
        Sign = result
      })
    } else if (method == 'ether-util') {
      var msg = Buffer.from(TgtStr, 'utf8')
      const prefix = new Buffer("\x19Ethereum Signed Message:\n")
      const prefixedMsg = Buffer.concat([prefix, new Buffer(String(msg.length)), msg])
      const sign = EthUtiL.ecsign(EthUtiL.keccak256(prefixedMsg), wallet.getPrivateKey())
      Sign = EthUtiL.bufferToHex(sign.r) + EthUtiL.bufferToHex(sign.s).substr(2) + EthUtiL.bufferToHex(sign.v).substr(2)
      Token = res.data.token
    }
  })
  .catch(err=>console.log('error: ' + JSON.stringify(err)))

  const ConfirmData = {
    addr: wallet.getAddressString(),
    sign: Sign
  }

  await Agent.post('/query_private_key_plain', {
    confirm_data: ConfirmData
  }, {
    headers: { Authorization: "Bearer " + Token }
  })
  .then(await function (res) {
    var QueryStatus = res.data.status
    if (QueryStatus == 'verify failed') {
    } else {
      if (QueryStatus == 'create') {
      }
      if (QueryStatus == 'return') {
      }
      PrivateKey = res.data.prv_key
    }
  })
  .catch(err=>console.log('error: ' + JSON.stringify(err)))
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

  static async createAsync(index, password) {
    var web3 = new Web3(new Web3.providers.HttpProvider('https://rinkeby.infura.io/' + Rinkeby.api_token))
    console.log("# web3 version: " + web3.version)

    const wallet = loadKeyStore(index, './keystore/', password)
    const dappPrvKey = await getDappPrivateKey(web3, wallet, 'ether-util')
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
      chunk_list:[0,1,2,3,4,5,6,7,8,9]
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
    .then((res)=>{
      console.log(JSON.stringify(res.data))

      // console.log(JSON.stringify(res))
    })
  }
}
