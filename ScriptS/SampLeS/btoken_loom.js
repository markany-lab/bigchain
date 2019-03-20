//
var FS = require('fs')
const Web3 = require('web3')

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
  'default',
  'ws://127.0.0.1:46658/websocket',
  'ws://127.0.0.1:46658/queryws'
)

CLient.on('error', err => {
  console.log('>>> error: ' + err)
})

const WWW3 = new Web3(new LoomProvider(CLient, PrivateKey))

CLient.txMiddleware = [
  new NonceTxMiddleware(PubLicKey, CLient),
  new SignedTxMiddleware(PrivateKey)
]


const NetworkID = CLient.chainId
const Addr = LocalAddress.fromPublicKey(PubLicKey).toString()
const jsonBToken = require('../../TruffLeBToken/build/contracts/BToken.json')
const BTokenCon = new WWW3.eth.Contract(
  jsonBToken.abi,
  jsonBToken.networks[NetworkID].address, {
    Addr
  }
)

async function main() {
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

main()

console.log('######## end of code')
