const Web3 = require('web3');
const jsonBToken = require('../../TruffLeBToken/build/contracts/BToken.json');
const fs = require('fs')
var Log4JS = require('log4js')
var Logger = Log4JS.getLogger('Listener')
Logger.level = 'debug'


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
  Logger.error(msg)
})

const WWW3 = new Web3(new LoomProvider(CLient, PrivateKey))

CLient.txMiddleware = [
  new NonceTxMiddleware(PubLicKey, CLient),
  new SignedTxMiddleware(PrivateKey)
]

const NetworkID = Object.keys(jsonBToken.networks)[0]
const Addr = LocalAddress.fromPublicKey(PubLicKey).toString()
const Con = new WWW3.eth.Contract(
  jsonBToken.abi,
  jsonBToken.networks[NetworkID].address, {
    Addr
  }
)

var checkLengthFlag = true

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function readEnv() {
  return JSON.parse(fs.readFileSync('./.env.json', 'utf8'))
}

async function writeEnv(obj) {
  fs.writeFileSync('./.env.json', JSON.stringify(obj), 'utf8')
}

var cidLength = 0
var hashLength = 0
var pTokenIdLength = 0

async function getLengthes() {
  if (!checkLengthFlag) return
  checkLengthFlag = false
  const lengthes = await Con.methods.getElementLength().call({
    from: Addr
  })
  cidLength = lengthes.cidLength
  hashLength = lengthes.hashLength
  pTokenIdLength = lengthes.pTokenIdLength
  // Logger.debug("lengthes: " + cidLength + " / " + hashLength + " / " + pTokenIdLength)
  checkLengthFlag = true
}
setInterval(getLengthes, 5000)

async function crawlingData() {
  while (true) {
    let env = await readEnv()
    var cidStart = env.last_cid === '' ? 0 : env.last_cid * 1 + 1
    var hashStart = env.last_hash === '' ? 0 : env.last_hash * 1 + 1
    var pTokenStart = env.last_product === '' ? 0 : env.last_product * 1 + 1
    // Logger.debug("starts: " + cidStart + " / " + hashStart + " / " + pTokenStart)

    if (cidLength > cidStart) {
      checkLengthFlag = false
      for (var i = cidStart; i < cidLength; i++) {
        Logger.debug("crawling target data: " + i)
        let info = await Con.methods._Ds(i).call({
          from: Addr
        })
        console.log({
          owner: info._Owner,
          title: info._TitLe
        })
        env.last_cid = i
        writeEnv(env)
      }
    }

    if (hashLength > hashStart) {
      checkLengthFlag = false
      for (var i = hashStart; i < hashLength; i++) {
        let hash = await Con.methods._Hs(i).call({
          from: Addr
        })
        Logger.debug("crawling target hash: " + hash)
        let info = await Con.methods.Hash2Contents(hash).call({
          from: Addr
        })
        console.log({
          hash,
          cid: info._Cid,
          fee: info._Fee,
        })
        env.last_hash = i
        writeEnv(env)
      }
    }

    if (pTokenIdLength > pTokenStart) {
      checkLengthFlag = false
      for (var i = pTokenStart; i < pTokenIdLength; i++) {
        Logger.debug("crawling target pTokenId: " + i)
        let info = await Con.methods._PTs(i).call({
          from: Addr
        })
        console.log({
          owner: info._Owner,
          hash: info._Hash,
          price: info._Price
        })
        env.last_product = i
        writeEnv(env)
      }
    }

    checkLengthFlag = true
    await sleep(5000)
  }
}

getLengthes()
crawlingData()
