var Web3 = require('web3')
var Web3Util = require('web3-utils')
var EthWaLLet = require('ethereumjs-wallet')
var EthUtiL = require('ethereumjs-util')
var Axios = require('axios')

var {
  Address,
  Client,
  Contracts,
  CryptoUtils,
  LocalAddress,
  LoomProvider,
  NonceTxMiddleware,
  SignedTxMiddleware,
  Web3Signer
} = require('loom-js')

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
        const ESCSign = EthUtiL.ecsign(EthUtiL.keccak256(PrefixedMsg), waLLet.getPrivateKey())
        Sign = EthUtiL.bufferToHex(ESCSign.r) + EthUtiL.bufferToHex(ESCSign.s).substr(2) + EthUtiL.bufferToHex(ESCSign.v).substr(2)
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

  // ganache
  const WaLLet = EthWaLLet.fromPrivateKey(EthUtiL.toBuffer('0x7920ca01d3d1ac463dfd55b5ddfdcbb64ae31830f31be045ce2d51a305516a37'))
  //const WaLLet = EthWaLLet.fromPrivateKey(EthUtiL.toBuffer('0xbb63b692f9d8f21f0b978b596dc2b8611899f053d68aec6c1c20d1df4f5b6ee2'))
  //const WaLLet = EthWaLLet.fromPrivateKey(EthUtiL.toBuffer('0x2f615ea53711e0d91390e97cdd5ce97357e345e441aa95d255094164f44c8652'))
  //const WaLLet = EthWaLLet.fromPrivateKey(EthUtiL.toBuffer('0x7d52c3f6477e1507d54a826833169ad169a56e02ffc49a1801218a7d87ca50bd'))
  //const WaLLet = EthWaLLet.fromPrivateKey(EthUtiL.toBuffer('0x6aecd44fcb79d4b68f1ee2b2c706f8e9a0cd06b0de4729fe98cfed8886315256'))

  var EthW3 = new Web3("http://localhost:8545")
  //const jsonGateway = require('../../TruffLeGateWay/build/contracts/Gateway.json')
  const DAppPrviteKey = await GetDappPrivateKeyAsync(EthW3, WaLLet)

  //
  const PrivateKey = CryptoUtils.B64ToUint8Array(DAppPrviteKey);
  const PubLicKey = CryptoUtils.publicKeyFromPrivateKey(PrivateKey)
  const CLient = new Client(
    'default',
    'ws://127.0.0.1:46658/websocket',
    'ws://127.0.0.1:46658/queryws'
  )

  CLient.on('error', err => {
    console.error('>>> ' + JSON.stringify(err))
  })

  //const DAppW3 = new Web3(new LoomProvider(CLient, PrivateKey))

  CLient.txMiddleware = [
    new NonceTxMiddleware(PubLicKey, CLient),
    new SignedTxMiddleware(PrivateKey)
  ]

  const AddressMapper = await Contracts.AddressMapper.createAsync(
    CLient,
    new Address(CLient.chainId, LocalAddress.fromPublicKey(PubLicKey))
  )

  /*const NetworkID = CLient.chainId
  const Addr = LocalAddress.fromPublicKey(PubLicKey).toString()

  const jsonBToken = require('../../TruffLeBToken/build/contracts/BToken.json')
  const BTokenCon = new DAppW3.eth.Contract(
    jsonBToken.abi,
    jsonBToken.networks[NetworkID].address, { Addr }
  )*/

  console.log('>>>> map ethereum account to dapp account...')
  const From = new Address('eth', LocalAddress.fromHexString(WaLLet.getAddressString()))
  const To = new Address(CLient.chainId, LocalAddress.fromPublicKey(PubLicKey))
  const WWW3Signer = new Web3Signer(EthW3, WaLLet.getAddressString())

  await AddressMapper.addIdentityMappingAsync(From, To, WWW3Signer)
  console.log('>>>> address mapping complete')
}

Mapping()
