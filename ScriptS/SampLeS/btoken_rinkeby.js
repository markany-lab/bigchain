//
var FS = require('fs')
var EthJsUtil = require('ethereumjs-util')
var EthJsWallet = require('ethereumjs-wallet')
var EthJsTx = require('ethereumjs-tx')
var Web3 = require('web3')

// Alice
const AlicePath = '../../TruffLeBToken/rinkeby_private.key'
const AlicePrivateKey = FS.readFileSync(AlicePath, 'utf8')
console.log('alice\'s private key: ' + AlicePrivateKey)

const ApiToken = FS.readFileSync('../../TruffLeBToken/rinkeby_api.token', 'utf8')
console.log('api token: ' + ApiToken)

//var Provider = new Web3.providers.HttpProvider('https://rinkeby.infura.io/' + ApiToken)
var Provider = new Web3.providers.WebsocketProvider('wss://rinkeby.infura.io/ws')
var WWW3 = new Web3(Provider)
const AliceAccount = WWW3.eth.accounts.privateKeyToAccount(AlicePrivateKey)
console.log("alice account: " + JSON.stringify(AliceAccount))

const Alice = AliceAccount.address
console.log("alice: " + JSON.stringify(Alice))

// balance 체크
WWW3.eth.getBalance(Alice).then( balance =>{
  console.log('alice\'s balance: ' + balance)
})

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
    chainId: Object.keys(jsonBToken.networks)[0]
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
// BTokenCon.methods.mintX('타이틀', 0, 200, '해쉬값', 5)
// .send({from: Alice})
// .then(res => {
//   const Tx = JSON.stringify(res)
//   console.log('tx: ' + Tx)
// })

console.log('######## end of code')
