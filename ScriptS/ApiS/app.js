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
    await Ether.removeAccount(index)
  } catch (error) {
    console.log("# error occured: " + error)
  }
}

async function account_list() {
  const accountList = await Ether.listAccount()
  for (var i = 0; i < accountList.length; i++) {
    console.log(i + '\'s account: ' + accountList[i].address)
  }
}

async function account_balance(index, password) {
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

async function data_register(index, password, title) {
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
    await DappTools.RegisterData(title)
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function data_list(index, password) {
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
    const cTokenIds = await DappTools.GetOwnedDsAsync()
    console.log(JSON.stringify(cTokenIds))
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function data_details(index, password, cid) {
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
    if (!(await DappTools.IsExistsData(cid))) {
      console.log('# data with cid ' + cid + ' is not exist')
      return
    }
    const details = await DappTools.GetDataWithID(cid)
    console.log('# data with id ' + cid + ' details')
    console.log(JSON.stringify(details))
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function hash_register(index, password, cid, hash, fee) {
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
    await DappTools.RegisterHash(cid, hash, fee)
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function hash_list(index, password) {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync(index, password)
    console.log('# init complete')

    /* init Dappchain elements */
    console.log('# init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    console.log('# init complete')

    var res = []
    const cids = await DappTools.GetOwnedDsAsync()
    for (var i = 0; i < cids.length; i++) {
      const hashes = await DappTools.GetOwnedHsAsync(cids[0])
      res.push({
        cid: cids[i],
        hashes
      })
    }
    console.log("result: " + JSON.stringify(res))

  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function hash_details(index, password, hash) {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync(index, password)
    console.log('# init complete')

    /* init Dappchain elements */
    console.log('# init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    console.log('# init complete')

    if (!(await DappTools.IsExistsHash(hash))) {
      console.log('# data with hash ' + hash + ' is not exist')
      return
    }
    const details = await DappTools.GetHashWithCIDandHash(hash)
    console.log("result: " + JSON.stringify(details))
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function product_register(index, password, hash) {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync(index, password)
    console.log('# init complete')

    /* init Dappchain elements */
    console.log('# init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    console.log('# init complete')

    if (!(await DappTools.IsExistsHash(hash))) {
      console.log('# data with hash ' + hash + ' is not exist')
      return
    }
    await DappTools.RegisterProduct(hash, 10000)
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function product_list(index, password) {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync(index, password)
    console.log('# init complete')

    /* init Dappchain elements */
    console.log('# init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    console.log('# init complete')

    const ids = await DappTools.GetOwnedPTsAsync()
    console.log(JSON.stringify({pTokenIds: ids}))
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function product_details(index, password, pTokenId) {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync(index, password)
    console.log('# init complete')

    /* init Dappchain elements */
    console.log('# init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    console.log('# init complete')

    if (!(await DappTools.IsExistsPToken(pTokenId))) {
      console.log('# data with pTokenId ' + pTokenId + ' is not exist')
      return
    }

    const details = await DappTools.GetPTWithID(pTokenId)
    console.log(JSON.stringify({details}))
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function product_buy(index, password, pTokenId) {
  /* init Ethereum elements */
  console.log('# init ethereum tools...')
  var EtherTools = await Ether.createAsync(index, password)
  console.log('# init complete')

  /* init Dappchain elements */
  console.log('# init dapp tools...')
  var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
  console.log('# init complete')

  await DappTools.BuyToken(pTokenId)
}

async function contract_contract(index, password, pTokenId, address, cost, isDc) {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync(index, password)
    console.log('# init complete')

    /* init Dappchain elements */
    console.log('# init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    console.log('# init complete')

    if (!(await DappTools.IsExistsPToken(pTokenId))) {
      console.log('# data with pTokenId ' + pTokenId + ' is not exist')
      return
    }
    if(isDc) {
      await DappTools.DistributionContract(pTokenId, address, cost)
    } else {
      await DappTools.SearchProviderContract(pTokenId, address, cost)
    }
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function contract_list(index, password, isDc) {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync(index, password)
    console.log('# init complete')

    /* init Dappchain elements */
    console.log('# init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    console.log('# init complete')

    if(isDc) {
      const dcList = await DappTools.GetOwnedDCsAsync()
      console.log(JSON.stringify({dcList}))
    } else {
      const scList = await DappTools.GetOwnedSCsAsync()
      console.log(JSON.stringify({scList}))
    }
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function contract_List(index, password, pTokenId, isDc) {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync(index, password)
    console.log('# init complete')

    /* init Dappchain elements */
    console.log('# init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    console.log('# init complete')

    if (!(await DappTools.IsExistsPToken(pTokenId))) {
      console.log('# data with pTokenId ' + pTokenId + ' is not exist')
      return
    }
    if(isDc) {
      const dcList = await DappTools.GetOwnedDCsWithPTokenAsync(pTokenId)
      console.log(JSON.stringify({dcList}))
    } else {
      const scList = await DappTools.GetOwnedSCsWithPTokenAsync(pTokenId)
      console.log(JSON.stringify({scList}))
    }
  } catch (error) {
    console.log('# error occured: ' + error)
  }
}

async function contract_details(index, password, Index, isDc) {
  try {
    /* init Ethereum elements */
    console.log('# init ethereum tools...')
    var EtherTools = await Ether.createAsync(index, password)
    console.log('# init complete')

    /* init Dappchain elements */
    console.log('# init dapp tools...')
    var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
    console.log('# init complete')

    if(isDc) {
      const details = await DappTools.GetDCWithID(Index)
      console.log(JSON.stringify({details}))
    } else {
      const details = await DappTools.GetSCWithID(Index)
      console.log(JSON.stringify({details}))
    }
  } catch (error) {
    console.log('# error occured: ' + error)
  }
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
  let details = await DappTools.GetUTWithID(uTokenId)
  var state = ['sold', 'in progress', 'settled']
  details.state = state[details.states]
  console.log(JSON.stringify(details))
}

async function channel_open(index, password, cid, hash, numOfChunks) {
  /* init Ethereum elements */
  console.log('# init ethereum tools...')
  var EtherTools = await Ether.createAsync(index, password)
  console.log('# init complete')

  /* init Dappchain elements */
  console.log('# init dapp tools...')
  var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
  console.log('# init complete')

  await DappTools.ChannelOpen(cid, hash, numOfChunks)
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

program
  .version('0.1.0')
  .option('-K, --keypath <path>', 'designate private key path')

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
  .action(async function(options) {
    if (options.generate) {
      console.log("account_generate() called")
      await account_generate(options.password)
    }
    if (options.import) {
      console.log("account_import() called")
      await account_import(options.prvKey, options.password)
    }
    if (options.export) {
      console.log("account_export() called")
      await account_export(options.index, options.password)
    }
    if (options.list) {
      console.log("account_list() called")
      await account_list()
    }
    if (options.remove) {
      console.log("account_remove() called")
      await account_remove(options.index)
    }
    if (options.balance) {
      console.log("account_balance() called")
      await account_balance(options.index, options.password)
    }
    process.exit(0)
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
  .action(async function(options) {
    if (options.ethereum) {
      console.log("send_ethereum() called")
      await send_ethereum(options.index, options.password, options.unit, options.amount)
    }
    if (options.dappchain) {
      console.log("send_dappchain() called")
      await send_dappchain(options.index, options.password, options.unit, options.amount)
    }
    if (options.withdraw) {
      console.log("withdraw() called")
      await withdraw(otions.index, options.password)
    }
    process.exit(0)
  })

program
  .command('data')
  .option('-r, --register', 'register data')
  .option('-l, --list', 'list up data')
  .option('-d, --details', 'details of data')
  .option('-I, --index <index>', 'account index')
  .option('-p, --password <password>', 'account password')
  .option('-t, --title <title>', 'data title')
  .option('-c, --cid <cid>', 'data cid')
  .action(async function(options) {
    if (options.register) {
      console.log('data_register() called')
      await data_register(options.index, options.password, options.title)
    }
    if (options.list) {
      console.log("data_list() called")
      await data_list(options.index, options.password)
    }
    if (options.details) {
      console.log("data_details() called")
      await data_details(options.index, options.password, options.cid)
    }
    process.exit(0)
  })

program
  .command('hash')
  .option('-r, --register', 'register contents')
  .option('-l, --list', 'list up contents')
  .option('-d, --details', 'details of contents')
  .option('-I, --index <index>', 'account index')
  .option('-p, --password <password>', 'account password')
  .option('-c, --cid <cid>', 'contents cid')
  .option('-f, --fee <fee>', 'contents fee')
  .option('-h, --hash <hash>', 'contents hash')
  .action(async function(options) {
    if (options.register) {
      console.log('hash_register() called')
      await hash_register(options.index, options.password, options.cid, options.hash, options.fee)
    }
    if (options.list) {
      console.log("hash_list() called")
      await hash_list(options.index, options.password)
    }
    if (options.details) {
      console.log("hash_details() called")
      await hash_details(options.index, options.password, options.hash)
    }
    process.exit(0)
  })

program
  .command('product')
  .option('-r, --register', 'register contents')
  .option('-l, --list', 'list up contents')
  .option('-d, --details', 'details of contents')
  .option('-b, --buy', 'buy contents')
  .option('-I, --index <index>', 'account index')
  .option('-p, --password <password>', 'account password')
  .option('-P, --pTokenId <pTokenId>', 'product token id')
  .option('-h, --hash <hash>', 'contents hash')

  .action(async function(options) {
    if (options.register) {
      console.log('product_register() called')
      await product_register(options.index, options.password, options.hash)
    }
    if (options.list) {
      console.log("product_list() called")
      await product_list(options.index, options.password)
    }
    if (options.details) {
      console.log("product_details() called")
      await product_details(options.index, options.password, options.pTokenId)
    }
    if (options.buy) {
      console.log("product_buy() called")
      await product_buy(options.index, options.password, options.pTokenId)
    }
    process.exit(0)
  })

program
  .command('contract')
  .option('-C, --contract', 'contract')
  .option('-l, --list', 'list with owner')
  .option('-L, --List', 'list with pTokenId')
  .option('-D, --details', 'contract details')
  .option('-d, --dc', 'distribution contract')
  .option('-s, --sc', 'search provider contract')
  .option('-i, --index <index>', 'account index')
  .option('-P, --password <password', 'account password')
  .option('-I, --Index <Index>', 'contract index')
  .option('-p, --pTokenId <pTokenId>', 'pTokenId')
  .option('-a. --address <address>', 'address')
  .option('-c. --cost <cost>', 'cost')
  .action(async function(options) {
    if(options.contract) {
      console.log("contract_contract() called")
      if(options.dc) {
        await contract_contract(options.index, options.password, options.pTokenId, options.address, options.cost, true)
      }
      if(options.sc) {
        await contract_contract(options.index, options.password, options.pTokenId, options.address, options.cost, false)
      }
    }
    if(options.list) {
      console.log("contract_list() called")
      if(options.dc) {
        await contract_list(options.index, options.password, true)
      }
      if(options.sc) {
        await contract_list(options.index, options.password, false)
      }
    }
    if(options.List) {
      console.log("contract_List() called")
      if(options.dc) {
        await contract_List(options.index, options.password, options.pTokenId, true)
      }
      if(options.sc) {
        await contract_List(options.index, options.password, options.pTokenId, false)
      }
    }
    if(options.details) {
      console.log("contract_details() called")
      if(options.dc) {
        await contract_details(options.index, options.password, options.Index, true)
      }
      if(options.sc) {
        await contract_details(options.index, options.password, options.Index, false)
      }
    }
    process.exit(0)
  })

program
  .command('token')
  .option('-l, --list', 'list up token')
  .option('-d, --details', 'details of token')
  .option('-I, --index <index>', 'account index')
  .option('-p, --password <password>', 'account password')
  .option('-c, --uTokenId <uTokenId>', 'token id')
  .action(async function(options) {
    if (options.list) {
      console.log("token_list() called")
      await token_list(options.index, options.password)
    }
    if (options.details) {
      console.log("token_details() called")
      await token_details(options.index, options.password, options.uTokenId)
    }
    process.exit(0)
  })

program
  .command('channel')
  .option('-o, --open', 'channel open')
  .option('-O, --off', 'channel off')
  .option('-d, --details', 'channel details')
  .option('-I, --index <index>', 'account index')
  .option('-p, --password <password>', 'account password')
  .option('-c, --cid <cid>', 'data cid')
  .option('-h, --hash <hash>', 'contents hash')
  .option('-n, --numOfChunks <numOfChunks>', 'number of chunks')
  .option('-t, --oTokenId <oTokenId>', 'off-chain channel token id')
  .action(async function(options) {
    if (options.open) {
      console.log("channel_open() called")
      await channel_open(options.index, options.password, options.cid, options.hash, options.numOfChunks)
    }
    if (options.off) {
      console.log("channel_off() called")
      await channel_off(options.index, options.password, options.oTokenId)
    }
    if (options.details) {
      console.log("channel_details() called")
      await channel_details(options.index, options.password, options.oTokenId)
    }
    process.exit(0)
  })

//---------------------------------------------------- manager apis ----------------------------------------------------//

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

async function enrollDistributor(distributor) {
  console.log('# init ethereum tools...')
  var EtherTools = await Ether.createAsync(0, 'p@ssw0rd')
  console.log('# init complete')

  /* init Dappchain elements */
  console.log('# init dapp tools...')
  var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
  console.log('# init complete')

  await DappTools.EnrollDistributor(distributor)
}

async function enrollSearchProvider(searchProvider) {
  console.log('# init ethereum tools...')
  var EtherTools = await Ether.createAsync(0, 'p@ssw0rd')
  console.log('# init complete')

  /* init Dappchain elements */
  console.log('# init dapp tools...')
  var DappTools = await Dapp.createAsync(EtherTools.getDappPrivateKey())
  console.log('# init complete')

  await DappTools.EnrollSearchProvider(searchProvider)
}

program
  .command('manager')
  .option('-e, --enroll_dc', 'enroll distributor')
  .option('-E, --enroll_sc', 'enroll search provider')
  .option('-s, --settle', 'settle')
  .option('-t, --test', 'test')
  .option('-a, --address <address>', 'address')
  .action(async function(options) {
    if(options.test) {
      console.log("sendAggregatedReceipt() called")
      await sendAggregatedReceipt()
    }
    if(options.enroll_dc) {
      console.log("enrollDistributor() called")
      await enrollDistributor(options.address)
    }
    if(options.enroll_sc) {
      console.log("enrollSearchProvider() called")
      await enrollSearchProvider(options.address)
    }
    process.exit(0)
  })

program.parse(process.argv)
