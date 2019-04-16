var Env = require('../../.env.json')
const Web3 = require('web3');
const Util = require('ethereumjs-util')
const BN = require('bn.js')
const ECurve = require('ecurve')
const BI = require('bigi')
var Log4JS = require('log4js')
var Logger = Log4JS.getLogger('DApp')
Logger.level = Env.log_level
const jsonBChannel = require('../../TruffLeBToken/build/contracts/BChannel.json')
const jsonBIdentity = require('../../TruffLeBIdentity/build/contracts/BIdentity.json')
const dappGatewayAddress = require('../../WebCLnt/src/gateway_dappchain_address_extdev-plasma-us1.json')

const {
  web3Signer
} = require('./web3Signer.js')
var axios = require('axios')
var Nacl = require('tweetnacl')

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

module.exports = class DappInit_ {
  static async createAsync(b64_private_key) {
    const PrivateKey = CryptoUtils.B64ToUint8Array(b64_private_key);
    const PubLicKey = CryptoUtils.publicKeyFromPrivateKey(PrivateKey)
    const CLient = new Client(
      'extdev-plasma-us1',
      'wss://extdev-plasma-us1.dappchains.com/websocket',
      'wss://extdev-plasma-us1.dappchains.com/queryws'
    )

    CLient.on('error', msg => {
      console.error(msg)
    })

    const WWW3 = new Web3(new LoomProvider(CLient, PrivateKey))

    CLient.txMiddleware = [
      new NonceTxMiddleware(PubLicKey, CLient),
      new SignedTxMiddleware(PrivateKey)
    ]

    const AddressMapper = await Contracts.AddressMapper.createAsync(
      CLient,
      new Address(CLient.chainId, LocalAddress.fromPublicKey(PubLicKey))
    )

    const EthCoin = await Contracts.EthCoin.createAsync(
      CLient,
      new Address(CLient.chainId, LocalAddress.fromPublicKey(PubLicKey))
    )

    const TransferGateway = await Contracts.TransferGateway.createAsync(
      CLient,
      new Address(CLient.chainId, LocalAddress.fromPublicKey(PubLicKey))
    )

    const NetworkID = Object.keys(jsonBChannel.networks)[0]
    const Addr = LocalAddress.fromPublicKey(PubLicKey).toString()
    const BChannelCon = new WWW3.eth.Contract(
      jsonBChannel.abi,
      jsonBChannel.networks[NetworkID].address, {
        Addr
      }
    )

    const BIdentityCon = new WWW3.eth.Contract(
      jsonBIdentity.abi,
      jsonBIdentity.networks[NetworkID].address, {
        Addr
      }
    )

    return new DappInit_(WWW3, PrivateKey, PubLicKey, CLient, AddressMapper, EthCoin, TransferGateway, Addr, BChannelCon, BIdentityCon)
  }

  constructor(www3, private_key, pubLic_key, cLient, address_mapper, eth_coin, transfer_gateway, addr, bchannel_con, bidentity_con) {
    this._Web3 = www3
    this._PrivateKey = private_key
    this._PubLicKey = pubLic_key
    this._CLient = cLient
    this._AddressMapper = address_mapper
    this._EthCoin = eth_coin
    this._TransferGateway = transfer_gateway
    this._Address = addr
    this._BChannel = bchannel_con
    this._BIdentity = bidentity_con
    this._TransferGateway.on(Contracts.TransferGateway.EVENT_TOKEN_WITHDRAWAL, event => {
      if (this._OnTokenWithdrawaL) {
        this._OnTokenWithdrawaL(event)
      }
    })
  }

  // dapp_account
  GetPrivateKey() {
    return this._PrivateKey
  }

  GetPubLicKey() {
    return this._PubLicKey
  }

  GetCLient() {
    return this._CLient
  }

  GetAddress() {
    return this._Address
  }

  GetAccount() {
    return LocalAddress.fromPublicKey(this._PubLicKey).toString()
  }

  async GetAddressMappingAsync(eth_address) {
    try {
      const From = new Address('eth', LocalAddress.fromHexString(eth_address))
      return await this._AddressMapper.getMappingAsync(From)
    } catch (_) {
      return null
    }
  }

  async SignAsync(wallet) {
    const From = new Address('eth', LocalAddress.fromHexString(wallet.getAddressString()))
    const To = new Address(this._CLient.chainId, LocalAddress.fromPublicKey(this._PubLicKey))
    const WWW3Signer = new web3Signer(wallet.getPrivateKey())
    if (await this._AddressMapper.hasMappingAsync(From)) {
      const mappingInfo = await this._AddressMapper.getMappingAsync(From)
      const ethAddress = CryptoUtils.bytesToHexAddr(mappingInfo.from.local.bytes)
      const dappAddress = CryptoUtils.bytesToHexAddr(mappingInfo.to.local.bytes)
      return {
        ethAddress: ethAddress,
        dappAddress: dappAddress
      }
    }
    await this._AddressMapper.addIdentityMappingAsync(From, To, WWW3Signer)
    return {
      ethAddress: wallet.getAddressString(),
      dappAddress: Util.bufferToHex(LocalAddress.fromPublicKey(this._PubLicKey).bytes)
    }
  }

  async ApproveAsync(amount) {
    return await this._EthCoin.approveAsync(
      new Address(
        this._CLient.chainId,
        LocalAddress.fromHexString(dappGatewayAddress.address)
      ),
      new BN(amount)
    )
  }

  async GetBaLanceAsync() {
    const UserAddress = new Address(this._CLient.chainId, LocalAddress.fromPublicKey(this._PubLicKey))
    return await this._EthCoin.getBalanceOfAsync(UserAddress)
  }

  // dapp_gateway
  OnTokenWithdrawaL(fn) {
    this._OnTokenWithdrawaL = fn
  }

  async WithdrawEthAsync(amount) {
    await this._TransferGateway.withdrawETHAsync(
      new BN(amount),
      new Address(
        this._CLient.chainId,
        LocalAddress.fromHexString(dappGatewayAddress.address)
      )
    )
  }

  async WithdrawaLReceiptAsync(address) {
    return await this._TransferGateway.withdrawalReceiptAsync(
      new Address(this._CLient.chainId, LocalAddress.fromHexString(address))
    )
  }

  //----------------------------------------------------------------- msp ---------------------------------------------------------------//
  async requestEnroll(role) {
    await this._BChannel.methods.requestEnroll(role)
      .send({
        from: this._Address
      })
      .on("receipt", function(receipt) {
        Logger.debug("receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })
  }

  async getRequestDetails() {
    var detailsArray = []
    const roles = {
      1: 'Packager',
      2: 'ContentsProvider',
      4: 'StorageProvider',
      8: 'Distributor'
    }
    const nextIndex = await this._BChannel.methods.getNextIndex().call({
      from: this._Address
    })
    const requestLength = await this._BChannel.methods.getRequestLength().call({
      from: this._Address
    })
    for (var i = nextIndex; i < requestLength; i++) {
      var obj = {
        index: i
      }
      var details = await this._BChannel.methods.getRequestDetails(i).call({
        from: this._Address
      })
      obj.requester = details.requester
      obj.role = roles[details.role]
      detailsArray.push(obj)
    }
    return detailsArray
  }

  async approveRole(approvals) {
    await this._BChannel.methods.approveRole(approvals)
      .send({
        from: this._Address
      })
      .on("receipt", function(receipt) {
        Logger.debug("receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })
  }

  async revokeRole(target, role) {
    const From = new Address('eth', LocalAddress.fromHexString('0x' + target))
    if (!(await this._AddressMapper.hasMappingAsync(From))) {
        Logger.error("not dapp user")
        return false
    }
    const mappingInfo = await this._AddressMapper.getMappingAsync(From)
    const dappAddress = CryptoUtils.bytesToHex(mappingInfo.to.local.bytes)
    await this._BChannel.methods.revokeRole(dappAddress, role)
      .send({
        from: this._Address
      })
      .on("receipt", function(receipt) {
        Logger.debug("receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })
  }

  async verifyRole(target, role) {
    const From = new Address('eth', LocalAddress.fromHexString('0x' + target))
    if (!(await this._AddressMapper.hasMappingAsync(From))) {
        Logger.error("not dapp user")
        return false
    }
    const mappingInfo = await this._AddressMapper.getMappingAsync(From)
    const dappAddress = CryptoUtils.bytesToHex(mappingInfo.to.local.bytes)
    return await this._BChannel.methods.verifyRole(dappAddress.toLowerCase(), role).call({
      from: this._Address
    })
  }

  async requestCleanup() {
    await this._BChannel.methods.cleanupRequest()
    .send({
      from: this._Address
    })
    .on("receipt", function(receipt) {
      Logger.debug("receipt: " + JSON.stringify(receipt))
    })
    .on("error", function(error) {
      Logger.error("error occured: " + error)
    })
  }
  //-------------------------------------------------------------------------------------------------------------------------------------//

  //-------------------------------------------------------------- get cid --------------------------------------------------------------//
    async getCID() {
      const tx = await this._BChannel.methods.getCID()
      .send({
        from: this._Address
      })
      .on("receipt", function(receipt) {
        Logger.debug("receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })
      return tx.events.NewID.returnValues.Id
    }
  //-------------------------------------------------------------------------------------------------------------------------------------//

  //-------------------------------------------------------- invoke transaction ---------------------------------------------------------//
  async registData(cid, ccid, version, category, subCategory, title, fileDetails) {
    const tx = await this._BChannel.methods.registData(this._Address, cid, ccid, version, category, subCategory, title, fileDetails)
    .send({
      from: this._Address
    })
    .on("receipt", function(receipt) {
      Logger.debug("receipt: " + JSON.stringify(receipt))
    })
    .on("error", function(error) {
      Logger.error("error occured: " + error)
    })
    return tx.events.NewID.returnValues.Id
  }

  async registFileFee(ccid, version, filePath, fee, chunks) {
    await this._BChannel.methods.registFileFee(ccid, version, filePath, fee, chunks)
    .send({
      from: this._Address
    })
    .on("receipt", function(receipt) {
      Logger.debug("receipt: " + JSON.stringify(receipt))
    })
    .on("error", function(error) {
      Logger.error("error occured: " + error)
    })
  }

  async registProduct(ccid, version, filePath, price) {
    const tx = await this._BChannel.methods.registProduct(ccid, version, filePath, price)
    .send({
      from: this._Address
    })
    .on("receipt", function(receipt) {
      Logger.debug("receipt: " + JSON.stringify(receipt))
    })
    .on("error", function(error) {
      Logger.error("error occured: " + error)
    })
    return tx.events.NewID.returnValues.Id
  }

  async buyToken(productId) {
    const productPrice = (await this.getProductDetails(productId)).price
    const tx = await this._BChannel.methods.buyProduct(productId)
    .send({
      from: this._Address,
      value: productPrice
    })
    .on("receipt", function(receipt) {
      Logger.debug("receipt: " + JSON.stringify(receipt))
    })
    .on("error", function(error) {
      Logger.error("error occured: " + error)
    })
    return tx.events.NewID.returnValues.Id
  }

  async channelOpen(tokenId) {
    const deposit = (await this.getDepositAmount(tokenId))
    const tx = await this._BChannel.methods.channelOpen(tokenId)
    .send({
      from: this._Address,
      value: deposit
    })
    .on("receipt", function(receipt) {
      Logger.debug("receipt: " + JSON.stringify(receipt))
    })
    .on("error", function(error) {
      Logger.error("error occured: " + error)
    })
    return tx.events.NewID.returnValues.Id
  }

  async channelOff(channelId) {
    await this._BChannel.methods.channelOff(channelId)
    .send({
      from: this._Address,
    })
    .on("receipt", function(receipt) {
      Logger.debug("receipt: " + JSON.stringify(receipt))
    })
    .on("error", function(error) {
      Logger.error("error occured: " + error)
    })
  }

  async channelSettle(channelId, senders, chunks) {
    await this._BChannel.methods.settleChannel(channelId, senders, chunks)
    .send({
      from: this._Address,
    })
    .on("receipt", function(receipt) {
      Logger.debug("receipt: " + JSON.stringify(receipt))
    })
    .on("error", function(error) {
      Logger.error("error occured: " + error)
    })
  }

  //-------------------------------------------------------------------------------------------------------------------------------------//

  //--------------------------------------------------------------- list ----------------------------------------------------------------//
  async getDataList() {
    return this._BChannel.methods.getDataList().call({from: this._Address})
  }

  async getProductList() {
    return this._BChannel.methods.getProductList().call({from: this._Address})
  }

  async getTokenList() {
    return this._BChannel.methods.getTokenList().call({from: this._Address})
  }
  //-------------------------------------------------------------------------------------------------------------------------------------//

  //-------------------------------------------------------------- details --------------------------------------------------------------//
  async getDataDetails(dataId) {
    return this._BChannel.methods.getDataDetails(dataId).call({from: this._Address})
  }

  async getFileFee(ccid, version, filePath) {
    return this._BChannel.methods.getFileFee(ccid, version, filePath).call({from: this._Address})
  }

  async getProductDetails(productId) {
    return this._BChannel.methods.getProductDetails(productId).call({from: this._Address})
  }

  async getTokenDetails(tokenId) {
    return this._BChannel.methods.getTokenDetails(tokenId).call({from: this._Address})
  }

  async getDepositAmount(tokenId) {
    return this._BChannel.methods.getDepositAmount(tokenId).call({from: this._Address})
  }

  async getChannelDetails(channelId) {
    return this._BChannel.methods.getChannelDetails(channelId).call({from: this._Address})
  }
  //-------------------------------------------------------------------------------------------------------------------------------------//


  //---------------------------------------------------------------- sign ---------------------------------------------------------------//
  async signReceipt(msg) {
    const Msg = Buffer.from(JSON.stringify(msg))
    const sign = CryptoUtils.Uint8ArrayToB64(Nacl.sign(Msg, this._PrivateKey))
    const pubKey = CryptoUtils.Uint8ArrayToB64(Util.toBuffer(CryptoUtils.bytesToHexAddr(this._PubLicKey)))
    return {
      sign,
      pubKey
    }
  }

  async verifyReceript(signB64, publicKeyB64) {
    const sign = CryptoUtils.B64ToUint8Array(signB64)
    const publicKey = CryptoUtils.B64ToUint8Array(publicKeyB64)
    const msgBytes = Nacl.sign.open(sign, publicKey)
    const msg = JSON.parse(Buffer.from(msgBytes.buffer, msgBytes.byteOffset, msgBytes.byteLength).toString())
    return msg
  }
  //-------------------------------------------------------------------------------------------------------------------------------------//

  //---------------------------------------------------------------- test ---------------------------------------------------------------//
  //------------------------------------------- identity -------------------------------------------//
  async enrollIssuer(ethAddress) {
    const EthAddress = new Address('eth', LocalAddress.fromHexString(ethAddress))
    var DappAddress
    if (await this._AddressMapper.hasMappingAsync(EthAddress)) {
      const mappingInfo = await this._AddressMapper.getMappingAsync(EthAddress)
      DappAddress = CryptoUtils.bytesToHexAddr(mappingInfo.to.local.bytes)
    } else {
      Logger.error("unmapped address")
      return
    }

    let transaction = await this._BIdentity.methods.enrollIssuer(DappAddress, ethAddress)
      .send({
        from: this._Address
      })
      .on("receipt", function(receipt) {
        Logger.debug("receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })
    return transaction.events.NewIssuer.returnValues.issuer
  }

  async getAddressKey(address) {
    console.log("address: " + address)
    var ecparams = ECurve.getCurveByName('secp256k1')
    var convert = ecparams.G.multiply(BI.fromBuffer(new Buffer(address.substring(2), 'hex')))
    return Buffer.concat([convert.affineX.toBuffer(32), convert.affineY.toBuffer(32)])
  }

  async getDataHash(addressKey, data) {
    return Util.keccak256(addressKey + JSON.stringify(data))
  }

  async requestAdd(addressKey, dataHash, privateKey) {
    var ecSign = Util.ecsign(dataHash, privateKey)
    var signature = Util.bufferToHex(ecSign.r) + Util.bufferToHex(ecSign.s).substr(2) + Util.bufferToHex(ecSign.v).substr(2)
    const transaction = await this._BIdentity.methods.requestAdd('0x' + addressKey.toString('hex'), '0x' + dataHash.toString('hex'), signature)
      .send({
        from: this._Address
      })
      .on("receipt", function(receipt) {
        Logger.debug("receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })
    return transaction.events.RequestAdd.returnValues.requestKey
  }

  async approveAdd(dataHash, requestKey, isApprove) {
    const transaction = await this._BIdentity.methods.approveAdd('0x' + dataHash.toString('hex'), requestKey, isApprove)
      .send({
        from: this._Address
      })
      .on("receipt", function(receipt) {
        Logger.debug("receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })
  }

  async getSignature(addressKey, dataHash) {
    return await this._BIdentity.methods.getSignature('0x' + addressKey.toString('hex'), '0x' + dataHash.toString('hex'))
      .call({
        from: this._Address
      })
  }
  //------------------------------------------------------------------------------------------------//

  //------------------------------------------- verifier -------------------------------------------//
  async sendAggregatedReceipt(msg) {
    const Msg = Buffer.from(JSON.stringify(msg))
    const sign = CryptoUtils.Uint8ArrayToB64(Nacl.sign(Msg, this._PrivateKey))
    // const public_key = CryptoUtils.Uint8ArrayToB64(Util.toBuffer(CryptoUtils.bytesToHexAddr(this._PubLicKey)))
    const public_key = 'HxmvtuLjFdRXlXtxiSObgdz0Gj321ULXeuKkSOY/6C4='

    await axios({
        method: 'post',
        url: 'http://127.0.0.1:3003/get_receipt',
        data: {
          sign,
          public_key
        }
      })
      .then((res) => {
        Logger.debug(JSON.stringify(res.data))
      })
  }
  //------------------------------------------------------------------------------------------------//
}
