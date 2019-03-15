var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');
var app = express();
var Utils = require('ethereumjs-util');
var Web3 = require('web3');
var jsonBChannel = require('../TruffLeBToken/build/contracts/BChannel.json')
var Nacl = require('tweetnacl')
var fs = require('fs')

const {
  Client,
  LocalAddress,
  LoomProvider,
  CryptoUtils,
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
const BChannelCon = new WWW3.eth.Contract(
  jsonBChannel.abi,
  jsonBChannel.networks[CLient.chainId].address, {
    Addr
  }
)

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

const aggregatePath = './aggregate/'
const channelManagerPath = aggregatePath + 'channel_manager.json'

if(!fs.existsSync(channelManagerPath)) {
  fs.writeFileSync(channelManagerPath, JSON.stringify({
    open:[],
    off:[]
  }))
}

async function verifySignature(signB64, publicKeyB64) {
  const sign = CryptoUtils.B64ToUint8Array(signB64)
  const publicKey = CryptoUtils.B64ToUint8Array(publicKeyB64)
  const msgBytes = Nacl.sign.open(sign, publicKey)
  const msg = JSON.parse(Buffer.from(msgBytes.buffer, msgBytes.byteOffset, msgBytes.byteLength).toString())

  const flag = await BChannelCon.methods.existsO(msg.channel_id).call({ from: Addr })
  if (!flag) {
    return { code: -1, err: "off-chain channel does not exist" }
  }

  const oTokenInfo = await BChannelCon.methods.getOTokenDetails(msg.channel_id).call({ from: Addr })
  const receiver = oTokenInfo.orderer
  const publicKeyOwner = LocalAddress.fromPublicKey(publicKey).toString()

  if (receiver.toLowerCase() != publicKeyOwner.toLowerCase()) {
    return { code: -1, err: "you are not receiver" }
  }
  return { code: 1, msg, channelInfo: oTokenInfo }
}

async function aggregateReceipt(msg, channelInfo) {
  const sender = msg.sender.toLowerCase()
  const channelPath = aggregatePath + msg.channel_id + '/'
  if (!fs.existsSync(channelPath)) {
    fs.mkdirSync(channelPath)
  }

  const timestamp = Date.now()
  const managerPath = channelPath + 'aggregate_manager.json'
  const fileName = channelPath + sender + '_' + timestamp + '.json'
  if (!fs.existsSync(managerPath)) {
    var manager = new Object
    fs.writeFileSync(fileName, JSON.stringify(msg))
    manager[sender] = timestamp
    fs.writeFileSync(managerPath, JSON.stringify(manager))
  } else {
    var manager = JSON.parse(fs.readFileSync(managerPath, 'utf8'))
    var senders = Object.keys(manager)
    if (senders.indexOf(sender) == -1) {
      fs.writeFileSync(fileName, JSON.stringify(msg))
      manager[sender] = timestamp
      fs.writeFileSync(managerPath, JSON.stringify(manager))
    } else {
      var priorFile = JSON.parse(fs.readFileSync(channelPath + sender + '_' + manager[sender] + '.json', 'utf8'))
      if (priorFile.count < msg.count) {
        fs.writeFileSync(fileName, JSON.stringify(msg))
        manager[sender] = timestamp
        fs.writeFileSync(managerPath, JSON.stringify(manager))
      } else {
        return { code: -1, err: "prior receipt is latest" }
      }
    }
  }
  return {code: 1}
}

app.post('/get_receipt', async function (req, res) {
  try {
    const verifySign = await verifySignature(req.body.sign, req.body.public_key)
    if (verifySign.code == -1) {
      console.log("verify signature failed: " + verifySign.err)
      res.json(verifySign)
      return
    } else {
      console.log("verify signatrue succeed")
    }

    const aggregate = await aggregateReceipt(verifySign.msg, verifySign.channelInfo)
    if(aggregate.code == -1) {
      console.log("aggregate failed: " + aggregate.err)
      res.json(aggregate)
      return
    } else {
      console.log("aggregate succeed")
    }

    res.json({ code: "1", msg: "aggregate complete" })
  } catch (err) {
    console.log("error occured: " + err)
    res.json({ code: "-1", err: "internal error" })
  }
})

async function manage_channels() {


}

app.listen(3003, () => {
  console.log('Example app listening on port 3003!');
});