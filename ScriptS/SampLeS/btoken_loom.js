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

const LoomPrivateKey = CryptoUtils.generatePrivateKey()
const LoomPubLicKey = CryptoUtils.publicKeyFromPrivateKey(LoomPrivateKey)
console.log('private key: 0x' + toHexString(LoomPrivateKey))
console.log('public key: 0x' + toHexString(LoomPubLicKey))

const CLient = new Client(
  'default',
  'ws://127.0.0.1:46658/websocket',
  'ws://127.0.0.1:46658/queryws'
)

CLient.on('error', err=>{
  console.log('>>> error: ' + JSON.stringify(err))
})

const WWW3 = new Web3(new LoomProvider(CLient, LoomPrivateKey))

CLient.txMiddleware = [
  new NonceTxMiddleware(LoomPubLicKey, CLient),
  new SignedTxMiddleware(LoomPrivateKey)
]

const jsonBToken = require('../../TruffLeBToken/build/contracts/BToken.json')
const BTokenCon = new WWW3.eth.Contract(
  jsonBToken.abi,
  jsonBToken.networks[Object.keys(jsonBToken.networks)[0]].address
)

async function main(){
  const LoomAddress = LocalAddress.fromPublicKey(LoomPubLicKey).toString()

  // balance 체크
  WWW3.eth.getBalance(LoomAddress).then( balance =>{
    console.log('loom\'s balance: ' + balance)
  })

  // 이벤트 생성 샘플
  BTokenCon.events.NewData({ filter: {fromBlock: 0, toBlock: 'latest'} })
  .on("data", (event)=>{
    const Event = event.returnValues
    console.log('event: ' + JSON.stringify(Event))
    const CiD = Event.cid
    console.log('cid: ' + CiD)

    BTokenCon.methods._Ds(CiD).call({from: LoomAddress})
    .then((title)=>{
      console.log('title: ' + title)
    })
  }).on("error", (error)=>{
    console.log("err: " + error)
  })

  await BTokenCon.methods.registerData('타이틀')
  .send({from: LoomAddress})
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
