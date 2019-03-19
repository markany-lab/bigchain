var crypto = require('crypto')
var Web3 = require('web3')
var Web3UtiL = require('web3-utils')
var ethWaLLet = require('ethereumjs-wallet')
var ethUtiL = require('ethereumjs-util')
var ethTx = require('ethereumjs-tx')
var Https = require('https')
var Axios = require('axios')
var BN = require('bn.js')
const DeLay = require('delay')
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
} = require('loom-js/dist')

var Rinkeby = require('./rinkeby.json')
var Env = require('../../.env.json')
const HotWaLLetAddr = Env.hot_wallet_url + ':' + Env.hot_wallet_port
var Agent = Axios.create({
  baseURL: HotWaLLetAddr,
  httpsAgent: new Https.Agent({
    rejectUnauthorized: false,
  })
})

async function GetDappPrivateKeyAsync(waLLet){
  var Token
  var Sign
  var PrivateKey = ''
  var Enc = false

  var EncKey = waLLet.getPrivateKey().toString('hex')
  //EncKey = EncKey.replace('0x', '')
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
  .catch(err=>console.log('>>> ' + err))
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

async function Mapping(){
  const RinkebyPrivateKey = Rinkeby.private_key
  console.log('>>> rinkeby private key: ' + RinkebyPrivateKey)
  console.log('>>> rinkeby private key\'s type: ' + typeof RinkebyPrivateKey)

  //
  const EthWaLLet = ethWaLLet.fromPrivateKey(ethUtiL.toBuffer(RinkebyPrivateKey))
  console.log('>>> wallet private key: ' + EthWaLLet.getPrivateKey())
  console.log('>>> wallet address: ' +  EthWaLLet.getAddressString())

  var EthProvider = new Web3.providers.WebsocketProvider('wss://rinkeby.infura.io/ws')
  var EthW3 = new Web3(EthProvider)
  const DAppPrviteKey = await GetDappPrivateKeyAsync(EthWaLLet)
  console.log('>>> dapp api token: ' + DAppPrviteKey)

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
  const DAppPrivateKeyB64 = CryptoUtils.B64ToUint8Array(DAppPrviteKey)
  const DAppPubLicKey = CryptoUtils.publicKeyFromPrivateKey(DAppPrivateKeyB64)
  const DAppCLient = new Client(
    'extdev-plasma-us1',
    'wss://extdev-plasma-us1.dappchains.com/websocket',
    'wss://extdev-plasma-us1.dappchains.com/queryws'
  )

  DAppCLient.on('error', err=>{
    console.log('>>> ' + JSON.stringify(err))
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
  if(!bMapped)
  {
    console.log('>>> no mapping address')
    return
  }

  const DAppCoin = await Contracts.EthCoin.createAsync(DAppCLient, DAppAddress)
  const DAppBaLance = await DAppCoin.getBalanceOfAsync(DAppAddress)
  console.log('>>> dapp balance: ' + DAppBaLance)

  //
  const TransferGateway = await Contracts.TransferGateway.createAsync(DAppCLient, DAppAddress)
  await TransferGateway.on(Contracts.TransferGateway.EVENT_TOKEN_WITHDRAWAL, event=>{
    console.log('event: ' + JSON.stringify(event))
  })

  var GwBaLance = 0
  const WithdrawaLReceipt = await TransferGateway.withdrawalReceiptAsync(DAppAddress)
  if(WithdrawaLReceipt){
    switch (WithdrawaLReceipt.tokenKind){
      case 0:
        GwBaLance = +WithdrawaLReceipt.value.toString(10)
        break
    }
  }
  console.log('>>> gateway balance: ' + GwBaLance)

  const GwAddr = new Address(DAppCLient.chainId, LocalAddress.fromHexString('0xE754d9518bF4a9C63476891eF9Aa7D91c8236a5d'))
  console.log('>>> gateway address: ' + GwAddr)
  if(!GwBaLance)
  {
    console.log('>>> start withdraw to gateway...')
    await DAppCoin.approveAsync(GwAddr, new BN('10000000000000000'))
    console.log('>>> complated approved to gateway...')
    await TransferGateway.withdrawETHAsync(new BN('10000000000000000'), GwAddr)
    console.log('>>> complated withdrawn to gateway...')
  }
  else
  {
    /*const PendingTx = EthW3.eth.subscribe('pendingTransactions', function(err, res){
      if(!err){
        console.log('>>> pending: ' + res)
      }
    })
    .on("data", function(tx){
      console.log('>>> tx: ' + tx)
    })*/

    const Signature = CryptoUtils.bytesToHexAddr(WithdrawaLReceipt.oracleSignature)
    const Amount = Web3UtiL.toHex(GwBaLance)
    const Query = await EthCon.methods.withdrawETH(Amount, Signature)

    const from = WithdrawaLReceipt.tokenOwner.local.toString()
    const to = EthCon.options.address

    const nonce = '0x' + (await EthW3.eth.getTransactionCount(from)).toString(16)
    console.log('>>> nonce: ' + nonce)
    const data = Query.encodeABI()
    const gasPrice = await EthW3.eth.getGasPrice()

    //Warring: chainId는 숫자 타입으로 입력
    const chainId = ( Object.keys(jsonGateway.networks)[0] ) * 1
    var RawTx = {
      nonce,
      from,
      to,
      gasPrice,
      data,
      chainId
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
    //.on('receipt', (result)=>console.log('>>> receipt: ' + JSON.stringify(result)))
    console.log('>>> signed tx: ' + JSON.stringify(SignedTx))

    var BaLance = 0
    do {
      await DeLay(1000 * 5)
      BaLance = 0
      const WithdrawaLReceipt = await TransferGateway.withdrawalReceiptAsync(DAppAddress)
      if (WithdrawaLReceipt){
        switch (WithdrawaLReceipt.tokenKind){
          case 0:
            BaLance = +WithdrawaLReceipt.value.toString(10)
            break
        }
      }
      console.log('>>> check balance: ' + BaLance)
    } while(BaLance)

    //const CheckTx = await EthW3.eth.getTransaction(SignedTx.transactionHash)
    //console.log('>>> check tx: ' + JSON.stringify(CheckTx))

    //
    /*PendingTx.unsubscribe(function(err, success){
      if(success){
          console.log('Successfully unsubscribed!')
      }
    })*/
  } // else
} // function

Mapping()
