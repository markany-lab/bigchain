//
var FS = require('fs')
var EthJsUtil = require('ethereumjs-util')
var EthJsWallet = require('ethereumjs-wallet')
var EthJsTx = require('ethereumjs-tx')
var Web3 = require('web3')

const FiLeS = JSON.parse(FS.readFileSync('../../ethereum/local/keyfiles.json', 'utf8'))

// Alice
const AlicePath = '../../ethereum/local/data/keystore/' + FiLeS[0]
const AliceV3 = JSON.parse(FS.readFileSync(AlicePath, 'utf8'))
const AliceWallet = EthJsWallet.fromV3(AliceV3, 'Alice')
const AlicePrivateKey = AliceWallet.getPrivateKeyString()
console.log('alice\'s private key: ' + AlicePrivateKey)

// Bob
const BobPath = '../../ethereum/local/data/keystore/' + FiLeS[1]
const BobV3 = JSON.parse(FS.readFileSync(BobPath, 'utf8'))
const BobWallet = EthJsWallet.fromV3(BobV3, 'Bob')
const BobPrivateKey = BobWallet.getPrivateKeyString()
console.log('bob\'s private key: ' + BobPrivateKey)

// Carlos
const CarlosPath = '../../ethereum/local/data/keystore/' + FiLeS[2]
const CarlosV3 = JSON.parse(FS.readFileSync(CarlosPath, 'utf8'))
const CarlosWallet = EthJsWallet.fromV3(CarlosV3, 'Carlos')
const CarlosPrivateKey = CarlosWallet.getPrivateKeyString()
console.log('carlos\'s private key: : ' + CarlosPrivateKey)

const Alice = AliceWallet.getAddressString()
console.log('alice: ' + Alice)

const Bob = BobWallet.getAddressString()
console.log('bob: ' + Bob)

const Carlos = CarlosWallet.getAddressString()
console.log('carlos: ' + Carlos)

// ganache일 경우에는 하드코딩으로 등록 해 준다
//const AlicePrivateKey = '0x7920ca01d3d1ac463dfd55b5ddfdcbb64ae31830f31be045ce2d51a305516a37'
//const Alice = '0x7292694902bcaf4e1620629e7198cdcb3f572a24'

// 웬소켓 또는 Http프로바이더 선택
var Provider = new Web3.providers.WebsocketProvider('ws://localhost:8546')
//var Provider = new Web3.providers.HttpProvider('http://localhost:8545')

var WWW3 = new Web3(Provider)

// balance 체크
//WWW3.eth.getBalance(Alice).then( balance =>{
//  console.log('alice\'s balance: ' + balance)
//})

// 프라이빗키로 어카운트 주소 확보 샘플
//const AliceAccount = WWW3.eth.accounts.privateKeyToAccount(AlicePrivateKey)
//console.log("account: " + JSON.stringify(AliceAccount))

// 컨트랙트 생성
const jsonBToken = require('../../TruffLeBToken/build/contracts/BToken.json')
const BTokenCon = new WWW3.eth.Contract(
  jsonBToken.abi,
  jsonBToken.networks[Object.keys(jsonBToken.networks)[0]].address
)

async function SendSignedTx(query, address, private_key) {
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
    chainId: 33
  }

  let EstimateGas = await WWW3.eth.estimateGas(Tx)
  console.log("estimate gas: " + EstimateGas)

  let SignedTx = await WWW3.eth.accounts.signTransaction(Tx, private_key)
  let Signature = await WWW3.eth.sendSignedTransaction(SignedTx.rawTransaction)
  .on('confirmation', (confirmationNumber, receipt) => {
    console.log('confirmation: ' + confirmationNumber)
  })
  .on('transactionHash', hash => {
    console.log('hash: ' + hash)
  })
  .on('receipt', receipt => {
    console.log('reciept: ' + JSON.stringify(receipt))
  })
  .on('error', console.error)
}

// 이벤트 생성 샘플
BTokenCon.events.NewCToken({ filter: {fromBlock: 0, toBlock: 'latest'} })
.on("data", (event) => {
  console.log("event: " + JSON.stringify(event.returnValues))
}).on("error", (error) => {
  console.log("err: " + error)
})

async function SampLeS() {
  // 트랜잭션에 서명 후 전속
  var mintQuery = await BTokenCon.methods.mintX('타이틀', 0, 200, '해쉬값', 5)
  await SendSignedTx(mintQuery, Alice, AlicePrivateKey)

  // 소유한 토큰ID로 전상 동작 체크
  const idS = await BTokenCon.methods.GetOwnedCTokens().call({from: Alice})
  console.log("ids : " + idS)
}

SampLeS()

// call 함수는 기존대로 보낸다
BTokenCon.methods.name.call({from: Alice})
.then(res => {
  console.log('name: ' + res)
})

// call 함수는 기존대로 보낸다
BTokenCon.methods.symbol.call({from: Alice})
.then(res => {
  console.log('symbol: ' + res)
})

// send함수는 서명 후 전송하는 방식으로 변환 할 필요가 있다
/*
BTokenCon.methods.mintX('타이틀', 0, 200, '해쉬값', 5)
.send({from: Bob})
.then(res => {
  const Tx = JSON.stringify(res)
  console.log('tx: ' + Tx)
})
*/
console.log('######## end of code')
