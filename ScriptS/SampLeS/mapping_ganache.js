var Web3 = require('web3')
var Web3UtiL = require('web3-utils')
var ethWaLLet = require('ethereumjs-wallet')
var ethUtiL = require('ethereumjs-util')
var ethTx = require('ethereumjs-tx')
var Https = require('https')
var Axios = require('axios')
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
    rejectUnauthorized: false,
  })
})

async function GetDappPrivateKeyAsync(www3, waLLet) {
  var Sign
  await Agent.post('/query_string', {})
  .then(await function(res) {
    var TgtStr = res.data.string;
    var Msg = Buffer.from(TgtStr, 'utf8')
    const Prefix = new Buffer("\x19Ethereum Signed Message:\n")
    const PrefixedMsg = Buffer.concat([Prefix, new Buffer(String(Msg.length)), Msg])
    const ESCSign = ethUtiL.ecsign(ethUtiL.keccak256(PrefixedMsg), waLLet.getPrivateKey())
    Sign = ethUtiL.bufferToHex(ESCSign.r) + ethUtiL.bufferToHex(ESCSign.s).substr(2) + ethUtiL.bufferToHex(ESCSign.v).substr(2)
  })
  .catch(err => console.error('>>> ' + JSON.stringify(err)))

  const ConfirmData = {
    ethAddress: waLLet.getAddressString(),
    sign: Sign
  }

  await Agent.post('/query_prv_key', {
      confirmData: ConfirmData
  })
  .then(await function(res) {
    var QueryStatus = res.data.status;
    if (QueryStatus == 'verify failed') {
      console.log(">>> login failed: verify signature failed");
    } else {
      if (QueryStatus == 'create') {
        console.log(">>> login succeed: new key pair is generated");
      }
      if (QueryStatus == 'return') {
        console.log(">>> login succeed: key pair is returned");
      }
      console.log(">>> private key: " + res.data.prv_key);
      PrivateKey = res.data.prv_key;
    }
  })
  .catch(err => console.error('>>> ' + JSON.stringify(err)))
  return PrivateKey;
}

async function Mapping() {

  // ganache
  const EthWaLLet = ethWaLLet.fromPrivateKey(ethUtiL.toBuffer('0x7920ca01d3d1ac463dfd55b5ddfdcbb64ae31830f31be045ce2d51a305516a37'))
  //const EthWaLLet = ethWaLLet.fromPrivateKey(ethUtiL.toBuffer('0xbb63b692f9d8f21f0b978b596dc2b8611899f053d68aec6c1c20d1df4f5b6ee2'))
  //const EthWaLLet = ethWaLLet.fromPrivateKey(ethUtiL.toBuffer('0x2f615ea53711e0d91390e97cdd5ce97357e345e441aa95d255094164f44c8652'))
  //const EthWaLLet = ethWaLLet.fromPrivateKey(ethUtiL.toBuffer('0x7d52c3f6477e1507d54a826833169ad169a56e02ffc49a1801218a7d87ca50bd'))
  //const EthWaLLet = ethWaLLet.fromPrivateKey(ethUtiL.toBuffer('0x6aecd44fcb79d4b68f1ee2b2c706f8e9a0cd06b0de4729fe98cfed8886315256'))

  var EthProvider = new Web3.providers.HttpProvider('http://localhost:8545')
  //var EthProvider = new Web3.providers.WebsocketProvider('ws://localhost:8546')
  var EthW3 = new Web3(EthProvider)
  const DAppPrviteKey = await GetDappPrivateKeyAsync(EthW3, EthWaLLet)
  console.log('>>> dapp api token: ' + DAppPrviteKey)

  // balance 체크
  EthW3.eth.getBalance(EthWaLLet.getAddressString()).then( balance =>{
    console.log('>>> ethereum balance: ' + balance)
  })

  var jsonGateway = require('../../TruffLeGateWay/build/contracts/Gateway.json')
  const EthNetworkID = await EthW3.eth.net.getId()
  const EthCon = new EthW3.eth.Contract(
    jsonGateway.abi,
    jsonGateway.networks[EthNetworkID].address
  )

  //
  const DAppPrivateKeyB64 = CryptoUtils.B64ToUint8Array(DAppPrviteKey);
  const DAppPubLicKey = CryptoUtils.publicKeyFromPrivateKey(DAppPrivateKeyB64)
  const DAppCLient = new Client(
    'default',
    'ws://127.0.0.1:46658/websocket',
    'ws://127.0.0.1:46658/queryws'
  )

  DAppCLient.on('error', err => {
    console.error('>>> ' + JSON.stringify(err))
  })

  DAppCLient.txMiddleware = [
    new NonceTxMiddleware(DAppPubLicKey, DAppCLient),
    new SignedTxMiddleware(DAppPrivateKeyB64)
  ]

  const DAppAddress = new Address(DAppCLient.chainId, LocalAddress.fromPublicKey(DAppPubLicKey))
  const AddressMapper = await Contracts.AddressMapper.createAsync(DAppCLient, DAppAddress)

  const WWW3Signer = new web3Signer(EthWaLLet.getPrivateKey())

  const From = new Address('eth', LocalAddress.fromHexString(EthWaLLet.getAddressString()))
  const bMapped = await AddressMapper.hasMappingAsync(From)
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
    console.log('>>>> map ethereum account to dapp account...')
    await AddressMapper.addIdentityMappingAsync(From, DAppAddress, WWW3Signer)
    console.log('>>>> address mapping complete')
  }

  const DAppCoin = await Contracts.EthCoin.createAsync(DAppCLient, DAppAddress)
  const DAppBaLance = await DAppCoin.getBalanceOfAsync(DAppAddress)
  console.log('>>> dapp balance: ' + DAppBaLance)
}

Mapping()
