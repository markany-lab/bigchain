const {
  readdirSync,
  readFileSync
} = require('fs')

var ethJsWaLLet = require('ethereumjs-wallet')
var Web3 = require('web3')

// Http 프로바이더 선택
var Provider = new Web3.providers.HttpProvider('http://localhost:8545')
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
  const FiLeS = JSON.parse(readFileSync('../../geth/keyfiles.json', 'utf8'))

  // Alice
  const AlicePath = '../../geth/data/keystore/' + FiLeS[0]
  const AliceV3 = JSON.parse(readFileSync(AlicePath, 'utf8'))
  const AliceWallet = ethJsWaLLet.fromV3(AliceV3, 'Alice')
  const AlicePrivateKey = AliceWallet.getPrivateKeyString()
  console.log('alice\'s private key: ' + AlicePrivateKey)

  // Bob
  const BobPath = '../../geth/data/keystore/' + FiLeS[1]
  const BobV3 = JSON.parse(readFileSync(BobPath, 'utf8'))
  const BobWallet = ethJsWaLLet.fromV3(BobV3, 'Bob')
  const BobPrivateKey = BobWallet.getPrivateKeyString()
  console.log('bob\'s private key: ' + BobPrivateKey)

  // Carlos
  const CarlosPath = '../../geth/data/keystore/' + FiLeS[2]
  const CarlosV3 = JSON.parse(readFileSync(CarlosPath, 'utf8'))
  const CarlosWallet = ethJsWaLLet.fromV3(CarlosV3, 'Carlos')
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

  // balance 체크
  WWW3.eth.getBalance(Alice).then( balance =>{
    console.log('alice\'s balance: ' + balance)
  })

  // 트랜잭션에 서명 후 전속
  var Query = await BTokenCon.methods.registerData('타이틀')
  await SendSignedTx(Query, Alice, AlicePrivateKey)
}

main()
.then(()=>{
  console.log('######## end of code')
  process.exit(0)
})
