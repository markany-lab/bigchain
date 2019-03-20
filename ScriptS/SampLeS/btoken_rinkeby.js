const {
  readdirSync,
  readFileSync
} = require('fs')

const { join } = require('path')
const readLine = require('readline')

var ethWaLLet = require('ethereumjs-wallet')
var Web3 = require('web3')

// 웬소켓 프로바이더 선택
var Provider = new Web3.providers.WebsocketProvider('wss://rinkeby.infura.io/ws')
var WWW3 = new Web3(Provider)

// 컨트랙트 생성
const jsonBToken = require('../../TruffLeBToken/build/contracts/BToken.json')
const BTokenCon = new WWW3.eth.Contract(
  jsonBToken.abi,
  jsonBToken.networks[Object.keys(jsonBToken.networks)[0]].address
)

async function SendSignedTx(query, address, private_key){
  let EncodedABI = query.encodeABI()
  let Nonce = '0x' + (await WWW3.eth.getTransactionCount(address)).toString(16)
  console.log("nonce: " + Nonce)

  let Tx = {
    nonce: Nonce,
    gasPrice: 15000000001,
    gasLimit: 2000000,
    from: address,
    to: jsonBToken.networks[Object.keys(jsonBToken.networks)[0]].address,
    value: '0x0',
    data: EncodedABI,
    chainId: Object.keys(jsonBToken.networks)[0]
  }

  let EstimateGas = await WWW3.eth.estimateGas(Tx)
  console.log("estimate gas: " + EstimateGas)

  let SignedTx = await WWW3.eth.accounts.signTransaction(Tx, private_key)
  let Signature = await WWW3.eth.sendSignedTransaction(SignedTx.rawTransaction)
  .on('confirmation', (confirmationNumber, receipt)=>{
    console.log('confirmation: ' + confirmationNumber)
  })
  .on('transactionHash', hash=>{
    console.log('hash: ' + hash)
  })
  .on('receipt', receipt=>{
    console.log('reciept: ' + JSON.stringify(receipt))
  })
  .on('error', console.log)
}

async function main(){
  var KeystorePath = join(__dirname, './keystore/')
  var FiLeS = readdirSync(KeystorePath)
  FiLeS = FiLeS.filter(element=>!(element.indexOf('UTC')))
  if(FiLeS.length == 0){
    console.log('not found any account, please use the impoet cold wallet command first: node ./cold_wallet_import.js')
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

  var WaLLet = ethWaLLet.fromV3(V3, Password)
  const RinkebyPrivateKey = WaLLet.getPrivateKeyString()
  console.log('rinkeby\'s private key: ' + RinkebyPrivateKey)

  const RinkebyAccount = WWW3.eth.accounts.privateKeyToAccount(RinkebyPrivateKey)
  console.log("rinkeby\'s account: " + JSON.stringify(RinkebyAccount))

  const RinkebyAddress = RinkebyAccount.address
  console.log("rinkeby\'s address: " + JSON.stringify(RinkebyAddress))

  // balance 체크
  WWW3.eth.getBalance(RinkebyAddress).then( balance =>{
    console.log('rinkeby\'s balance: ' + balance)
  })

  // 이벤트 생성 샘플
  BTokenCon.events.NewData({ filter: {fromBlock: 0, toBlock: 'latest'} })
  .on("data", (event)=>{
    const Event = event.returnValues
    console.log('event: ' + JSON.stringify(Event))
    const CiD = Event.cid
    console.log('cid: ' + CiD)

    BTokenCon.methods._Ds(CiD).call({from: RinkebyAddress})
    .then((title)=>{
      console.log('title: ' + title)
    })
  }).on("error", (error)=>{
    console.log("err: " + error)
  })

  // 트랜잭션에 서명 후 전속
  var Query = await BTokenCon.methods.registerData('타이틀')
  await SendSignedTx(Query, RinkebyAddress, RinkebyPrivateKey)
}

main()
.then(()=>{
  console.log('######## end of code')
  //process.exit()
})
