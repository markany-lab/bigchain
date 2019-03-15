const Web3 = require('web3');
const jsonZombie = require('../../TruffLeBToken/build/contracts/BToken.json');
const env = require('../../.env.json')

const {
  NonceTxMiddleware,
  SignedTxMiddleware,
  Client,
  Address,
  LocalAddress,
  LoomProvider,
  CryptoUtils,
  Contracts,
  Web3Signer
} = require('loom-js/dist')

const PrivateKey = CryptoUtils.generatePrivateKey()
const PubLicKey = CryptoUtils.publicKeyFromPrivateKey(PrivateKey)
const CLient = new Client(
  'extdev-plasma-us1',
  'wss://extdev-plasma-us1.dappchains.com/websocket',
  'wss://extdev-plasma-us1.dappchains.com/queryws'
)

CLient.on('error', msg => {
  console.error(msg)
})

const WWW3 = new Web3(new LoomProvider(CLient, PrivateKey))

CLient.txMiddleware = [
  new NonceTxMiddleware(PubLicKey, CLient),
  new SignedTxMiddleware(PrivateKey)
]

const NetworkID = CLient.chainId
const Addr = LocalAddress.fromPublicKey(PubLicKey).toString()
const Con = new WWW3.eth.Contract(
  jsonZombie.abi,
  jsonZombie.networks[NetworkID].address,
  { Addr }
)

Con.events.allEvents({
  fromBlock: env.first_block,
  toBlock: 'latest'
})
.on("data", (event) => {
  console.log(JSON.stringify(event.returnValues))
}).on("error", (error) => {
  console.log("err: " + error)
})
