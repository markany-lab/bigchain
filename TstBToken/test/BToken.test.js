const {
  assertEventVar,
  printEventVar,
  expectThrow,
} = require('./helpers')
const {
  BN
} = web3.utils
const bnChai = require('bn-chai')
const web3Utils = require('web3-utils')
const ethUtil = require('ethereumjs-util')


require('chai')
  .use(require('chai-as-promised'))
  .use(bnChai(BN))
  .should()

const BToken = artifacts.require('./BToken.sol')
const BChannel = artifacts.require('./BChannel.sol')

Number.prototype.pad = function(size) {
  var s = String(this)
  while (s.length < (size || 2)) {
    s = "0" + s;
  }
  return s
}

contract('BToken', accounts => {
  var Ct
  const [alice, bob, carlos] = accounts

  before(async () => {
    let block =

    Ct = await BChannel.new({
      from: carlos,
    })

    Ct.setConfig('100000000000', '86400', {from: carlos})

    const Owner = await Ct.owner.call({
      from: carlos
    })
    console.log('contract owner: ' + Owner)
    Owner.should.be.equal(carlos)
  })

  const TitLeTest = '***Test'
  it(TitLeTest, async () => {
    console.log(TitLeTest)

    await Ct.requestEnroll(1, {from: carlos})
    await Ct.requestEnroll(2, {from: bob})
    await Ct.requestEnroll(8, {from: alice})
    // await Ct.requestEnroll(3, {from: bob})

    let nextIndex = await Ct.getNextIndex.call({from: carlos})
    let requestLength = await Ct.getRequestLength.call({from: carlos})
    console.log("nextIndex: " + nextIndex)
    console.log("requestLength: " + requestLength)

    for(i = nextIndex; i < requestLength; i++) {
      let details = await Ct.getRequestDetails.call(i, {from: carlos})
      console.log("details: " + JSON.stringify(details))
    }

    let approve = [true, true, true]
    await Ct.approveRole(approve, {from: carlos})

    let verify = await Ct.verifyRole.call(carlos, 1)
    console.log("verify_0 : " + verify)
    verify = await Ct.verifyRole.call(bob, 2)
    console.log("verify_1 : " + verify)
    verify = await Ct.verifyRole.call(alice, 8)
    console.log("verify_1 : " + verify)

    await Ct.cleanupRequest({from: carlos})
    nextIndex = await Ct.getNextIndex.call({from: carlos})
    requestLength = await Ct.getRequestLength.call({from: carlos})
    console.log("nextIndex: " + nextIndex)
    console.log("requestLength: " + requestLength)

    await Ct.registData(bob, 0, "bob0v1.3", "v1.3", "movie", "commercial", "avengers", "'{filePath1: aaa, filePath2: bbb}'", {from: carlos})
    let dataList = await Ct.getDataList.call({from: bob})
    console.log("dataList: " + dataList)

    let dataDetails = await Ct.getDataDetails.call(dataList[0], {from: bob})
    console.log("dataDetails: " + JSON.stringify(dataDetails))

    await Ct.registFileFee("bob0v1.3", "v1.3", "/contents/movie", 50000, 14336, {from: bob})
    let fileFee = await Ct.getFileFee.call("bob0v1.3", "v1.3", "/contents/movie")
    console.log("file fee: " + fileFee)

    await Ct.registProduct("bob0v1.3", "v1.3", "/contents/movie", 500000, {from: alice})
    let productList = await Ct.getProductList.call({from: alice})
    console.log("product list: " + productList)

    let productDetails = await Ct.getProductDetails.call(productList[0])
    console.log("product details: " + JSON.stringify(productDetails))

    let balance1 = await web3.eth.getBalance(alice)
    let balance2 = await web3.eth.getBalance(bob)
    let balance3 = await web3.eth.getBalance(carlos)

    console.log(balance1)
    console.log(balance2)
    console.log(balance3)

    await Ct.buyProduct(productList[0], {
      from: carlos,
      value: productDetails.price
    })

    balance1 = await web3.eth.getBalance(alice)
    balance2 = await web3.eth.getBalance(bob)
    balance3 = await web3.eth.getBalance(carlos)

    console.log(balance1)
    console.log(balance2)
    console.log(balance3)

    let tokenList = await Ct.getTokenList.call({from: carlos})
    console.log("token list: " + tokenList)

    let tokenDetails = await Ct.getTokenDetails.call(tokenList[0], {from: carlos})
    console.log("token details: " + JSON.stringify(tokenDetails))

    let deposit = await Ct.getDepositAmount(tokenList[0])
    console.log("deposit: " + deposit)

    let tx = await Ct.channelOpen(tokenList[0], {
      from: carlos,
      value: deposit
    })
    let evt = tx.logs.find(log => log.event === 'NewID')
    let channelId = evt.args['Id']
    console.log("channel id: " + channelId)

    balance1 = await web3.eth.getBalance(alice)
    balance2 = await web3.eth.getBalance(bob)
    balance3 = await web3.eth.getBalance(carlos)

    console.log(balance1)
    console.log(balance2)
    console.log(balance3)

    let channelState = ['invalid', 'open', 'off', 'settle']
    let channelDetails = await Ct.getChannelDetails.call(channelId)
    console.log("channel Details: " + JSON.stringify(channelDetails))
    console.log("channel state: " + channelState[channelDetails.state])

    await Ct.channelOff(channelId, {from: carlos})
    channelDetails = await Ct.getChannelDetails.call(channelId)
    console.log("channel Details: " + JSON.stringify(channelDetails))
    console.log("channel state: " + channelState[channelDetails.state])

    await Ct.settleChannel(channelId, [alice, bob], [7000, 7336], {from: carlos})
    channelDetails = await Ct.getChannelDetails.call(channelId)
    console.log("channel Details: " + JSON.stringify(channelDetails))
    console.log("channel state: " + channelState[channelDetails.state])

    balance1 = await web3.eth.getBalance(alice)
    balance2 = await web3.eth.getBalance(bob)
    balance3 = await web3.eth.getBalance(carlos)

    console.log(balance1)
    console.log(balance2)
    console.log(balance3)
  })
})
