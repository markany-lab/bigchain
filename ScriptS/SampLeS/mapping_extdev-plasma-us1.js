var Web3 = require('web3')
var Web3UtiL = require('web3-utils')
var ethWaLLet = require('ethereumjs-wallet')
var ethUtiL = require('ethereumjs-util')
var ethTx = require('ethereumjs-tx')
var Https = require('https')
var Axios = require('axios')
const { readFileSync } = require('fs')
var { web3Signer } = require('./web3Signer.js')

var {
  Address,
  Client,
  Contracts,
  CryptoUtils,
  LocalAddress,
  LoomProvider,
  NonceTxMiddleware,
  SignedTxMiddleware
} = require('loom-js')

var Env = require('../../.env.json')
const HotWaLLetAddr = Env.key_server_ip + ':' + Env.key_server_port
var Agent = Axios.create({
  baseURL: HotWaLLetAddr,
  httpsAgent: new Https.Agent({
    rejectUnauthorized: false
  }),
  //adapter: require('axios/lib/adapters/http'),
  withCredentials: true
})

async function GetLoomPrivateKeyAsync(waLLet){
  var Token
  var Sign
  await Agent.post('/query_get_token', {})
  .then(await function(res){
    var TgtStr = res.data.string
    var Msg = Buffer.from(TgtStr, 'utf8')
    const Prefix = new Buffer("\x19Ethereum Signed Message:\n")
    const PrefixedMsg = Buffer.concat([Prefix, new Buffer(String(Msg.length)), Msg])
    const ESCSign = ethUtiL.ecsign(ethUtiL.keccak256(PrefixedMsg), waLLet.getPrivateKey())
    Sign = ethUtiL.bufferToHex(ESCSign.r) + ethUtiL.bufferToHex(ESCSign.s).substr(2) + ethUtiL.bufferToHex(ESCSign.v).substr(2)
    Token = res.data.token
  })
  .catch(err=>console.error('>>> error: ' + JSON.stringify(err)))

  const ConfirmData = {
    addr: waLLet.getAddressString(),
    sign: Sign
  }

  console.log('token: ' + Token)
  await Agent.post('/query_get_private_key', {
    confirm_data: ConfirmData
  }, {
    headers: { Authorization: "Bearer " + Token }
  })
  .then(await function(res){
    var QueryStatus = res.data.status
    if (QueryStatus == 'verify failed'){
      console.log(">>> login failed: verify signature failed")
    } else {
      if (QueryStatus == 'create'){
        console.log(">>> login succeed: new key pair is generated")
      }
      if (QueryStatus == 'return'){
        console.log(">>> login succeed: key pair is returned")
      }
      console.log(">>> private key: " + res.data.prv_key)
      PrivateKey = res.data.prv_key
    }
  })
  .catch(err=>console.error('>>> error: ' + JSON.stringify(err)))
  return PrivateKey
}

async function Mapping(){

  var Rinkeby = require('./rinkeby.json')
  const RinkebyPrivateKey = Rinkeby.prv_key
  console.log('>>> rinkeby private key: ' + RinkebyPrivateKey)
  console.log('>>> rinkeby private key\'s type: ' + typeof RinkebyPrivateKey)

  const RinkebyApiToken = Rinkeby.api_token
  console.log('>>> rinkeby api token: ' + RinkebyApiToken)

  //
  const EthWaLLet = ethWaLLet.fromPrivateKey(ethUtiL.toBuffer(RinkebyPrivateKey))
  console.log('>>> wallet address: ' +  EthWaLLet.getAddressString())

  const LoomPrviteKey = await GetLoomPrivateKeyAsync(EthWaLLet)
  console.log('>>> loom private key: ' + LoomPrviteKey)

  //var EthProvider = new Web3.providers.HttpProvider('https://rinkeby.infura.io/' + RinkebyApiToken)
  var EthProvider = new Web3.providers.WebsocketProvider('wss://rinkeby.infura.io/ws')
  var EthW3 = new Web3(EthProvider)

  // balance 체크
  EthW3.eth.getBalance(EthWaLLet.getAddressString()).then( balance =>{
    console.log('>>> ethereum balance: ' + balance)
  })

  var jsonGateway = require('./Gateway.json')
  const EthNetworkID = await EthW3.eth.net.getId()
  console.log('>>> ethereum network id: ' + EthNetworkID)
  const EthCon = new EthW3.eth.Contract(
    jsonGateway.abi,
    jsonGateway.networks[EthNetworkID].address
  )

  //
  const LoomPrivateKeyB64 = CryptoUtils.B64ToUint8Array(LoomPrviteKey)
  const LoomPubLicKey = CryptoUtils.publicKeyFromPrivateKey(LoomPrivateKeyB64)
  const LoomCLient = new Client(
    'extdev-plasma-us1',
    'wss://extdev-plasma-us1.dappchains.com/websocket',
    'wss://extdev-plasma-us1.dappchains.com/queryws'
  )

  LoomCLient.on('error', err=>{
    console.error('>>> ' + JSON.stringify(err))
  })

  LoomCLient.txMiddleware = [
    new NonceTxMiddleware(LoomPubLicKey, LoomCLient),
    new SignedTxMiddleware(LoomPrivateKeyB64)
  ]

  const LoomAddress = new Address(LoomCLient.chainId, LocalAddress.fromPublicKey(LoomPubLicKey))
  const AddressMapper = await Contracts.AddressMapper.createAsync(LoomCLient, LoomAddress)

  const WWW3Signer = new web3Signer(EthWaLLet.getPrivateKey())

  const From = new Address('eth', LocalAddress.fromHexString(EthWaLLet.getAddressString()))

  // 매핑만 테스트...
  //const bMapped = await AddressMapper.hasMappingAsync(From)
  const bMapped = false
  if (bMapped)
  {
    const from = EthWaLLet.getAddressString()
    const to = EthCon.options.address
    const nonce = '0x' + (await EthW3.eth.getTransactionCount(from)).toString(16)
    const gasPrice = await EthW3.eth.getGasPrice()
    var RawTx = {
      nonce,
      from,
      to,
      gasPrice,
      value: 1e16,
    }
    console.log(">>> raw tx: " + JSON.stringify(RawTx))
    let EstimateGas = await EthW3.eth.estimateGas(RawTx)
    console.log('>>> estimate gas: ' + EstimateGas)

    RawTx.gas = EstimateGas
    await EthW3.eth.estimateGas(RawTx)

    var Tx = new ethTx(RawTx)
    Tx.sign(EthWaLLet.getPrivateKey())
    var SeriaLizedTx = Tx.serialize()
    const SignedTx = await EthW3.eth.sendSignedTransaction("0x" + SeriaLizedTx.toString('hex'))
    console.log('signed tx: ' + JSON.stringify(SignedTx))
  }
  else
  {
    console.log('>>>> map ethereum account to loom account...')
    await AddressMapper.addIdentityMappingAsync(From, LoomAddress, WWW3Signer)
    console.log('>>>> address mapping complete')
  }

  const LoomCoin = await Contracts.EthCoin.createAsync(LoomCLient, LoomAddress)
  const LoomBaLance = await LoomCoin.getBalanceOfAsync(LoomAddress)
  console.log('>>> loom balance: ' + LoomBaLance)
}

Mapping()
