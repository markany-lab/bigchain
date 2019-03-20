const Web3 = require('web3')

const {
  NonceTxMiddleware,
  SignedTxMiddleware,
  Client,
  LocalAddress,
  LoomProvider,
  CryptoUtils
} = require('loom-js/dist')

function toHexString(bytes){
  return bytes.map(function(byte){
    return (byte & 0xFF).toString(16)
  }).join('')
}

const ExtdevPrivateKey = CryptoUtils.generatePrivateKey()
const ExtdevPubLicKey = CryptoUtils.publicKeyFromPrivateKey(ExtdevPrivateKey)
console.log('private key: ' + toHexString(ExtdevPrivateKey))
console.log('public key: ' + toHexString(ExtdevPubLicKey))

const CLient = new Client(
  'extdev-plasma-us1',
  'ws://extdev-plasma-us1.dappchains.com:80/websocket',
  'ws://extdev-plasma-us1.dappchains.com:80/queryws'
)

CLient.on('error', err=>{
  console.log('>>> error: ' + err)
})

const WWW3 = new Web3(new LoomProvider(CLient, ExtdevPrivateKey))

CLient.txMiddleware = [
  new NonceTxMiddleware(ExtdevPubLicKey, CLient),
  new SignedTxMiddleware(ExtdevPrivateKey)
]

const jsonBToken = require('../../TruffLeBToken/build/contracts/BToken.json')
const BTokenCon = new WWW3.eth.Contract(
  jsonBToken.abi,
  jsonBToken.networks[Object.keys(jsonBToken.networks)[0]].address
)

async function main(){
  const ExtdevAddress = LocalAddress.fromPublicKey(ExtdevPubLicKey).toString()

  // balance 체크
  WWW3.eth.getBalance(ExtdevAddress).then( balance =>{
    console.log('loom\'s balance: ' + balance)
  })

  // 이벤트 생성 샘플
  BTokenCon.events.NewData({ filter: {fromBlock: 0, toBlock: 'latest'} })
  .on("data", (event)=>{
    const Event = event.returnValues
    console.log('event: ' + JSON.stringify(Event))
    const CiD = Event.cid
    console.log('cid: ' + CiD)

    BTokenCon.methods._Ds(CiD).call({from: ExtdevAddress})
    .then((element)=>{
      console.log('element: ' + JSON.stringify(element))
    })
  }).on("error", (error)=>{
    console.log("err: " + error)
  })

  await BTokenCon.methods.registerData('타이틀')
  .send({from: ExtdevAddress})
  .then(res=>{
    const Tx = JSON.stringify(res)
    console.log('tx: ' + Tx)
  })
}

main()
.then(()=>{
  console.log('######## end of code')
  process.exit(0)
})
