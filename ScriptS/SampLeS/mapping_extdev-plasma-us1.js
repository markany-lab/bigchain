var crypto = require('crypto')
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

var Rinkeby = require('./rinkeby.json')
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
  var PrivateKey = ''
  var Enc = false
  await Agent.post('/query_get_token', {})
  .then(await function(res){
    var MsgStr = res.data.string
    var Msg = Buffer.from(MsgStr, 'utf8')
    const Prefix = new Buffer("\x19Ethereum Signed Message:\n")
    const PrefixedMsg = Buffer.concat([Prefix, new Buffer(String(Msg.length)), Msg])
    const PreSign = ethUtiL.ecsign(ethUtiL.keccak256(PrefixedMsg), waLLet.getPrivateKey())
    Sign = ethUtiL.bufferToHex(PreSign.r) + ethUtiL.bufferToHex(PreSign.s).substr(2) + ethUtiL.bufferToHex(PreSign.v).substr(2)
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
  },
  {
    headers: {
      Authorization: "Bearer " + Token
    }
  })
  .then(await function(res){
    var QueryStatus = res.data.status
    if(QueryStatus == 'succeed'){
      console.log("private key: " + res.data.key)
      PrivateKey = res.data.key
      Enc = res.data.enc
    }
    else{
      console.log("error: verify signature failed")
    }
  })
  .catch(err=>console.error('>>> error: ' + JSON.stringify(err)))
  if(Enc){
    var EncKey = Rinkeby.prv_key
    EncKey = EncKey.replace('0x', '')
    EncKey = new Buffer(EncKey, 'hex')

    var DecipheredKey = loom.CryptoUtils.B64ToUint8Array(PrivateKey)
    var Decipher = crypto.createDecipheriv("aes-256-ecb", EncKey, '')
    Decipher.setAutoPadding(false)
    var DecipheredKey = Decipher.update(DecipheredKey).toString('base64')
    DecipheredKey += Decipher.final('base64')
    PrivateKey = DecipheredKey
  }
  return PrivateKey
}

async function Mapping(){
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
  if(bMapped)
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
