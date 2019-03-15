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

    //   /* init Ethereum elements */
    //   console.log('# init ethereum tools...')
    //   var EtherTools = await Ether.createAsync(index, password)
    //   console.log('# init complete')

    //   /* init Dappchain elements */
    //   console.log('# init dapp tools...')
    //   var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    //   console.log('# init complete')

    //   console.log('# mapping ethereum account to dapp account...')
    //   await DappTools.SignAsync(EtherTools.getWallet())
    //   console.log('# mapping complete')
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function account_import(privateKey, password) {
  try {
    const index = await Ether.importAccount(privateKey, password)

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

async function account_export(index, password) {
  try {
    const privateKey = await Ether.exportAccount(index, password)
    console.log("# private key: " + privateKey)
  } catch (error) {
    console.log("# error occured: " + error)
  }
}

async function account_remove(index) {
  try {
    const removedAccount = await Ether.removeAccount(index)
    console.log("# removed: " + removedAccount)
  } catch (error) {
    console.log("# error occured: " + error)
  }
}

async function account_list() {
  const accountList = await Ether.listAccount()
  for (var i = 0; i < accountList.length; i++) {
    console.log(i + '\'s account: ' + accountList[i])
  }
}

async function account_blance(index, password) {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync(index, password)
    console.log('# init complete')

    /* init Dappchain elements */
    console.log('# init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    console.log('# init complete')

    /* basic information about both accounts */
    const ethereumAccount = EtherTools.getWallet().getAddressString()
    const etherBalance = await EtherTools.GetBaLanceAsync(ethereumAccount)
    const dappBalance = await DappTools.GetBaLanceAsync()
    const mappingInfo = await DappTools.GetAddressMappingAsync(ethereumAccount)

    console.log(' - ethereum account: ' + ethereumAccount)
    console.log(' - ethereum balance: ' + etherBalance)
    console.log(' - dapp balance: ' + dappBalance)
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function send_ethereum(index, password, unit, amount) {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync(index, password)
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

async function send_dappchain(index, password, unit, amount) {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync(index, password)
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

async function withdraw(index, password) {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync(index, password)
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

async function contents_register(index, password, title, cid, fee, hash, supply) {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync(index, password)
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

async function contents_list(index, password) {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync(index, password)
    console.log('# init complete')

    /* init Dappchain elements */
    console.log('# init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    console.log('# init complete')

    /* create Dapp token */
    const cTokenIds = await DappTools.GetOwnedCTsAsync()
    console.log(JSON.stringify(cTokenIds))
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function contents_details(index, password, cTokenId) {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync(index, password)
    console.log('# init complete')

    /* init Dappchain elements */
    console.log('# init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    console.log('# init complete')

    /* create Dapp token */
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
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function contents_buy(index, password, cTokenId) {
  /* init Ethereum elements */
  console.log('# init ethereum tools...')
  var EtherTools = await Ether.createAsync(index, password)
  console.log('# init complete')

  /* init Dappchain elements */
  console.log('# init dapp tools...')
  var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
  console.log('# init complete')

  await DappTools.BuyToken(cTokenId)
}

async function token_list(index, password) {
  /* init Ethereum elements */
  console.log('# init ethereum tools...')
  var EtherTools = await Ether.createAsync(index, password)
  console.log('# init complete')

  /* init Dappchain elements */
  console.log('# init dapp tools...')
  var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
  console.log('# init complete')

  const havedIds = await DappTools.GetOwnedUTsAsync()
  console.log("# token list: " + JSON.stringify(havedIds))
}

async function token_details(index, password, uTokenId) {
  /* init Ethereum elements */
  console.log('# init ethereum tools...')
  var EtherTools = await Ether.createAsync(index, password)
  console.log('# init complete')

  /* init Dappchain elements */
  console.log('# init dapp tools...')
  var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
  console.log('# init complete')

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
      state = 'unknown state: ' + details.state;
      break;
  }
  console.log('# user token with id ' + uTokenId + ' details')
  console.log(' - user: ' + details.user)
  console.log(' - contents token: ' + details.cTokenId)
  console.log(' - token state: ' + state)
}

async function channel_open(index, password, cid, hash) {
  /* init Ethereum elements */
  console.log('# init ethereum tools...')
  var EtherTools = await Ether.createAsync(index, password)
  console.log('# init complete')

  /* init Dappchain elements */
  console.log('# init dapp tools...')
  var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
  console.log('# init complete')

  await DappTools.ChannelOpen(cid, hash)
}

async function channel_off(index, password, oTokenId) {
  /* init Ethereum elements */
  console.log('# init ethereum tools...')
  var EtherTools = await Ether.createAsync(index, password)
  console.log('# init complete')

  /* init Dappchain elements */
  console.log('# init dapp tools...')
  var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
  console.log('# init complete')

  await DappTools.ChannelOff(oTokenId)
}

async function channel_details(index, password, oTokenId) {
  /* init Ethereum elements */
  console.log('# init ethereum tools...')
  var EtherTools = await Ether.createAsync(index, password)
  console.log('# init complete')

  /* init Dappchain elements */
  console.log('# init dapp tools...')
  var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
  console.log('# init complete')

  const details = await DappTools.GetOTWithID(oTokenId)
  console.log("details: " + JSON.stringify(details))
}

async function sendAggregatedReceipt() {
  console.log('# init ethereum tools...')
  var EtherTools = await Ether.createAsync(0, 'p@ssw0rd')
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
  .command('account')
  .option('-g, --generate', 'generate account')
  .option('-i, --import', 'import account')
  .option('-e, --export', 'export account')
  .option('-r, --remove', 'remove account')
  .option('-l, --list', 'list up account')
  .option('-b, --balance', 'balance info')
  .option('-I, --index <index>', 'account index')
  .option('-p, --password <password>', 'account password')
  .option('-P, --prvKey <prvKey>', 'private key')
  .action(function (options) {
    if (options.generate) {
      console.log("account_generate() called")
      account_generate(options.password)
    }
    if (options.import) {
      console.log("account_import() called")
      account_import(options.prvKey, options.password)
    }
    if (options.export) {
      console.log("account_export() called")
      account_export(options.index, options.password)
    }
    if (options.list) {
      console.log("account_list() called")
      account_list()
    }
    if (options.remove) {
      console.log("account_remove() called")
      account_remove(options.index)
    }
    if (options.balance) {
      console.log("account_blance() called")
      account_blance(options.index, options.password)
    }
  })

program
  .command('send')
  .option('-e, --ethereum', 'send ether from ethereum to dappchain')
  .option('-d, --dappchain', 'send ether from dappchain to ethereum')
  .option('-w, --withdraw', 'withdraw from gateway')
  .option('-i, --index <index>', 'account index')
  .option('-p, --password <password>', 'account password')
  .option('-u, --unit <unit>', 'ethereum currency unit wei|ether')
  .option('-a, --amount <amount>', 'ethere amount')
  .action(function (options) {
    if (options.ethereum) {
      console.log("send_ethereum() called")
      send_ethereum(options.index, options.password, options.unit, options.amount)
    }
    if (options.dappchain) {
      console.log("send_dappchain() called")
      send_dappchain(options.index, options.password, options.unit, options.amount)
    }
    if (options.withdraw) {
      console.log("withdraw() called")
      withdraw(otions.index, options.password)
    }
  })

program
  .command('contents')
  .option('-r, --register', 'register contents')
  .option('-l, --list', 'list up contents')
  .option('-d, --details', 'details of contents')
  .option('-b, --buy', 'buy contents')
  .option('-I, --index <index>', 'account index')
  .option('-p, --password <password>', 'account password')
  .option('-C, --cTokenId <cTokenId>', 'contents token id')
  .option('-t, --title <title>', 'contents title')
  .option('-c, --cid <cid>', 'contents cid')
  .option('-f, --fee <fee>', 'contents fee')
  .option('-h, --hash <hash>', 'contents hash')
  .option('-s, --supply <supply>', 'contents supply')
  .action(function (options) {
    if (options.register) {
      console.log('contents_register() called')
      contents_register(options.index, options.password, options.title, options.cid, options.fee, options.hash, options.supply)
    }
    if (options.list) {
      console.log("contents_list() called")
      contents_list(options.index, options.password)
    }
    if (options.details) {
      console.log("contents_details() called")
      contents_details(options.index, options.password, options.cTokenId)
    }
    if (options.buy) {
      console.log("contents_buy() called")
      contents_buy(options.index, options.password, options.cTokenId)
    }
  })

program
  .command('token')
  .option('-l, --list', 'list up token')
  .option('-d, --details', 'details of token')
  .option('-I, --index <index>', 'account index')
  .option('-p, --password <password>', 'account password')
  .option('-c, --uTokenId <uTokenId>', 'token id')
  .action(function (options) {
    if (options.list) {
      console.log("token_list() called")
      token_list(options.index, options.password)
    }
    if (options.details) {
      console.log("token_details() called")
      token_details(options.index, options.password, options.uTokenId)
    }
  })

program
  .command('channel')
  .option('-o, --open', 'channel open')
  .option('-O, --off', 'channel off')
  .option('-d, --details', 'channel details')
  .option('-I, --index <index>', 'account index')
  .option('-p, --password <password>', 'account password')
  .option('-c, --cid <cid>', 'contents cid')
  .option('-h, --hash <hash>', 'contents hash')
  .option('-t, --oTokenId <oTokenId>', 'off-chain channel token id')
  .action(function(options) {
    if(options.open) {
      console.log("channel_open() called")
      channel_open(options.index, options.password, options.cid, options.hash)
    }
    if(options.off) {
      console.log("channel_off() called")
      channel_off(options.index, options.password, options.oTokenId)
    }
    if(options.details) {
      console.log("channel_details() called")
      channel_details(options.index, options.password, options.oTokenId)
    }
  })

program
  .command('send_aggregated_receipt')
  .description('settle')
  .action(function () {
    console.log("# settle() called")
    sendAggregatedReceipt()
  })

program.parse(process.argv)


