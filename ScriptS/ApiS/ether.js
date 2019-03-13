const jsonGateway = require('./Gateway.json')
var Web3 = require('web3')
var Web3Util = require('web3-utils')
var Util = require('ethereumjs-util')
var EtherWallet = require('ethereumjs-wallet')
var Tx = require('ethereumjs-tx')
var fs = require('fs')
var axios = require('axios')
var rinkeby = require('./rinkeby.json')
var env = require('../../.env.json')

const KeyServerUrl = env.key_server_ip + ':' + env.key_server_port
const QueryStrUrl = KeyServerUrl + '/query_string'
const QueryKeyUrl = KeyServerUrl + '/query_key'

function saveKeyStore(path, wallet, password) {
  const filename = wallet.getV3Filename(Date.now())
  const v3 = wallet.toV3(password)
  fs.writeFileSync(path + filename, JSON.stringify(v3), 'utf8')
}

function loadKeyStore(path, password) {
  const v3 = JSON.parse(fs.readFileSync(path, 'utf8'))
  return EtherWallet.fromV3(v3, password)
}

async function getDappPrivateKey(web3, wallet, method) {
  var Sign
  await axios({
    method: 'post',
    url: QueryStrUrl,
    data: {}
  })
    .then(await
      function (data) {
        var TgtStr = data.data.string;
        if (method == 'web3') {
          web3.eth.accounts.wallet.add(wallet.getPrivateKeyString())
          return web3.eth.sign(TgtStr, wallet.getAddressString(), async function (error, result) {
            Sign = result;
          });
        } else if (method == 'ether-util') {
          var msg = Buffer.from(TgtStr, 'utf8')
          const prefix = new Buffer("\x19Ethereum Signed Message:\n")
          const prefixedMsg = Buffer.concat([prefix, new Buffer(String(msg.length)), msg])
          const sign = Util.ecsign(Util.keccak256(prefixedMsg), wallet.getPrivateKey())
          Sign = Util.bufferToHex(sign.r) + Util.bufferToHex(sign.s).substr(2) + Util.bufferToHex(sign.v).substr(2)
        }
      })
    .catch(err => console.log(err))

  const ConfirmData = {
    ethAddress: wallet.getAddressString(),
    sign: Sign
  }

  await axios({
    method: 'post',
    url: QueryKeyUrl,
    data: {
      confirmData: ConfirmData
    }
  })
    .then(await
      function (data) {
        var QueryStatus = data.data.status;
        if (QueryStatus == 'verify failed') {
          // console.log("login failed: verify signature failed");
        } else {
          if (QueryStatus == 'create') {
            // console.log("login succeed: new key pair is generated");
          }
          if (QueryStatus == 'return') {
            // console.log("login succeed: key pair is returned");
          }
          // console.log("private key: " + data.data.prv_key);
          PrivateKey = data.data.prv_key;
        }
      })
    .catch(err => console.log(err))
  return PrivateKey;
}

function getEthContract(web3) {
  return new web3.eth.Contract(
    jsonGateway.abi,
    jsonGateway.networks[Object.keys(jsonGateway.networks)[0]].address
  )
}

module.exports = class EtherInit_ {
  static async createAsync() {
    var web3 = new Web3(new Web3.providers.HttpProvider('https://rinkeby.infura.io/' + rinkeby.api_token))
    console.log("# web3 version: " + web3.version)

    const wallet = EtherWallet.fromPrivateKey(Util.toBuffer(rinkeby.prv_key))
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
    const inputAmount = Web3Util.toHex(amount)
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
    var tx = new Tx(rawTx)
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
      value: Web3Util.toHex(Web3Util.toWei(amount, unit)),
    }

    let EstimateGas = await this._Web3.eth.estimateGas(rawTx)
    console.log("# EstimateGas: " + EstimateGas)

    rawTx = {
      nonce: '0x' + (await this._Web3.eth.getTransactionCount(from)).toString(16),
      from: from,
      to: this._GatewayCon.options.address,
      gasPrice: (await this._Web3.eth.getGasPrice()),
      gas: EstimateGas,
      value: Web3Util.toHex(Web3Util.toWei(amount, unit)),
    }

    EstimateGas = await this._Web3.eth.estimateGas(rawTx)
    var tx = new Tx(rawTx)
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
    const ECSign = Util.ecsign(Util.keccak256(Msg), this._Wallet.getPrivateKey())
    const Sign = Util.bufferToHex(ECSign.r) + Util.bufferToHex(ECSign.s).substr(2) + Util.bufferToHex(ECSign.v).substr(2)

    await axios({
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