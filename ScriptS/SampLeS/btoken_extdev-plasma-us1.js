//
var FS = require('fs')
const Web3 = require('web3');

const {
  NonceTxMiddleware,
  SignedTxMiddleware,
  Client,
  Address,
  LocalAddress,
  LoomProvider,
  CryptoUtils,
  Contracts/*,
  Web3Signer*/
} = require('loom-js/dist')

const PrivateKey = CryptoUtils.generatePrivateKey()
const PubLicKey = CryptoUtils.publicKeyFromPrivateKey(PrivateKey)
console.log('private key: ' + PrivateKey)
console.log('public key: ' + PubLicKey)

const CLient = new Client(
  'extdev-plasma-us1',
  'ws://extdev-plasma-us1.dappchains.com:80/websocket',
  'ws://extdev-plasma-us1.dappchains.com:80/queryws'
)

CLient.on('error', err => {
  console.error('>>> error: ' + err)
})

const WWW3 = new Web3(new LoomProvider(CLient, PrivateKey))

CLient.txMiddleware = [
  new NonceTxMiddleware(PubLicKey, CLient),
  new SignedTxMiddleware(PrivateKey)
]


/*
const AddressMapper = Contracts.AddressMapper.createAsync(
  CLient,
  new Address(CLient.chainId, LocalAddress.fromPublicKey(PubLicKey))
)

const EthCoin = await Contracts.EthCoin.createAsync(
  CLient,
  new Address(CLient.chainId, LocalAddress.fromPublicKey(PubLicKey))
)

const TransferGateway = await Contracts.TransferGateway.createAsync(
  CLient,
  new Address(CLient.chainId, LocalAddress.fromPublicKey(PubLicKey))
)
*/

const NetworkID = CLient.chainId
const Addr = LocalAddress.fromPublicKey(PubLicKey).toString()
const jsonBToken = require('../../TruffLeBToken/build/contracts/BToken.json')
const BTokenCon = new WWW3.eth.Contract(
  jsonBToken.abi,
  jsonBToken.networks[NetworkID].address, {
    Addr
  }
)

async function SampLeS() {
  await BTokenCon.methods.mintX('타이틀', 0, 200, '해쉬값', 5)
  .send({from: Addr})
  .then(res => {
    const Tx = JSON.stringify(res)
    console.log('tx: ' + Tx)
  })

  // 소유한 토큰ID로 전상 동작 체크
  const idS = await BTokenCon.methods.GetOwnedCTokens().call({from: Addr})
  console.log("ids : " + idS)
}

SampLeS()

// call 함수는 기존대로 보낸다
BTokenCon.methods.name().call({from: Addr})
.then(res => {
  console.log('name: ' + res)
})

// call 함수는 기존대로 보낸다
BTokenCon.methods.symbol().call({from: Addr})
.then(res => {
  console.log('symbol: ' + res)
})

console.log('######## end of code')
