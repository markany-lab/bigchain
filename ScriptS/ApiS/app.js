var Env = require('../../.env.json')
var Ether = require('./ether.js')
var Dapp = require('./dapp.js')
var Util = require('ethereumjs-util')
var Web3Util = require('web3-utils')
var Log4JS = require('log4js')
var Log4JSExtend = require('log4js-extend')
Log4JSExtend(Log4JS, {
  path: __dirname,
  format: "at @name (@file:@line:@column)"
})
var Logger = Log4JS.getLogger('API MAIN')
Logger.level = Env.log_level
var {
  CryptoUtils
} = require('loom-js')
var program = require('commander')
var crypto = require('crypto')

async function initTools(address, password) {
  /* init Ethereum elements */
  Logger.debug('init ethereum tools...')
  var EtherTools = await Ether.createAsync(address, password)
  Logger.debug('init complete')

  /* init Dappchain elements */
  Logger.debug('init dapp tools...')
  var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
  Logger.debug('init complete')
  return {
    EtherTools,
    DappTools
  }
}

const roles = ['P', 'CP', 'SP', 'D']
//------------------------------------------------------------ account apis -----------------------------------------------------------//
async function account_generate(password) {
  try {
    const address = await Ether.generateAccount(password)
    var Tools = await initTools(address[1], password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const mappingResult = await DappTools.SignAsync(EtherTools.getWallet())
    const result = {
      state: 'new',
      ethAddress: mappingResult.ethAddress,
      dappAddress: mappingResult.dappAddress
    }
    console.log(JSON.stringify(result))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function account_import(privateKey, password) {
  try {
    const address = await Ether.importAccount(privateKey, password)
    var Tools = await initTools(address[1], password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const state = address[0] ? "new" : "exists"
    const mappingResult = await DappTools.SignAsync(EtherTools.getWallet())
    const result = {
      state,
      ethAddress: mappingResult.ethAddress,
      dappAddress: mappingResult.dappAddress
    }
    console.log(JSON.stringify(result))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function account_export(address, password) {
  try {
    const privateKey = await Ether.exportAccount(address, password)
    console.log(JSON.stringify({
      privateKey
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function account_remove(address) {
  try {
    const state = await Ether.removeAccount(address)
    console.log(JSON.stringify({
      state
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function account_list() {
  const fileList = await Ether.listAccount()
  let accountList = []
  for (var i = 0; i < fileList.length; i++) {
    accountList.push(fileList[i].split('--')[2])
  }
  console.log(JSON.stringify({
    list: accountList
  }))
}

async function account_balance(address, password) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    /* basic information about both accounts */
    const ethAddress = EtherTools.getWallet().getAddressString()
    const ethBalance = await EtherTools.GetBaLanceAsync(ethAddress)
    const dappBalance = await DappTools.GetBaLanceAsync()
    console.log(JSON.stringify({
      ethAddress,
      ethBalance,
      dappBalance
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

//------------------------------------------------------------ gateway apis -----------------------------------------------------------//
async function send_ethereum(address, password, unit, amount) {
  try {
    var EtherTools = await Ether.createAsync(address, password)

    /* send ether from ethereum account to dapp account */
    var EthWeb3 = EtherTools.getWeb3()
    const ethAddress = EtherTools.getWallet().getAddressString()
    const balanceBefore = await EthWeb3.eth.getBalance(ethAddress)
    await EtherTools.Deposit2GatewayAsync(ethAddress, unit, amount)
    const balanceAfter = await EthWeb3.eth.getBalance(ethAddress)
    console.log(JSON.stringify({
      ethAddress,
      balanceBefore,
      balanceAfter
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function send_dappchain(address, password, unit, amount) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    /* send ether from dapp account to gateway */
    const balance = (await DappTools.GetBaLanceAsync()).toString()
    const sendAmount = Web3Util.toWei(amount, unit)
    if (balance < sendAmount) {
      console.log(JSON.stringify({
        error: 'insufficient balance'
      }))
      return
    }
    await DappTools.ApproveAsync(sendAmount)
    await DappTools.WithdrawEthAsync(sendAmount)
    console.log(JSON.stringify({
      send: sendAmount
    }))
  } catch (error) {
    if (error.message.indexOf('pending') > -1) {
      console.log(JSON.stringify({
        error: 'pending already exists'
      }))
    } else {
      console.log(JSON.stringify({
        error: error.message
      }))
      Logger.error('error occured: ' + error)
    }
  }
}

async function withdraw(address, password) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    /* get ether from gateway to ethereum account */
    const Account = DappTools.GetAccount()
    const Data = await DappTools.WithdrawaLReceiptAsync(Account)

    let EtherBaLance = 0
    if (Data) {
      switch (Data.tokenKind) {
        case 0:
          EtherBaLance = +Data.value.toString(10)
          break
      }
    }

    const Owner = Data.tokenOwner.local.toString()
    const Signature = CryptoUtils.bytesToHexAddr(Data.oracleSignature)
    await EtherTools.WithdrawEthAsync(Owner, EtherBaLance, Signature)
    console.log(JSON.stringify({
      withdraw: EtherBaLance
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------- msp ----------------------------------------------------------------//
async function requestEnroll(address, password, role) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    Logger.debug("request role...")
    const roleIndex = roles.indexOf(role)
    if (roleIndex == -1) {
      Logger.error('invalid role. choose P|CP|SP|D')
      return
    }
    await DappTools.requestEnroll(2 ** roleIndex)
    console.log(JSON.stringify({
      result: 'succeed'
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function requestDetails(address, password) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const details = await DappTools.getRequestDetails()
    console.log(JSON.stringify(details))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function requestApprove(address, password, approvals) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    var approvalArray = approvals.split(',')
    await DappTools.approveRole(approvals.split(','))
    console.log(JSON.stringify({
      result: 'succeed'
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function revokeRole(address, password, target, role) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const roleIndex = roles.indexOf(role)
    if (roleIndex == -1) {
      Logger.error('invalid role. choose P|CP|SP|D')
      return
    }
    await DappTools.revokeRole(target, 2 ** roleIndex)
    console.log(JSON.stringify({
      result: 'succeed'
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function verifyRole(address, password, target, role) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const roleIndex = roles.indexOf(role)
    if (roleIndex == -1) {
      Logger.error('invalid role. choose P|CP|SP|D')
      return
    }
    const verify = await DappTools.verifyRole(target, 2 ** roleIndex)
    console.log(JSON.stringify({
      verify
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function requestCleanup(address, password) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    await DappTools.requestCleanup()
    console.log(JSON.stringify({
      result: 'succeed'
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function prepareTest() {
  try {
    var ContractOwner = '1ee77618b9e4f7651381e2ede71b0d389f27a5c6'
    var ContentsPovider = '9bcecd9085fae8fa787ac3f3bd3c2f25a90e0610'
    var Distributor = 'c7cf04aa9a7a6d548e6d1dac8f7401f4a36ad32b'

    var Tools = []
    var EtherTools = []
    var DappTools = []
    Tools.push(await initTools(ContractOwner, 'p@ssw0rd'))
    Tools.push(await initTools(ContentsPovider, 'p@ssw0rd'))
    Tools.push(await initTools(Distributor, 'p@ssw0rd'))
    EtherTools.push(Tools[0].EtherTools)
    EtherTools.push(Tools[1].EtherTools)
    EtherTools.push(Tools[2].EtherTools)
    DappTools.push(Tools[0].DappTools)
    DappTools.push(Tools[1].DappTools)
    DappTools.push(Tools[2].DappTools)

    await DappTools[1].requestEnroll(2)
    await DappTools[2].requestEnroll(8)
    await DappTools[0].approveRole([true, true])
    const verifyCP = await DappTools[0].verifyRole(ContentsPovider, 2)
    const verifyD = await DappTools[0].verifyRole(Distributor, 8)
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

//-------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------- get cid --------------------------------------------------------------//
async function getCID(address, password) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const cid = await DappTools.getCID()
    console.log(JSON.stringify({
      cid
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------- invoke transaction ---------------------------------------------------------//
async function registData(address, password, cid, ccid, version, category, subCategory, title, fileDetails) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const dataId = await DappTools.registData(cid, ccid, version, category, subCategory, title, fileDetails)
    console.log(JSON.stringify({
      data_id: dataId
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function registFileFee(address, password, ccid, version, filePath, fee, chunks) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    await DappTools.registFileFee(ccid, version, filePath, fee, chunks)
    console.log(JSON.stringify({
      result: 'succeed'
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function registProduct(address, password, ccid, version, filePath, price) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const productId = await DappTools.registProduct(ccid, version, filePath, price)
    console.log(JSON.stringify({
      product_id: productId
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function buyToken(address, password, productId) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const tokenId = await DappTools.buyToken(productId)
    console.log(JSON.stringify({
      token_id: tokenId
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function channelOpen(address, password, tokenId) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const channelId = await DappTools.channelOpen(tokenId)
    console.log(JSON.stringify({
      channel_id: channelId
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function channelOff(address, password, channelId) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    await DappTools.channelOff(channelId)
    console.log(JSON.stringify({
      result: 'succeed'
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function channelSettle(address, password, channelId, senders, chunks) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    await DappTools.channelSettle(channelId, senders.split(','), chunks.split(','))
    console.log(JSON.stringify({
      result: 'succeed'
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

//-------------------------------------------------------------------------------------------------------------------------------------//

//--------------------------------------------------------------- list ----------------------------------------------------------------//
async function listData(address, password) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const list = await DappTools.getDataList()
    console.log(JSON.stringify({
      list
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function listProduct(address, password) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const list = await DappTools.getProductList()
    console.log(JSON.stringify({
      list
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function listToken(address, password) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const list = await DappTools.getTokenList()
    console.log(JSON.stringify({
      list
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------- details --------------------------------------------------------------//
async function detailsData(address, password, dataId) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    var details = {}
    const detailsInfo = await DappTools.getDataDetails(dataId)
    details.owner = detailsInfo[0]
    details.cid = detailsInfo[1]
    details.ccid = detailsInfo[2]
    details.version = detailsInfo[3]
    details.category = detailsInfo[4]
    details.subCategory = detailsInfo[5]
    details.title = detailsInfo[6]
    details.fileDetails = detailsInfo[7]
    console.log(JSON.stringify({
      details
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function fileFee(address, password, ccid, version, filePath) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const fee = await DappTools.getFileFee(ccid, version, filePath)
    console.log(JSON.stringify({
      fee
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function detailsProduct(address, password, productId) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    var details = {}
    const detailsInfo = await DappTools.getProductDetails(productId)
    details.owner = detailsInfo[0]
    details.ccid = detailsInfo[1]
    details.version = detailsInfo[2]
    details.filePath = detailsInfo[3]
    details.price = detailsInfo[4]
    console.log(JSON.stringify({
      details
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function detailsToken(address, password, tokenId) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    var details = {}
    var state = ['invalid', 'valid', 'in_progress']
    const detailsInfo = await DappTools.getTokenDetails(tokenId)
    details.owner = detailsInfo[0]
    details.productId = detailsInfo[1]
    details.state = state[detailsInfo[2]]
    console.log(JSON.stringify({
      details
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function depositAmount(address, password, tokenId) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const deposit = await DappTools.getDepositAmount(tokenId)
    console.log(JSON.stringify({
      deposit
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function detailsChannel(address, password, channelId) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    var details = {}
    var state = ['invalid', 'open', 'off', 'settle']
    const detailsInfo = await DappTools.getChannelDetails(channelId)
    details.receiver = detailsInfo[0]
    details.productId = detailsInfo[1]
    details.deposit = detailsInfo[2]
    details.timestamp = detailsInfo[3]
    details.leftTime = detailsInfo[4]
    details.state = state[detailsInfo[5]]
    console.log(JSON.stringify({
      details
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

//------------------------------------------------------------- sign apis -------------------------------------------------------------//
async function sign_receipt(address, password, msg) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const sign = await DappTools.signReceipt(msg)
    console.log(JSON.stringify(sign))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

async function verify_receipt(address, password, sign, pubKey) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const msg = await DappTools.verifyReceript(sign, pubKey)
    console.log(JSON.stringify({
      msg
    }))
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

//------------------------------------------------------------- commander -------------------------------------------------------------//
program
  .command('account')
  .option('-g, --generate', 'generate account')
  .option('-i, --import', 'import account')
  .option('-e, --export', 'export account')
  .option('-r, --remove', 'remove account')
  .option('-l, --list', 'list up account')
  .option('-b, --balance', 'balance info')
  .option('-d, --address <address>', 'address')
  .option('-p, --password <password>', 'account password')
  .option('-P, --privateKey <privateKey>', 'private key')
  .action(async function(options) {
    if (options.generate) {
      Logger.debug("account_generate() called")
      await account_generate(options.password)
    }
    if (options.import) {
      Logger.debug("account_import() called")
      await account_import(options.privateKey, options.password)
    }
    if (options.export) {
      Logger.debug("account_export() called")
      await account_export(options.address, options.password)
    }
    if (options.list) {
      Logger.debug("account_list() called")
      await account_list()
    }
    if (options.remove) {
      Logger.debug("account_remove() called")
      await account_remove(options.address)
    }
    if (options.balance) {
      Logger.debug("account_balance() called")
      await account_balance(options.address, options.password)
    }
    process.exit(0)
  })

program
  .command('send')
  .option('-e, --ethereum', 'send ether from ethereum to dappchain')
  .option('-d, --dappchain', 'send ether from dappchain to ethereum')
  .option('-w, --withdraw', 'withdraw from gateway')
  .option('-i, --address <address>', 'account address')
  .option('-p, --password <password>', 'account password')
  .option('-u, --unit <unit>', 'ethereum currency unit wei|ether')
  .option('-a, --amount <amount>', 'ethere amount')
  .action(async function(options) {
    if (options.ethereum) {
      Logger.debug("send_ethereum() called")
      await send_ethereum(options.address, options.password, options.unit, options.amount)
    }
    if (options.dappchain) {
      Logger.debug("send_dappchain() called")
      await send_dappchain(options.address, options.password, options.unit, options.amount)
    }
    if (options.withdraw) {
      Logger.debug("withdraw() called")
      await withdraw(options.address, options.password)
    }
    process.exit(0)
  })


program
  .command('msp')
  .option('-r, --request', 'request role')
  .option('-D, --details', 'get all request details (only contract owner)')
  .option('-a, --approve', 'approve request')
  .option('-V, --revoke', 'revoke role')
  .option('-c, --clean', 'clean up request')
  .option('-v, --verify', 'verify role')
  .option('-T, --test', 'prepare test')
  .option('-d, --address <address>', 'address')
  .option('-p, --password <password>', 'password')
  .option('-R, --role <role>', 'P|CP|SP|D')
  .option('-A, --approval <approval>', 'request approvals')
  .option('-t, --target <target>', 'target')
  .action(async function(options) {
    if (options.request) {
      Logger.debug("requestEnroll() called")
      await requestEnroll(options.address, options.password, options.role)
    }
    if (options.details) {
      Logger.debug("requestDetails() called")
      await requestDetails(options.address, options.password)
    }
    if (options.approve) {
      Logger.debug("requestApprove() called")
      await requestApprove(options.address, options.password, options.approval)
    }
    if (options.revoke) {
      Logger.debug("revokeRole() called")
      await revokeRole(options.address, options.password, options.target, options.role)
    }
    if (options.verify) {
      Logger.debug("verifyRole() called")
      await verifyRole(options.address, options.password, options.target, options.role)
    }
    if (options.clean) {
      Logger.debug("requestCleanup() called")
      await requestCleanup(options.address, options.password)
    }
    if (options.test) {
      Logger.debug("prepareTest() called")
      await prepareTest()
    }
    process.exit(0)
  })

program
  .command('cid')
  .option('-d, --address <address>', 'address')
  .option('-p, --password <password>', 'password')
  .action(async function(options) {
    Logger.debug("getCID() called")
    await getCID(options.address, options.password)
    process.exit(0)
  })

program
  .command('regist')
  .option('-d, --data', 'regist data')
  .option('-f, --file', 'regist file')
  .option('-p, --product', 'regist product')
  .option('-b, --buy', 'buy product')
  .option('-o, --open', 'channel open')
  .option('-o, --off', 'channel off')
  .option('-s, --settle', 'channel settle')
  .option('-d, --address <address>', 'address')
  .option('-p, --password <password>', 'password')
  .option('-c, --cid <cid>', 'data cid')
  .option('-C, --ccid <ccid>', 'data ccid')
  .option('-v, --version <version>', 'data version')
  .option('-g, --category <category>', 'data category')
  .option('-G, --subCategory <subCategory>', 'data sub category')
  .option('-t, --title <title>', 'data title')
  .option('-D, --details <details>', 'data file details')
  .option('-F, --filePath <filePath>', 'data file path')
  .option('-f, --fee <fee>', 'data file fee')
  .option('-c, --chunks <chunks>', 'data file chunks')
  .option('-i, --id <id>', 'id')
  .option('-s. --senders <senders>', 'senders')
  .action(async function(options) {
    if (options.data) {
      Logger.debug("registData() called")
      await registData(options.address, options.password, options.cid, options.ccid, options.version, options.category, options.subCategory, options.title, options.details)
    }
    if (options.file) {
      Logger.debug("registFileFee() called")
      await registFileFee(options.address, options.password, options.ccid, options.version, options.filePath, options.fee, options.chunks)
    }
    if (options.product) {
      Logger.debug("registProduct() called")
      await registProduct(options.address, options.password, options.ccid, options.version, options.filePath, options.fee)
    }
    if (options.buy) {
      Logger.debug("buyToken() called")
      await buyToken(options.address, options.password, options.id)
    }
    if (options.open) {
      Logger.debug("channelOpen() called")
      await channelOpen(options.address, options.password, options.id)
    }
    if (options.off) {
      Logger.debug("channelOff() called")
      await channelOff(options.address, options.password, options.id)
    }
    if (options.settle) {
      Logger.debug("channelSettle() called")
      await channelSettle(options.address, options.password, options.id, options.senders, options.chunks)
    }
    process.exit(0)
  })

program
  .command('list')
  .option('-d, --data', 'data list')
  .option('-p, --product', 'product list')
  .option('-t, --token', 'token list')
  .option('-d, --address <address>', 'address')
  .option('-p, --password <password>', 'password')
  .action(async function(options) {
    if (options.data) {
      Logger.debug("listData() called")
      await listData(options.address, options.password)
    }
    if (options.product) {
      Logger.debug("listProduct() called")
      await listProduct(options.address, options.password)
    }
    if (options.token) {
      Logger.debug("listToken() called")
      await listToken(options.address, options.password)
    }
    process.exit(0)
  })

program
  .command('details')
  .option('-d, --data', 'data details')
  .option('-f --file', 'file details')
  .option('-p, --product', 'product details')
  .option('-t, --token', 'token details')
  .option('-d, --deposit', 'get deposit amount')
  .option('-c, --channel', 'get channel details')
  .option('-d, --address <address>', 'address')
  .option('-p, --password <password>', 'password')
  .option('-i, --id <id>', 'id')
  .option('-c, --ccid <ccid>', 'ccid')
  .option('-v, --version <version>', 'version')
  .option('-F, --filePath <filePath>', 'file path')
  .action(async function(options) {
    if (options.data) {
      Logger.debug("detailsData() called")
      await detailsData(options.address, options.password, options.id)
    }
    if (options.file) {
      Logger.debug("fileFee() called")
      await fileFee(options.address, options.password, options.ccid, options.version, options.filePath)
    }
    if (options.product) {
      Logger.debug("detailsProduct() called")
      await detailsProduct(options.address, options.password, options.id)
    }
    if (options.token) {
      Logger.debug("detailsToken() called")
      await detailsToken(options.address, options.password, options.id)
    }
    if (options.deposit) {
      Logger.debug("depositAmount() called")
      await depositAmount(options.address, options.password, options.id)
    }
    if (options.channel) {
      Logger.debug("detailsChannel() called")
      await detailsChannel(options.address, options.password, options.id)
    }
    process.exit(0)
  })

program
  .command('sign')
  .option('-s, --sign', 'sign')
  .option('-v, --verify', 'verify')
  .option('-i, --address <address>', 'account address')
  .option('-p, --password <password>', 'account password')
  .option('-m, --msg <msg>', 'message to sign')
  .option('-S, --signature <signature>', 'signature')
  .option('-P, --publicKey <publicKey>', 'public key used to verify')
  .action(async function(options) {
    if (options.sign) {
      Logger.debug("sign_receipt() called")
      await sign_receipt(options.address, options.password, options.msg)
    }
    if (options.verify) {
      Logger.debug("verify_receipt() called")
      await verify_receipt(options.address, options.password, options.signature, options.publicKey)
    }
    process.exit(0)
  })
//-------------------------------------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------- test ---------------------------------------------------------------//

async function sendAggregatedReceipt(address, password, oTokenId, size) {
  try {
    var Tools = await initTools(address, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools
    await DappTools.sendAggregatedReceipt(oTokenId, size)
  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

program
  .command('manager')
  .option('-s, --settle', 'settle')
  .option('-t, --send_receipt', 'send receipt to verifier')
  .option('-i, --address <address>', 'account address')
  .option('-p, --password <password>', 'account password')
  .option('-S, --size <size>', 'data size transfered')
  .option('-o, --oTokenId <oTokenId>', 'off-chain token id')
  .option('-a, --address <address>', 'address')
  .action(async function(options) {
    if (options.send_receipt) {
      Logger.debug("sendAggregatedReceipt() called")
      await sendAggregatedReceipt(options.address, options.password, options.oTokenId, options.size)
    }
    process.exit(0)
  })

async function addRequest() {
  try {
    var Tools = []
    var EtherTools = []
    var DappTools = []
    var Wallet = []
    Tools.push(await initTools(0, 'p@ssw0rd'))
    Tools.push(await initTools(1, 'p@ssw0rd'))
    EtherTools.push(Tools[0].EtherTools)
    EtherTools.push(Tools[1].EtherTools)
    DappTools.push(Tools[0].DappTools)
    DappTools.push(Tools[1].DappTools)
    Wallet.push(EtherTools[0].getWallet())
    Wallet.push(EtherTools[1].getWallet())

    Logger.debug("address[0]: " + Wallet[0].getAddressString())
    Logger.debug("address[1]: " + Wallet[1].getAddressString())

    var Issuer = await DappTools[0].enrollIssuer(Wallet[1].getAddressString())
    Logger.debug("Issuer: " + Issuer)

    // var AddressKey = await DappTools[0].getAddressKey(Wallet[0].getAddressString())
    var AddressKey = await DappTools[0].getAddressKey(DappTools[0].GetAddress())
    Logger.debug("AddressKey: " + AddressKey.toString('hex'))

    const Data = {
      age: 18
    }
    var DataHash = await DappTools[0].getDataHash(AddressKey, Data)
    Logger.debug("DataHash: " + DataHash.toString('hex'))

    var ReqKey = await DappTools[1].requestAdd(AddressKey, DataHash, Wallet[1].getPrivateKey())
    Logger.debug("request key: " + ReqKey)

    await DappTools[0].approveAdd(DataHash, ReqKey, true)

    var Signature = await DappTools[0].getSignature(AddressKey, DataHash)
    Logger.debug("signatrue info: " + JSON.stringify({
      signature: Signature.signature,
      signer: Signature.signer
    }))


  } catch (error) {
    console.log(JSON.stringify({
      error: error.message
    }))
    Logger.error('error occured: ' + error)
  }
}

program
  .command('identity')
  .option('-t, --test', 'test')
  .action(async function(options) {
    if (options.test) {
      Logger.debug("addRequest() called")
      await addRequest()
    }
    process.exit(0)
  })
//-------------------------------------------------------------------------------------------------------------------------------------//

program.parse(process.argv)
