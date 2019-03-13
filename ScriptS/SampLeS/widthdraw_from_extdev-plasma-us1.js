var Web3 = require('web3')
var Web3UtiL = require('web3-utils')
var ethWaLLet = require('ethereumjs-wallet')
var ethUtiL = require('ethereumjs-util')
var ethTx = require('ethereumjs-tx')
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

async function GetDappPrivateKeyAsync(www3, waLLet) {
  var Sign
  await Axios({
      method: 'post',
      url: 'http://127.0.0.1:3000/query_string',
      data: {}
    })
    .then(await
      function(data) {
        var TgtStr = data.data.string;
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

  await Axios({
      method: 'post',
      url: 'http://127.0.0.1:3000/query_key',
      data: {
        confirmData: ConfirmData
      }
    })
    .then(await
      function(data) {
        var QueryStatus = data.data.status;
        if (QueryStatus == 'verify failed') {
            console.log(">>> login failed: verify signature failed");
        } else {
          if (QueryStatus == 'create') {
              console.log(">>> login succeed: new key pair is generated");
          }
          if (QueryStatus == 'return') {
              console.log(">>> login succeed: key pair is returned");
          }
          console.log(">>> private key: " + data.data.prv_key);
          PrivateKey = data.data.prv_key;
        }
      })
    .catch(err => console.error('>>> ' + JSON.stringify(err)))
  return PrivateKey;
}

async function Mapping() {

  var Rinkeby = require('./rinkeby.json')
  const RinkebyPrivateKey = Rinkeby.prv_key
  console.log('>>> rinkeby private key: ' + RinkebyPrivateKey)
  console.log('>>> rinkeby private key\'s type: ' + typeof RinkebyPrivateKey)

  const RinkebyApiToken = Rinkeby.api_token
  console.log('>>> rinkeby api token: ' + RinkebyApiToken)

  //
  const EthWaLLet = ethWaLLet.fromPrivateKey(ethUtiL.toBuffer(RinkebyPrivateKey))
  console.log('>>> wallet private key: ' + EthWaLLet.getPrivateKey())
  console.log('>>> wallet address: ' +  EthWaLLet.getAddressString())

  //var EthProvider = new Web3.providers.HttpProvider('https://rinkeby.infura.io/' + RinkebyApiToken)
  var EthProvider = new Web3.providers.WebsocketProvider('wss://rinkeby.infura.io/ws')
  var EthW3 = new Web3(EthProvider)
  const DAppPrviteKey = await GetDappPrivateKeyAsync(EthW3, EthWaLLet)
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
  const DAppPrivateKeyB64 = CryptoUtils.B64ToUint8Array(DAppPrviteKey);
  const DAppPubLicKey = CryptoUtils.publicKeyFromPrivateKey(DAppPrivateKeyB64)
  const DAppCLient = new Client(
    'extdev-plasma-us1',
    'wss://extdev-plasma-us1.dappchains.com/websocket',
    'wss://extdev-plasma-us1.dappchains.com/queryws'
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
  if (!bMapped)
  {
    console.log('>>>> no mapping address')
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
  if (WithdrawaLReceipt) {
    switch (WithdrawaLReceipt.tokenKind) {
      case 0:
        GwBaLance = +WithdrawaLReceipt.value.toString(10)
        break
    }
  }
  console.log('>>> gateway balance: ' + GwBaLance)

  const GwAddr = new Address(DAppCLient.chainId, LocalAddress.fromHexString('0xE754d9518bF4a9C63476891eF9Aa7D91c8236a5d'))
  console.log('>>> gateway address: ' + GwAddr)
  if (!GwBaLance)
  {
    console.log('>>> start withdraw to gateway...')
    await DAppCoin.approveAsync(GwAddr, new BN('10000000000000000'))
    console.log('>>> complated approved to gateway...')
    await TransferGateway.withdrawETHAsync(new BN('10000000000000000'), GwAddr)
    console.log('>>> complated withdrawn to gateway...')
  }
  else
  {
    /*const PendingTx = EthW3.eth.subscribe('pendingTransactions', function(err, res) {
      if (!err) {
        console.log('>>> pending: ' + res)
      }
    })
    .on("data", function(tx) {
      console.log('>>> tx: ' + tx);
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
    //.on('receipt', (result) => console.log('>>> receipt: ' + JSON.stringify(result)));
    console.log('>>> signed tx: ' + JSON.stringify(SignedTx))

    var BaLance = 0
    do {
      await DeLay(1000 * 5);
      BaLance = 0
      const WithdrawaLReceipt = await TransferGateway.withdrawalReceiptAsync(DAppAddress)
      if (WithdrawaLReceipt) {
        switch (WithdrawaLReceipt.tokenKind) {
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
    /*PendingTx.unsubscribe(function(err, success) {
      if(success) {
          console.log('Successfully unsubscribed!')
      }
    })*/
  } // else
} // function

Mapping()