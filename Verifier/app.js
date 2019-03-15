const express = require('express');
var cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const Utils = require('ethereumjs-util');
const Web3 = require('web3');
const jsonBToken = require('../TruffLeBToken/build/contracts/BToken.json')
const axios = require('axios')

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
const WWW3 = new Web3(new LoomProvider(CLient, PrivateKey))

const Addr = LocalAddress.fromPublicKey(PubLicKey).toString()
const BTokenCon = new WWW3.eth.Contract(
  jsonBToken.abi,
  jsonBToken.networks[CLient.chainId].address, {
    Addr
  }
)

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));


app.post('/get_receipt', async function(req, res) {
  const msg = req.body.msg
  const sign = req.body.sign

  try {
  const oTokenId = msg.channel_id
  const flag = await BTokenCon.methods.existsO(oTokenId).call({from:Addr})
  if (!flag) {
    res.json({ code: "-1", err: "off-chain channel does not exist" })
    return
  }

  const receiver = msg.receiver
  await axios({
    method: 'post',
    url: 'http://127.0.0.1:3000/query_pub_key',
    // url: env.key_server_ip + ':' + env.key_server_port + '/query_pub_key',
    data: {receiver}
  })
  .then(await function(res) {
    console.log(res.data)
  })
  // const oTokenInfo = await BTokenCon.methods.getOTokenDetails(oTokenId).call({from:Addr})
  // console.log(JSON.stringify(oTokenInfo))

  // const sender = msg.sender

  // const MsgHash = Utils.keccak256(Buffer.from(JSON.stringify(msg)))
  // const { v, r, s } = Utils.fromRpcSig(sign)
  // const addr = Utils.bufferToHex(Utils.pubToAddress(Utils.ecrecover(MsgHash, v, r, s)))
  // console.log("addr: " + addr)


  res.json({ code: "1" })
} catch (err) {
  console.log("error occured: " + err)
  res.json({code: "-1", err: "internal error"})
}
})

app.listen(3003, () => {
  console.log('Example app listening on port 3003!');
});