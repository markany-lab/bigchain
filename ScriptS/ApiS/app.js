var Env = require('../../.env.json')
var Ether = require('./ether.js')
var Dapp = require('./dapp.js')
var Util = require('ethereumjs-util')
var Web3Util = require('web3-utils')
var Log4JS = require('log4js')
var Logger = Log4JS.getLogger('API MAIN')
Logger.level = Env.log_level
var {
  CryptoUtils
} = require('loom-js')
var program = require('commander')
var crypto = require('crypto')

async function initTools(index, password) {
  /* init Ethereum elements */
  Logger.debug('init ethereum tools...')
  var EtherTools = await Ether.createAsync(index, password)
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

async function account_generate(password) {
  try {
    const index = await Ether.generateAccount(password)
    var Tools = await initTools(index, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const mappingResult = await DappTools.SignAsync(EtherTools.getWallet())
    console.log(JSON.stringify(mappingResult))
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

async function account_import(privateKey, password) {
  try {
    const index = await Ether.importAccount(privateKey, password)
    var Tools = await initTools(index, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const mappingResult = await DappTools.SignAsync(EtherTools.getWallet())
    console.log(JSON.stringify(mappingResult))
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

async function account_export(index, password) {
  try {
    const privateKey = await Ether.exportAccount(index, password)
    console.log(JSON.stringify({
      privateKey
    }))
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

async function account_remove(index) {
  try {
    const removedAddress = await Ether.removeAccount(index)
    console.log(JSON.stringify({
      remove: removedAddress
    }))
  } catch (error) {
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

async function account_balance(index, password) {
  try {
    var Tools = await initTools(index, password)
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
    Logger.error('error occured: ' + error)
  }
}

async function send_ethereum(index, password, unit, amount) {
  try {
    var EtherTools = await Ether.createAsync(index, password)

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
    Logger.error('error occured: ' + error)
  }
}

async function send_dappchain(index, password, unit, amount) {
  try {
    var Tools = await initTools(index, password)
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
      Logger.error('error occured: ' + error)
    }
  }
}

async function withdraw(index, password) {
  try {
    var Tools = await initTools(index, password)
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
    Logger.error('error occured: ' + error)
  }
}

async function data_register(index, password, title) {
  try {
    var Tools = await initTools(index, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    Logger.debug("register data...")
    const newData = await DappTools.RegisterData(title)
    console.log(JSON.stringify(newData))
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

async function data_list(index, password) {
  try {
    var Tools = await initTools(index, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const cids = await DappTools.GetOwnedDsAsync()
    console.log(JSON.stringify({
      cids
    }))
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

async function data_details(index, password, cid) {
  try {
    var Tools = await initTools(index, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    if (!(await DappTools.IsExistsData(cid))) {
      console.log(JSON.stringify({
        error: 'unkown cid'
      }))
      return
    }
    const details = await DappTools.GetDataWithID(cid)
    console.log(JSON.stringify({
      details
    }))
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

async function hash_register(index, password, cid, hash, fee) {
  try {
    var Tools = await initTools(index, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    Logger.debug('register hash...')
    const newHash = await DappTools.RegisterHash(cid, hash, fee)
    console.log(JSON.stringify({
      newHash
    }))
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

async function hash_list(index, password) {
  try {
    var Tools = await initTools(index, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    var list = []
    const cids = await DappTools.GetOwnedDsAsync()
    for (var i = 0; i < cids.length; i++) {
      const hashes = await DappTools.GetOwnedHsAsync(cids[i])
      list.push({
        cid: cids[i],
        hashes
      })
    }
    console.log(JSON.stringify({
      list
    }))

  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

async function hash_details(index, password, hash) {
  try {
    var Tools = await initTools(index, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    if (!(await DappTools.IsExistsHash(hash))) {
      console.log(JSON.stringify({
        error: 'unkown hash'
      }))
      return
    }
    const details = await DappTools.GetHashWithCIDandHash(hash)
    console.log(JSON.stringify({
      details
    }))
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

async function product_register(index, password, hash) {
  try {
    var Tools = await initTools(index, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    if (!(await DappTools.IsExistsHash(hash))) {
      console.log(JSON.stringify({
        error: 'unkown hash'
      }))
      return
    }
    Logger.debug('register product...')
    const newPToken = await DappTools.RegisterProduct(hash, 10000)
    console.log(JSON.stringify({
      newPToken
    }))
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

async function product_list(index, password) {
  try {
    var Tools = await initTools(index, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const pTokenIds = await DappTools.GetOwnedPTsAsync()
    console.log(JSON.stringify({
      pTokenIds
    }))
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

async function product_details(index, password, pTokenId) {
  try {
    var Tools = await initTools(index, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    if (!(await DappTools.IsExistsPToken(pTokenId))) {
      console.log(JSON.stringify({
        error: 'unkown pTokenId'
      }))
      return
    }

    const details = await DappTools.GetPTWithID(pTokenId)
    console.log(JSON.stringify({
      details
    }))
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

async function product_buy(index, password, pTokenId) {
  try {
    var Tools = await initTools(index, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    Logger.debug('buy product...')
    const newUToken = await DappTools.BuyToken(pTokenId)
    console.log(JSON.stringify({
      newUToken
    }))
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

async function contract_contract(index, password, pTokenId, address, cost, isDc) {
  try {
    var Tools = await initTools(index, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    if (!(await DappTools.IsExistsPToken(pTokenId))) {
      console.log(JSON.stringify({
        error: 'unkown pTokenId'
      }))
      return
    }
    if (isDc) {
      Logger.debug('sign distribution contract...')
      const newDC = await DappTools.DistributionContract(pTokenId, address, cost)
      console.log(JSON.stringify({
        newDC
      }))
    } else {
      Logger.debug('sign search provider contract...')
      const newSC = await DappTools.SearchProviderContract(pTokenId, address, cost)
      console.log(JSON.stringify({
        newSC
      }))
    }
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

async function contract_list(index, password, isDc) {
  try {
    var Tools = await initTools(index, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    if (isDc) {
      const dcList = await DappTools.GetOwnedDCsAsync()
      console.log(JSON.stringify({
        dcList
      }))
    } else {
      const scList = await DappTools.GetOwnedSCsAsync()
      console.log(JSON.stringify({
        scList
      }))
    }
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

async function contract_List(index, password, pTokenId, isDc) {
  try {
    var Tools = await initTools(index, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    if (!(await DappTools.IsExistsPToken(pTokenId))) {
      console.log(JSON.stringify({
        error: 'unkown pTokenId'
      }))
      return
    }
    if (isDc) {
      const dcList = await DappTools.GetOwnedDCsWithPTokenAsync(pTokenId)
      console.log(JSON.stringify({
        dcList
      }))
    } else {
      const scList = await DappTools.GetOwnedSCsWithPTokenAsync(pTokenId)
      console.log(JSON.stringify({
        scList
      }))
    }
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

async function contract_details(index, password, Index, isDc) {
  try {
    var Tools = await initTools(index, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    if (isDc) {
      const details = await DappTools.GetDCWithID(Index)
      console.log(JSON.stringify({
        details
      }))
    } else {
      const details = await DappTools.GetSCWithID(Index)
      console.log(JSON.stringify({
        details
      }))
    }
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

async function token_list(index, password) {
  try {
    var Tools = await initTools(index, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const list = await DappTools.GetOwnedUTsAsync()
    console.log(JSON.stringify({
      list
    }))
  } catch (error) {
    Logger.error('error occured: ' + error)
  }

}

async function token_details(index, password, uTokenId) {
  try {
    var Tools = await initTools(index, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    if (!(await DappTools.IsExistsUToken(uTokenId))) {
      console.log(JSON.stringify({
        error: 'unkown uTokenId'
      }))
      return
    }
    let details = await DappTools.GetUTWithID(uTokenId)
    var state = ['sold', 'in progress', 'settled']
    details.state = state[details.states]
    console.log(JSON.stringify({
      details
    }))
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

async function channel_open(index, password, cid, hash, numOfChunks) {
  try {
    var Tools = await initTools(index, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools
    await DappTools.ChannelOpen(cid, hash, numOfChunks)
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

async function channel_off(index, password, oTokenId) {
  try {
    var Tools = await initTools(index, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools
    await DappTools.ChannelOff(oTokenId)
  } catch (error) {
    Logger.error('error occured: ' + error)
  }

}

async function channel_details(index, password, oTokenId) {
  try {
    var Tools = await initTools(index, password)
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools

    const details = await DappTools.GetOTWithID(oTokenId)
    console.log(JSON.stringify({
      details
    }))
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
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
      await account_export(options.index, options.password)
    }
    if (options.list) {
      Logger.debug("account_list() called")
      await account_list()
    }
    if (options.remove) {
      Logger.debug("account_remove() called")
      await account_remove(options.index)
    }
    if (options.balance) {
      Logger.debug("account_balance() called")
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
      Logger.debug("send_ethereum() called")
      await send_ethereum(options.index, options.password, options.unit, options.amount)
    }
    if (options.dappchain) {
      Logger.debug("send_dappchain() called")
      await send_dappchain(options.index, options.password, options.unit, options.amount)
    }
    if (options.withdraw) {
      Logger.debug("withdraw() called")
      await withdraw(options.index, options.password)
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
      Logger.debug('data_register() called')
      await data_register(options.index, options.password, options.title)
    }
    if (options.list) {
      Logger.debug("data_list() called")
      await data_list(options.index, options.password)
    }
    if (options.details) {
      Logger.debug("data_details() called")
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
      Logger.debug('hash_register() called')
      await hash_register(options.index, options.password, options.cid, options.hash, options.fee)
    }
    if (options.list) {
      Logger.debug("hash_list() called")
      await hash_list(options.index, options.password)
    }
    if (options.details) {
      Logger.debug("hash_details() called")
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
      Logger.debug('product_register() called')
      await product_register(options.index, options.password, options.hash)
    }
    if (options.list) {
      Logger.debug("product_list() called")
      await product_list(options.index, options.password)
    }
    if (options.details) {
      Logger.debug("product_details() called")
      await product_details(options.index, options.password, options.pTokenId)
    }
    if (options.buy) {
      Logger.debug("product_buy() called")
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
    if (options.contract) {
      Logger.debug("contract_contract() called")
      if (options.dc) {
        await contract_contract(options.index, options.password, options.pTokenId, options.address, options.cost, true)
      }
      if (options.sc) {
        await contract_contract(options.index, options.password, options.pTokenId, options.address, options.cost, false)
      }
    }
    if (options.list) {
      Logger.debug("contract_list() called")
      if (options.dc) {
        await contract_list(options.index, options.password, true)
      }
      if (options.sc) {
        await contract_list(options.index, options.password, false)
      }
    }
    if (options.List) {
      Logger.debug("contract_List() called")
      if (options.dc) {
        await contract_List(options.index, options.password, options.pTokenId, true)
      }
      if (options.sc) {
        await contract_List(options.index, options.password, options.pTokenId, false)
      }
    }
    if (options.details) {
      Logger.debug("contract_details() called")
      if (options.dc) {
        await contract_details(options.index, options.password, options.Index, true)
      }
      if (options.sc) {
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
      Logger.debug("token_list() called")
      await token_list(options.index, options.password)
    }
    if (options.details) {
      Logger.debug("token_details() called")
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
      Logger.debug("channel_open() called")
      await channel_open(options.index, options.password, options.cid, options.hash, options.numOfChunks)
    }
    if (options.off) {
      Logger.debug("channel_off() called")
      await channel_off(options.index, options.password, options.oTokenId)
    }
    if (options.details) {
      Logger.debug("channel_details() called")
      await channel_details(options.index, options.password, options.oTokenId)
    }
    process.exit(0)
  })

//---------------------------------------------------- manager apis ----------------------------------------------------//

async function sendAggregatedReceipt() {
  try {
    var Tools = await initTools(0, 'p@ssw0rd')
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools
    await DappTools.sendAggregatedReceipt()
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

async function enrollDistributor(distributor) {
  try {
    var Tools = await initTools(0, 'p@ssw0rd')
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools
    await DappTools.EnrollDistributor(distributor)
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

async function enrollSearchProvider(searchProvider) {
  try {
    var Tools = await initTools(0, 'p@ssw0rd')
    var EtherTools = Tools.EtherTools
    var DappTools = Tools.DappTools
    await DappTools.EnrollSearchProvider(searchProvider)
  } catch (error) {
    Logger.error('error occured: ' + error)
  }
}

program
  .command('manager')
  .option('-e, --enroll_dc', 'enroll distributor')
  .option('-E, --enroll_sc', 'enroll search provider')
  .option('-s, --settle', 'settle')
  .option('-t, --test', 'test')
  .option('-a, --address <address>', 'address')
  .action(async function(options) {
    if (options.test) {
      Logger.debug("sendAggregatedReceipt() called")
      await sendAggregatedReceipt()
    }
    if (options.enroll_dc) {
      Logger.debug("enrollDistributor() called")
      await enrollDistributor(options.address)
    }
    if (options.enroll_sc) {
      Logger.debug("enrollSearchProvider() called")
      await enrollSearchProvider(options.address)
    }
    process.exit(0)
  })

async function addRequest() {
  try {
    var Tools = []
    var EtherTools = []
    var DappTools = []
    var wallet = []
    Tools.push(await initTools(0, 'p@ssw0rd'))
    EtherTools.push(Tools[0].EtherTools)
    DappTools.push(Tools[0].DappTools)
    wallet.push(EtherTools[0].getWallet())
    console.log(wallet.getPrivateKeyString())
  } catch (error) {
    Logger.error('error occured: ' + error)
  }

  program
    .command('identity')
    .option('-t, --test', 'test')
    .action(async function(options) {
      if (options.test) {
        Logger.debug("sendAggregatedReceipt() called")
        await sendAggregatedReceipt()
      }
      process.exit(0)
    })
}

program.parse(process.argv)
