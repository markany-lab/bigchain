var Ether = require('./ether.js')
var Dapp = require('./dapp.js')
var Util = require('ethereumjs-util')
var Web3Util = require('web3-utils')
var {
  CryptoUtils
} = require('loom-js')
var program = require('commander')
var crypto = require('crypto')

async function generateCID() {
  try {
    crypto.randomBytes(32, (err, buf) => {
      if (err) {
        console.log("error occured: " + err)
      }
      console.log(Util.bufferToHex(buf))
    })
  } catch (err) {
    console.log("error occured: " + err)
  }
}

async function account_generate(password) {
  try {
    const index = await Ether.generateAccount(password)

    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync(index, password)
    console.log('# init complete')

    /* init Dappchain elements */
    console.log('# init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    console.log('# init complete')

    console.log('# mapping ethereum account to dapp account...')
    await DappTools.SignAsync(EtherTools.getWallet())
    console.log('# mapping complete')
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function initApp() {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync()
    console.log('# init complete')

    /* init Dappchain elements */
    console.log('# init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    console.log('# init complete')

    /* init Dapp contract */
    // await DappTools.initContract()
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function mappingAddress() {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync()
    console.log('# init complete')

    /* init Dappchain elements */
    console.log('# init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    console.log('# init complete')

    /* map ethereum account to dapp account */
    console.log('\n# map ethereum account to dapp account...')
    await DappTools.SignAsync(EtherTools.getWallet())
    console.log('# address mapping complete')
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function sendEtherToDapp(unit, amount) {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync()
    console.log('# init complete')

    /* send ether from ethereum account to dapp account */
    var EthWeb3 = EtherTools.getWeb3()
    const ethereumAccount = EtherTools.getWallet().getAddressString()
    const balanceBefore = await EthWeb3.eth.getBalance(ethereumAccount)
    await EtherTools.Deposit2GatewayAsync(ethereumAccount, unit, amount)
    const balanceAfter = await EthWeb3.eth.getBalance(ethereumAccount)
    console.log('# send ether complete: ' + ethereumAccount + ' balance: ' + balanceBefore + ' => ' + balanceAfter)
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function sendDappToGateway(unit, amount) {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync()
    console.log('# init complete')

    /* init Dappchain elements */
    console.log('# init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    console.log('# init complete')

    /* send ether from dapp account to gateway */
    const balance = (await DappTools.GetBaLanceAsync()).toString()
    const sendAmount = Web3Util.toWei(amount, unit)
    console.log("balance: " + balance + " wei")
    console.log("sendAmount: " + sendAmount + " wei")
    if (balance < sendAmount) {
      console.log("You do not have enough ethers to send " + amount + " " + unit)
      return
    }
    await DappTools.ApproveAsync(sendAmount)
    await DappTools.WithdrawEthAsync(sendAmount)
    console.log('# Processing allowance')
  } catch (error) {
    if (error.message.indexOf('pending') > -1) {
      console.log('# Pending withdraw exists, check Ethereum Gateway')
    } else {
      console.error('# error occured: ' + error.message)
    }
  }
}

async function withdrawEther() {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync()
    console.log('# init complete')

    /* init Dappchain elements */
    console.log('# init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    console.log('# init complete')

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
    console.log("# withdraw balance: " + EtherBaLance)
    const Owner = Data.tokenOwner.local.toString()
    const Signature = CryptoUtils.bytesToHexAddr(Data.oracleSignature)
    await EtherTools.WithdrawEthAsync(Owner, EtherBaLance, Signature)
    console.log('# Token withdraw with success, check Owned Tokens')
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function statusBasic() {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync()
    console.log('# init complete')

    /* init Dappchain elements */
    console.log('# init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    console.log('# init complete')

    /* basic information about both accounts */
    console.log('# basic status:')
    const ethereumAccount = EtherTools.getWallet().getAddressString()
    const etherBalance = await EtherTools.GetBaLanceAsync(ethereumAccount)
    const dappAccount = DappTools.GetAccount()
    const dappBalance = await DappTools.GetBaLanceAsync()
    const mappingInfo = await DappTools.GetAddressMappingAsync(ethereumAccount)

    console.log(' - ethereum account: ' + ethereumAccount)
    console.log(' - ethereum balance: ' + etherBalance)
    console.log(' - dapp account: ' + dappAccount)
    console.log(' - dapp balance: ' + dappBalance)
    console.log(' - address mapping:')
    console.log('  * from: ' + mappingInfo.from.chainId + '_' + mappingInfo.from.local)
    console.log('  * to: ' + mappingInfo.to.chainId + '_' + mappingInfo.to.local)
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function statusToken(cTokenId, uTokenId, oTokenId) {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync()
    console.log('# init complete')

    /* init Dappchain elements */
    console.log('# init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    console.log('# init complete')

    /* infromation about dapp tokens */
    const havedIds = await DappTools.GetOwnedUTsAsync()
    const ownedIds = await DappTools.GetOwnedCTsAsync()

    if (typeof cTokenId == 'undefined' && typeof uTokenId == 'undefined' && typeof oTokenId == 'undefined') {
      console.log('# you have UTokens with ids ' + havedIds)
      console.log('# you own CTokens with ids ' + ownedIds)
    } else if (typeof cTokenId != 'undefined') {
      if (!(await DappTools.IsExistsCToken(cTokenId))) {
        console.log('# contents token with id ' + cTokenId + ' is not exist')
        return
      }
      const details = await DappTools.GetCTWithID(cTokenId)
      const status = details._DisabLed == true ? 'disable' : 'enable'
      console.log('# contents token with id ' + cTokenId + ' details')
      console.log(' - balance: ' + details.balance)
      console.log(' - title: ' + details._TitLe)
      console.log(' - cid: ' + details._CID)
      console.log(' - hash: ' + details._Hash)
      console.log(' - fee: ' + details._Fee)
      console.log(' - status: ' + status)

    } else if (typeof uTokenId != 'undefined') {
      if (!(await DappTools.IsExistsUToken(uTokenId))) {
        console.log('# user token with id ' + uTokenId + ' is not exist')
        return
      }
      const details = await DappTools.GetUTWithID(uTokenId)
      var state
      switch (details.state) {
        case '0':
          state = 'sold';
          break;
        case '1':
          state = 'in progess';
          break;
        case '2':
          state = 'settled';
          break;
        default:
          state = 'unknown state';
          break;
      }
      console.log('# user token with id ' + uTokenId + ' details')
      console.log(' - user: ' + details.user)
      console.log(' - contents token: ' + details.cTokenId)
      console.log(' - token state: ' + state)

    } else if (typeof oTokenId != 'undefiend') {
      if (!(await DappTools.IsExistsOToken(oTokenId))) {
        console.log('# offchain token with id ' + oTokenId + ' is not exist')
        return
      }
      const details = await DappTools.GetOTWithID(oTokenId)
      const state = details.state == 0 ? 'open' : 'off'
      console.log('# off chain token with id ' + oTokenId + 'details')
      console.log(' - orderer: ' + details.orderer)
      console.log(' - user token id: ' + details.uTokenId)
      console.log(' - contents token id: ' + details.cTokenId)
      console.log(' - deposit: ' + details.deposit)
      console.log(' - state: ' + state)
      console.log(' - timestamp: ' + details.timestamp)
      console.log(' - left time: ' + details.leftTime)
    }
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function createCToken(title, cid, fee, hash, supply) {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync()
    console.log('# init complete')

    /* init Dappchain elements */
    console.log('# init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    console.log('# init complete')

    /* create Dapp token */
    await DappTools.CreateCToken(title, cid, fee, hash, supply)
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function mintB(cTokenId, supply) {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync()
    console.log('# init complete')

    /* init Dappchain elements */
    console.log('# init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    console.log('# init complete')

    /* create Dapp token */
    await DappTools.MintB(cTokenId, supply)
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function buyToken(cTokenId) {
  /* init Ethereum elements */
  console.log('# init ethereum tools...')
  var EtherTools = await Ether.createAsync()
  console.log('# init complete')

  /* init Dappchain elements */
  console.log('# init dapp tools...')
  var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
  console.log('# init complete')

  await DappTools.BuyToken(cTokenId)
}

async function channelOpen(uTokenId) {
  /* init Ethereum elements */
  console.log('# init ethereum tools...')
  var EtherTools = await Ether.createAsync()
  console.log('# init complete')

  /* init Dappchain elements */
  console.log('# init dapp tools...')
  var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
  console.log('# init complete')

  await DappTools.ChannelOpen(uTokenId)
}

async function channelOff(oTokenId) {
  /* init Ethereum elements */
  console.log('# init ethereum tools...')
  var EtherTools = await Ether.createAsync()
  console.log('# init complete')

  /* init Dappchain elements */
  console.log('# init dapp tools...')
  var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
  console.log('# init complete')

  await DappTools.ChannelOff(oTokenId)
}

async function channelDetails(oTokenId) {
  /* init Ethereum elements */
  console.log('# init ethereum tools...')
  var EtherTools = await Ether.createAsync()
  console.log('# init complete')

  /* init Dappchain elements */
  console.log('# init dapp tools...')
  var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
  console.log('# init complete')

  await DappTools.GetOTWithID(oTokenId)
}

async function settle(oTokenId) {
  /* init Ethereum elements */
  console.log('# init ethereum tools...')
  var EtherTools = await Ether.createAsync()
  console.log('# init complete')

  /* init Dappchain elements */
  console.log('# init dapp tools...')
  var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
  console.log('# init complete')

  await DappTools.Settle(oTokenId)
}

async function sendAggregatedReceipt() {
  console.log('# init ethereum tools...')
  var EtherTools = await Ether.createAsync()
  console.log('# init complete')

  /* init Dappchain elements */
  console.log('# init dapp tools...')
  var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
  console.log('# init complete')

  await DappTools.sendAggregatedReceipt()
}

program
  .version('0.1.0')
  .option('-K, --keypath <path>', 'designate private key path')

program
  .command('init')
  .description('init ethereum & dappchain')
  .action(function () {
    console.log("# initApp() called")
    initApp()
  })

program
  .command('mapping')
  .description('mapping address')
  .action(function () {
    console.log("# mappingAddress() called")
    mappingAddress()
  })

program
  .command('status_basic')
  .description('output basic status')
  .action(function () {
    console.log("# statusBasic() called")
    statusBasic()
  })

program
  .command('status_token')
  .option('-C, --cid <tid>', 'contents token id')
  .option('-U, --uid <tid>', 'user token id')
  .option('-O, --oid <oid>', 'off chain token id')
  .description('output token details if you enter the id. otherwise, output token ids')
  .action(function (options) {
    console.log("# statusToken() called")
    statusToken(options.cid, options.uid, options.oid)
  })

program
  .command('send_ether')
  .option('-U, --unit <unit>', 'ethereum currency unit. choose wei or ether')
  .option('-A, --amount <amount>', 'ethereum currency amount')
  .description('send ether between ethereum address and dapp account')
  .action(function (options) {
    console.log("# sendEtherToDapp() called")
    sendEtherToDapp(options.unit, options.amount);
  })

program
  .command('send_dapp')
  .option('-U, --unit <unit>', 'ethereum currency unit. choose wei or ether')
  .option('-A, --amount <amount>', 'ethereum currency amount')
  .description('send ether between ethereum address and dapp account')
  .action(function (options) {
    console.log("# sendDappToGateway() called")
    sendDappToGateway(options.unit, options.amount);
  })

program
  .command('withdraw')
  .description('get ether from gateway to ethereum address')
  .action(function () {
    console.log("# withdrawEther() called")
    withdrawEther()
  })

program
  .command('create_ct')
  .description('create contents token')
  .option('-T, --title <title>', 'contents title')
  .option('-C, --cid <cid>', 'contents cid')
  .option('-F, --fee <fee>', 'contents fee')
  .option('-H, --hash <hash>', 'contents hash')
  .option('-S, --supply <supply>', 'contents supply')
  .action(function (options) {
    console.log("# createCToken() called")
    createCToken(options.title, options.cid, options.fee, options.hash, options.supply)
  })

program
  .command('mint_b')
  .description('mint B')
  .option('-C, --cid <cid>', 'contents token id to mint')
  .option('-S, --supply <supply>', 'supply amount to mint')
  .action(function (options) {
    console.log("# mintB() called")
    mintB(options.cid, options.supply)
  })

program
  .command('buy_token')
  .description('buy token')
  .option('-C, --cid <cid>', 'contents token id you want to buy')
  .action(function (options) {
    console.log("# buyToken() called")
    buyToken(options.cid)
  })

program
  .command('channel_open')
  .description('channel open')
  .option('-U, --uid <uid>', 'user token id you want to get')
  .action(function (options) {
    console.log("# channelOpen() called")
    channelOpen(options.uid)
  })

program
  .command('channel_off')
  .description('channel off')
  .option('-O, --oid <oid>', 'off chain token id you want to off')
  .action(function (options) {
    console.log("# channelOff() called")
    channelOff(options.oid)
  })

program
  .command('channel_details')
  .description('channel details')
  .option('-O, --oid <oid>', 'off chain details')
  .action(function (options) {
    console.log("# channelDetails() called")
    channelDetails(options.oid)
  })

program
  .command('settle')
  .description('settle')
  .option('-O, --oid <oid>', 'off chain details')
  .action(function (options) {
    console.log("# settle() called")
    settle(options.oid)
  })

program
  .command('send_aggregated_receipt')
  .description('settle')
  .action(function () {
    console.log("# settle() called")
    sendAggregatedReceipt()
  })

program
  .command('generate_cid')
  .description('generate cid')
  .action(function () {
    console.log("# generateCID() called")
    generateCID()
  })



////////////////////////////////

program
  .command('account')
  .option('-g, --generate', 'generate account')
  .option('-p, --password <password>', 'account password')
  .action(function (options) {
    if (options.generate) {
      console.log("account_generate() called")
      account_generate(options.password)
    }
  })

program.parse(process.argv)


