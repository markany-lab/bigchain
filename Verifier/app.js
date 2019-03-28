var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');
var app = express();
var Utils = require('ethereumjs-util');
var Web3 = require('web3');
var jsonBChannel = require('../TruffLeBToken/build/contracts/BChannel.json')
var Nacl = require('tweetnacl')
var fs = require('fs')
var Log4JS = require('log4js')
var Logger = Log4JS.getLogger('Verifier')
Logger.level = 'debug'

const {
  Client,
  LocalAddress,
  LoomProvider,
  CryptoUtils,
} = require('loom-js/dist')

const PrivateKey = CryptoUtils.B64ToUint8Array('iCiGlOSClr3ZuZjFHVN/ia+weW7Rxg/QBsNlLyv2WO8fGa+24uMV1FeVe3GJI5uB3PQaPfbVQtd64qRI5j/oLg==')
const PubLicKey = CryptoUtils.publicKeyFromPrivateKey(PrivateKey)

const CLient = new Client(
  'extdev-plasma-us1',
  'wss://extdev-plasma-us1.dappchains.com/websocket',
  'wss://extdev-plasma-us1.dappchains.com/queryws'
)
const WWW3 = new Web3(new LoomProvider(CLient, PrivateKey))

const Addr = LocalAddress.fromPublicKey(PubLicKey).toString()
const NetworkID = Object.keys(jsonBChannel.networks)[0]
const BChannelCon = new WWW3.eth.Contract(
  jsonBChannel.abi,
  jsonBChannel.networks[NetworkID].address, {
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
let channelManagerReady = 1

if (!fs.existsSync(channelManagerPath)) {
  fs.writeFileSync(channelManagerPath, JSON.stringify({
    open: [],
    off: []
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
    Logger.error("# verification failed: ")
    Logger.error(" - receiver: " + receiver.toLowerCase())
    Logger.error(" - pub_key owner: " + publicKeyOwner.toLowerCase())
    return { code: -1, err: "you are not receiver" }
  }
  return { code: 1, msg, channelInfo: oTokenInfo }
}

async function aggregateReceipt(msg) {
  const sender = msg.sender.toLowerCase()
  const channelPath = aggregatePath + msg.channel_id + '/'
  if (!fs.existsSync(channelPath)) {
    fs.mkdirSync(channelPath)
  }

  const timestamp = Date.now()
  const managerPath = channelPath + 'aggregate_manager.json'
  const fileName = channelPath + sender + '_' + timestamp + '.json'
  var channelManager = JSON.parse(fs.readFileSync(channelManagerPath, 'utf8'))
  if (!fs.existsSync(managerPath)) {
    channelManager.open.push(msg.channel_id)
    fs.writeFileSync(channelManagerPath, JSON.stringify(channelManager))
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
  return { code: 1 }
}

app.post('/get_receipt', async function (req, res) {
  try {
    const verifySign = await verifySignature(req.body.sign, req.body.public_key)
    if (verifySign.code == -1) {
      Logger.error("verify signature failed: " + verifySign.err)
      res.json(verifySign)
      return
    } else {
      Logger.debug("verify signatrue succeed")
    }

    const aggregate = await aggregateReceipt(verifySign.msg, verifySign.channelInfo)
    if (aggregate.code == -1) {
      Logger.error("aggregate failed: " + aggregate.err)
      res.json(aggregate)
      return
    } else {
      Logger.debug("aggregate succeed")
    }

    res.json({ code: "1", msg: "aggregate complete" })
  } catch (err) {
    Logger.error("error occured: " + err)
    res.json({ code: "-1", err: "internal error" })
  }
})

async function manageChannel() {
  if (!channelManagerReady) {
    Logger.debug("channelManager in progress")
    return
  }
  channelManagerReady = 0
  try {
    const channelManager = JSON.parse(fs.readFileSync(channelManagerPath, 'utf8'))
    let open = channelManager.open
    let off = channelManager.off

    for (var i = 0; i < open.length; i++) {
      const channelInfo = await BChannelCon.methods.getOTokenDetails(open[i]).call({ from: Addr })
      const numOfChunks = channelInfo.numOfChunks
      const aggregateManager = JSON.parse(fs.readFileSync(aggregatePath + open[i] + '/aggregate_manager.json'))
      const senders = Object.keys(aggregateManager)

      var count = 0
      var countArr = []
      for (var j = 0; j < senders.length; j++) {
        const latestReceipt = JSON.parse(fs.readFileSync(aggregatePath + open[i] + '/' + senders[i] + '_' + aggregateManager[senders[i]] + '.json'))
        count += latestReceipt.count
        countArr.push(latestReceipt.count * (100 / numOfChunks))
      }

      Logger.debug("timeout: " + channelInfo.leftTime)

      if (count == numOfChunks || channelInfo.leftTime <= 0) {
        Logger.debug("sending contents complete")
        Logger.debug("off-chain close...")
        var receipt = await BChannelCon.methods.channelOff(open[i]).send({ from: Addr })
        Logger.debug("channel off receipt: " + JSON.stringify(receipt))
        Logger.debug("settle...")
        receipt = await BChannelCon.methods.settleChannel(open[i], senders, countArr).send({ from: Addr })
        Logger.debug("settle receipt: " + JSON.stringify(receipt))
        off.push(open[i])
        open.splice(i, i + 1)
        fs.writeFileSync(channelManagerPath, JSON.stringify({open, off}))
      }
    }
    channelManagerReady = 1
  } catch (err) {
    Logger.error("error occured: " + err)
    channelManagerReady = 1
  }
}

setInterval(manageChannel, 2000)

app.listen(3003, () => {
  Logger.debug('Example app listening on port 3003!');
});
