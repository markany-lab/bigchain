var crypto = require('crypto')
var Web3 = require('web3')
var Web3UtiL = require('web3-utils')
var ethWaLLet = require('ethereumjs-wallet')
var ethUtiL = require('ethereumjs-util')
var ethTx = require('ethereumjs-tx')
var Https = require('https')
var Axios = require('axios')

const {
  readdirSync,
  readFileSync
} = require('fs')

const { join } = require('path')
const readLine = require('readline')
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
const HotWaLLetAddr = Env.hot_wallet_url + ':' + Env.hot_wallet_port
var Agent = Axios.create({
  baseURL: HotWaLLetAddr,
  httpsAgent: new Https.Agent({
    rejectUnauthorized: false,
  })
})

async function GetLoomPrivateKeyAsync(waLLet){
  var Token
  var Sign
  var PrivateKey = ''
  var Enc = false

  var EncKey = waLLet.getPrivateKey().toString('hex')
  EncKey = new Buffer(EncKey, 'hex')

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
  .catch(err=>console.log('>>> ' + err))

  const ConfirmData = {
    addr: waLLet.getAddressString(),
    sign: Sign
  }

  var CipheredKey = CryptoUtils.generatePrivateKey()
  var Cipher = crypto.createCipheriv('aes-256-ecb', EncKey, '')
  Cipher.setAutoPadding(false)
  var CipheredKey = Cipher.update(CipheredKey).toString('base64')
  CipheredKey += Cipher.final('base64')
  console.log('suggested key: ' + CipheredKey)

  console.log('token: ' + Token)
  await Agent.post('/query_get_private_key', {
    confirm_data: ConfirmData,
    suggested_key: CipheredKey
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
  .catch(err){
    console.log('>>> ' + err)
  }
  if(Enc){
    var DecipheredKey = CryptoUtils.B64ToUint8Array(PrivateKey)
    var Decipher = crypto.createDecipheriv("aes-256-ecb", EncKey, '')
    Decipher.setAutoPadding(false)
    var DecipheredKey = Decipher.update(DecipheredKey).toString('base64')
    DecipheredKey += Decipher.final('base64')
    PrivateKey = DecipheredKey
  }
  else{
    // 키가 암호화되어 있지 않다면 암오화 하여 업데이트
    var Cipher = crypto.createCipheriv('aes-256-ecb', EncKey, '')
    Cipher.setAutoPadding(false)
    CipheredKey = CryptoUtils.B64ToUint8Array(PrivateKey)
    if (CipheredKey.length == 64){
      CipheredKey = Cipher.update(CipheredKey).toString('base64')
      CipheredKey += Cipher.final('base64')

      await Agent.post('/query_update_private_key', {
        confirm_data: ConfirmData,
        suggested_key: CipheredKey
      },
      {
        headers: {
          Authorization: "Bearer " + Token
        }
      })
      .then(await function(res){
        console.log("status: " + res.data.status)
      })
    }
  }
  return PrivateKey
}

async function GetCoLdWaLLetAsync(){
  try{
    var KeystorePath = join(__dirname, './keystore/')
    var FiLeS = readdirSync(KeystorePath)
    FiLeS = FiLeS.filter(element => !(element.indexOf('UTC')))
    if(FiLeS.length == 0){
      console.log('can\'t found any account, please use the impoet cold wallet command first: node ./cold_wallet_import.js')
      process.exit(-1)
    }

    FiLeS.sort()

    const RL = readLine.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    var index = 0
    do{
      console.log('select index')
      for(let i = 0; i < FiLeS.length; i++){
        console.log('[' + i + ']' + FiLeS[i])
      }

      var index = await new Promise(resolve=>RL.question('input index\n>', input=>{
        resolve(input)
      }))
      index = parseInt(index, 10)
      console.log('current index: ' + index)
    } while( !(0 <= index && index < FiLeS.length))
    console.log('selected index: ' + index)

    var FiLePath = KeystorePath + FiLeS[index]
    console.log('selected file path: ' + FiLePath)
    var V3 = JSON.parse(readFileSync(FiLePath, 'utf8'))
    console.log(V3)

    var Password = await new Promise(resolve=>RL.question('input password\n>', password=>{
      resolve(password)
    }))

    RL.close()

    return ethWaLLet.fromV3(V3, Password)
  }
  catch(err)
  {
    console.log(err)
  }
}

async function main(){
  const EthWaLLet = await GetCoLdWaLLetAsync()
  console.log('>>> wallet private key: ' + EthWaLLet.getPrivateKey().toString('hex'))
  console.log('>>> wallet address: ' +  EthWaLLet.getAddressString())

  const LoomPrviteKey = await GetLoomPrivateKeyAsync(EthWaLLet)
  console.log('>>> loom private key: ' + LoomPrviteKey)

  var EthProvider = new Web3.providers.WebsocketProvider('wss://rinkeby.infura.io/ws')
  var EthW3 = new Web3(EthProvider)

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
  const LoomPrivateKeyB64 = CryptoUtils.B64ToUint8Array(LoomPrviteKey)
  const LoomPubLicKey = CryptoUtils.publicKeyFromPrivateKey(LoomPrivateKeyB64)
  const LoomCLient = new Client(
    'default',
    'ws://127.0.0.1:46658/websocket',
    'ws://127.0.0.1:46658/queryws'
  )

  LoomCLient.on('error', err=>{
    console.log('>>> ' + JSON.stringify(err))
  })

  LoomCLient.txMiddleware = [
    new NonceTxMiddleware(LoomPubLicKey, LoomCLient),
    new SignedTxMiddleware(LoomPrivateKeyB64)
  ]

  const LoomAddress = new Address(LoomCLient.chainId, LocalAddress.fromPublicKey(LoomPubLicKey))
  const AddressMapper = await Contracts.AddressMapper.createAsync(LoomCLient, LoomAddress)

  const WWW3Signer = new web3Signer(EthWaLLet.getPrivateKey())

  const From = new Address('eth', LocalAddress.fromHexString(EthWaLLet.getAddressString()))
  const bMapped = await AddressMapper.hasMappingAsync(From)
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
    console.log('>>> map ethereum account to loom account...')
    try{
      await AddressMapper.addIdentityMappingAsync(From, LoomAddress, WWW3Signer)
    }
    catch(err){
      console.log('>>> ' + err)
    }
    console.log('>>> address mapping complete')
  }

  const LoomCoin = await Contracts.EthCoin.createAsync(LoomCLient, LoomAddress)
  const LoomBaLance = await LoomCoin.getBalanceOfAsync(LoomAddress)
  console.log('>>> loom balance: ' + LoomBaLance)
}

main()
.then(()=>{
    process.exit(0)
})
