var Env = require('./.env.json')
const Web3 = require('web3');
const Util = require('ethereumjs-util')
const BN = require('bn.js')
const ECurve = require('ecurve')
const BI = require('bigi')
var axios = require('axios')
var Log4JS = require('log4js')
var Logger
var Logger = Log4JS.getLogger('DApp')
// Logger.level = Env.log_level
const jsonBMSP = require('../../TruffLeBToken/build/contracts/BMSP.json')
const jsonBToken = require('../../TruffLeBToken/build/contracts/BToken.json')
const jsonBChannel = require('../../TruffLeBToken/build/contracts/BChannel.json')
const jsonBconfig = require('../../TruffLeBToken/build/contracts/Bconfig.json')
const jsonBIdentity = require('../../TruffLeBIdentity/build/contracts/BIdentity.json')
const dappGatewayAddress = require('../../WebCLnt/src/gateway_dappchain_address_extdev-plasma-us1.json')

const {
  web3Signer
} = require('./web3Signer.js')
var Nacl = require('tweetnacl')
var homePath = ""

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
    Logger.debug('createAsync start:' )
    const PrivateKey = CryptoUtils.B64ToUint8Array(b64_private_key);
    const PubLicKey = CryptoUtils.publicKeyFromPrivateKey(PrivateKey)
    const CLient = new Client(
       'extdev-plasma-us1',
       'wss://extdev-plasma-us1.dappchains.com/websocket',
       'wss://extdev-plasma-us1.dappchains.com/queryws'

      // 'default',
      // 'wss://192.168.56.102:46658/websocket',
      // 'wss://192.168.56.102:46658/queryws'

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

    const BconfigCon = new WWW3.eth.Contract(
      jsonBconfig.abi,
      jsonBconfig.networks[NetworkID].address, {
        Addr
      }
    )
    const BMSPCon = new WWW3.eth.Contract(
      jsonBMSP.abi,
      jsonBMSP.networks[NetworkID].address, {
        Addr
      }
    )
    const BTokenCon = new WWW3.eth.Contract(
      jsonBToken.abi,
      jsonBToken.networks[NetworkID].address, {
        Addr
      }
    )
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
    return new DappInit_(WWW3, PrivateKey, PubLicKey, CLient, AddressMapper, EthCoin, TransferGateway, Addr, BconfigCon, BMSPCon, BTokenCon, BChannelCon, BIdentityCon)
  }

  constructor(www3, private_key, pubLic_key, cLient, address_mapper, eth_coin, transfer_gateway, addr, bconfig_con, bmsp_con, btoken_con, bchannel_con, bidentity_con) {
    this._Web3 = www3
    this._PrivateKey = private_key
    this._PubLicKey = pubLic_key
    this._CLient = cLient
    this._AddressMapper = address_mapper
    this._EthCoin = eth_coin
    this._TransferGateway = transfer_gateway
    this._Address = addr
    this._Bconfig = bconfig_con
    this._BMSP = bmsp_con
    this._BToken = btoken_con
    this._BChannel = bchannel_con
    this._BIdentity = bidentity_con

    this._TransferGateway.on(Contracts.TransferGateway.EVENT_TOKEN_WITHDRAWAL, event => {
      if (this._OnTokenWithdrawaL) {
        this._OnTokenWithdrawaL(event)
      }
    })
  }


  static async setLogger ( log ) {
    Logger = log
  }
  static async setHomeDir ( homedir ) {
    homePath = homedir
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
  async appointManager(target) {
    const From = new Address('eth', LocalAddress.fromHexString('0x' + target))
    if (!(await this._AddressMapper.hasMappingAsync(From))) {
      Logger.error("not dapp user")
      return false
    }
    const mappingInfo = await this._AddressMapper.getMappingAsync(From)
    const dappAddress = CryptoUtils.bytesToHex(mappingInfo.to.local.bytes)
    await this._BMSP.methods.appointManager(dappAddress.toLowerCase())
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

  async requestEnroll(role) {
    await this._BMSP.methods.requestEnroll(role)
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

  async getRequests() {
    var detailsArray = []
    const roles = {
      1: 'Packager',
      2: 'ContentsProvider',
      4: 'StorageProvider',
      8: 'Distributor'
    }
    const nextIndex = await this._BMSP.methods.getNextIndex().call({
      from: this._Address
    })
    const requestLength = await this._BMSP.methods.getRequestLength().call({
      from: this._Address
    })

    for (var i = parseInt(nextIndex); i < parseInt(requestLength); i++) {
      var obj = {
        index: i
      }
      var details = await this._BMSP.methods.getRequestDetails(i).call({
        from: this._Address
      })

      obj.requester = details.requester
      obj.role = roles[details.role]
      detailsArray.push(obj)
    }
    return detailsArray
  }

  async approveRole(approvals) {

    await this._BMSP.methods.approveRole(approvals)
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
  //  var isRevoke = role == 2 ? true : false;
    var isRevoke = false
    const mappingInfo = await this._AddressMapper.getMappingAsync(From)
    const dappAddress = CryptoUtils.bytesToHex(mappingInfo.to.local.bytes)
    return await this._BMSP.methods.verifyRole(dappAddress.toLowerCase(), role, isRevoke).call({
      from: this._Address
    })
  }
  //-------------------------------------------------------------------------------------------------------------------------------------//

  //-------------------------------------------------------------- get cid --------------------------------------------------------------//
  async getCID(target) {
    const From = new Address('eth', LocalAddress.fromHexString('0x' + target))
    if (!(await this._AddressMapper.hasMappingAsync(From))) {
      Logger.error("not dapp user")
      return -1
    }
    const mappingInfo = await this._AddressMapper.getMappingAsync(From)
    const dappAddress = CryptoUtils.bytesToHex(mappingInfo.to.local.bytes)
    const tx = await this._BToken.methods.getCID(dappAddress)
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
  async registerData(cid, ccid, version, fee, fileHashes, _chunks, info, targetDist, targetUser, ad) {
    if(targetDist.length == 0) targetDist = [0]
    if(targetUser.length == 0) targetUser = [0]
    await this._BToken.methods.registerData(cid, ccid, version, fee, fileHashes, _chunks)
      .send({
        from: this._Address
      })
      .on("receipt", function(receipt) {
        Logger.debug("registerData receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })
    Logger.debug(" before registerDataAttr" + JSON.stringify(ad) )
    const tx = await this._BToken.methods.registerDataAttr(ccid, version, info, targetDist, targetUser, ad)
      .send({
        from: this._Address
      })
      .on("receipt", function(receipt) {
        Logger.debug("registerDataAttr receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })
    return tx.events.NewID.returnValues.Id
  }

  async registerProduct(ccid, version, price) {
    const tx = await this._BToken.methods.registerProduct(ccid, version, price)
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

  async buyProduct(productId) {
    const productPrice = (await this.getProductDetails(productId))[2]
    const tx = await this._BToken.methods.buyProduct(productId)
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

  async chkTokenForChannelOpen(tokenId) {

    const rst = await this._BMSP.methods.verifyRole(this._Address, 4, false).call({
      from: this._Address
    })
    if( !rst ) {
      let tokenInfo = await this._BToken.methods.getTokenDetails(tokenId).call({
        from: this._Address
      })

      Logger.debug( "owner:" + tokenInfo[0].toLowerCase()  + ",_Address:" +  this._Address.toLowerCase())
      if( tokenInfo[0].toLowerCase()  == this._Address.toLowerCase() ) {
        return true
      }else{
        return false
      }
    }
    return true;
  }

  async channelOpen(tokenId, key, chunkTotNo) {
    var deposit = 0
    var total = 0
    const rst = await this._BMSP.methods.verifyRole(this._Address, 4, false).call({
      from: this._Address
    })
    if( !rst ) {
      if( chunkTotNo <= 0 ) {
        deposit = (await this.getDepositNCollateral(tokenId))
      }else{
        deposit = (await this.getDepositNCollateral2(chunkTotNo))
      }
      total = parseInt(deposit[0]) + parseInt(deposit[1])
    }

    Logger.debug("total: " + total )
    Logger.debug("receipt: " + JSON.stringify(deposit))
    // const total = 0
    const tx = await this._BChannel.methods.channelOpen(tokenId, key, chunkTotNo)
      .send({
        from: this._Address
        ,value: total
      })
      .on("receipt", function(receipt) {
        Logger.debug("receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })
    return tx.events.NewID.returnValues.Id
  }


  async channelOff(channelId, senders, chunks, murkleroot) {
  Logger.debug(senders, chunks)
  await this._BChannel.methods.settleChannel(murkleroot, channelId, senders, chunks )
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
  async getList(flag) {
    return this._BToken.methods.getList(flag).call({
      from: this._Address
    })
  }

  async _BToken(dataId) {
    return this._BChannel.methods.getFileList(dataId).call({
      from: this._Address
    })
  }

  async listFileWithDataId(dataId) {
    return this._BToken.methods.getFileList(dataId).call({
      from: this._Address
    })
  }

  async listFileWithCCIDNVersion(ccid, version) {
    return this._BToken.methods.getFileList(ccid, version).call({
      from: this._Address
    })
  }
  //-------------------------------------------------------------------------------------------------------------------------------------//

  //-------------------------------------------------------------- details --------------------------------------------------------------//
  async getDataDetailsWithId(dataId) {
    return this._BToken.methods.getDataDetails(dataId).call({
      from: this._Address
    })
  }

  async getDataDetailsWithCCIDNVersion(ccid, version) {
    return this._BToken.methods.getDataDetails(ccid, version).call({
      from: this._Address
    })
  }
  async getDataAtDetailsID(dataId) {
    return this._BToken.methods.getDataAtDetails(dataId).call({
      from: this._Address
    })
  }

  async getDataAtDetailsWithCCIDNVersion(ccid, version) {
    return this._BToken.methods.getDataAtDetails(ccid, version).call({
      from: this._Address
    })
  }

  async getFileDetailsWithId(fileId) {
    return this._BToken.methods.getFileDetails1(fileId).call({
      from: this._Address
    })
  }

  async getFileDetailsWithHash(hash) {
    return this._BToken.methods.getFileDetails2(hash).call({
      from: this._Address
    })
  }

  async getProductDetails(productId) {
    return this._BToken.methods.getProductDetails(productId).call({
      from: this._Address
    })
  }

  async getTokenDetails(tokenId) {
    return this._BToken.methods.getTokenDetails(tokenId).call({
      from: this._Address
    })
  }



  async getDepositNCollateral(tokenId) {
    return this._BChannel.methods.getDepositNCollateral(tokenId).call({
      from: this._Address
    })
  }
  async getDepositNCollateral2(totChunks) {
    return this._BChannel.methods.getDepositNCollateral2(totChunks).call({
      from: this._Address
    })
  }

  async getChannelDetails(channelId) {
    return this._BChannel.methods.getChannelDetails(channelId).call({
      from: this._Address
    })
  }

  async checkValidToken(target, cid) {
    const From = new Address('eth', LocalAddress.fromHexString('0x' + target))
    if (!(await this._AddressMapper.hasMappingAsync(From))) {
      Logger.error("not dapp user")
      return false
    }

    const mappingInfo = await this._AddressMapper.getMappingAsync(From)
    const dappAddress = CryptoUtils.bytesToHex(mappingInfo.to.local.bytes)
    return this._BChannel.methods.checkValidToken(dappAddress, cid).call({
      from: this._Address
    })
  }
  //-------------------------------------------------------------------------------------------------------------------------------------//

  //--------------------------------------------------------------- revoke --------------------------------------------------------------//
  async revokeUser(target, role, dD, dP) {
    const From = new Address('eth', LocalAddress.fromHexString('0x' + target))
    if (!(await this._AddressMapper.hasMappingAsync(From))) {
      Logger.error("not dapp user")
      return false
    }

    const mappingInfo = await this._AddressMapper.getMappingAsync(From)
    const dappAddress = CryptoUtils.bytesToHex(mappingInfo.to.local.bytes)
    await this._BMSP.methods.revokeUser(dappAddress, role, dD, dP)
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

  async revokeData(dataId, deleteAll) {
    await this._BMSP.methods.revokeData(dataId, deleteAll)
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

  async revokeProduct(productId) {
    await this._BMSP.methods.revokeProduct(productId)
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

  async verifyReceipt(signB64, publicKeyB64) {
    const sign = CryptoUtils.B64ToUint8Array(signB64)
    const publicKey = CryptoUtils.B64ToUint8Array(publicKeyB64)

    const msgBytes = Nacl.sign.open(sign, publicKey)
    if (msgBytes == null) {
      return null
    }
    const msg = JSON.parse(Buffer.from(msgBytes.buffer, msgBytes.byteOffset, msgBytes.byteLength).toString())
    return msg
  }

  async getPubKey() {
    return CryptoUtils.Uint8ArrayToB64(Util.toBuffer(CryptoUtils.bytesToHexAddr(this._PubLicKey)))
  }
  async getSignVal(msg) {
    const Msg = Buffer.from(JSON.stringify(msg))
    const sign = CryptoUtils.Uint8ArrayToB64(Nacl.sign.detached(Msg, this._PrivateKey))
    return sign
  }
  async signReceipt_d(msg) {
    const Msg = Buffer.from(JSON.stringify(msg))
    const sign = CryptoUtils.Uint8ArrayToB64(Nacl.sign.detached(Msg, this._PrivateKey))
    const pubKey = CryptoUtils.Uint8ArrayToB64(Util.toBuffer(CryptoUtils.bytesToHexAddr(this._PubLicKey)))
    return {
      sign,
      pubKey
    }
  }
  async verifyReceipt_d(msg, signB64, publicKeyB64) {
    const Msg = Buffer.from(JSON.stringify(msg))
    const sign = CryptoUtils.B64ToUint8Array(signB64)
    const publicKey = CryptoUtils.B64ToUint8Array(publicKeyB64)
    const rest = Nacl.sign.detached.verify(Msg, sign, publicKey)
    return rest
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
    // console.log("address: " + address)
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
  async sendAggregatedReceipt(channel_id, receipt) {

    //전송영수증 수신자 공개키 엳기
    const channelInfo = await this._BChannel.methods.getChannelDetails(channel_id).call({
      from: this._Address
    })
    const r_pubKey = channelInfo[2]

    Logger.debug("receipt verify r_pubKey:"  + r_pubKey )
    Logger.debug("receipt verify receipt:"  + receipt )

    //전송영수증 전자서명검사
    const signData = CryptoUtils.B64ToUint8Array(receipt)
    const publicKey = CryptoUtils.B64ToUint8Array(r_pubKey)
    const msgBytes = Nacl.sign.open(signData, publicKey)

    // Logger.debug("receipt verify msgBytes:"  + msgBytes )
    if (msgBytes == null) {
      Logger.error("sign verify error."  )
      return {  resultCode: 500, resultMessage: "sign verify error." , state : 'fail' }
    }
    const orgReceipt = JSON.parse(Buffer.from(msgBytes.buffer, msgBytes.byteOffset, msgBytes.byteLength).toString())
    // Logger.debug("sign verify ok:"  + Buffer.from(msgBytes.buffer, msgBytes.byteOffset, msgBytes.byteLength).toString() )
    Logger.debug("sign verify ok:"  + orgReceipt )
      // Logger.debug("sign verify ok:"  + JSON.stringify(orgReceipt) )
    //전송영수증 전자서명
    const msg = Buffer.from(receipt)
    const sign = CryptoUtils.Uint8ArrayToB64(Nacl.sign.detached(msg, this._PrivateKey))
    const public_key = CryptoUtils.Uint8ArrayToB64(Util.toBuffer(CryptoUtils.bytesToHexAddr(this._PubLicKey)))
    Logger.debug("sender sign:"  + sign +  ",public_key:" + public_key)

    const vInfo = await this.getConfigData()
    //const verifier_url = Env.verifier_url + ':' + Env.verifier_port + '/get-receipt'
    const verifier_url = vInfo[0] + ':' + vInfo[1] + '/receiveReceipt'
    Logger.debug("verifier_url:"  + verifier_url)
    Logger.debug("orgReceipt.From:"  + orgReceipt.From)
    Logger.debug("orgReceipt.To:"  + orgReceipt.To)
    Logger.debug("orgReceipt.File:"  + orgReceipt.File)

    const response = await axios({
      method: 'post',
      url: verifier_url,
      data: {
        channel_id,
        'from_id' : orgReceipt.From,
        'to_id' : orgReceipt.To,
        'file_id' : orgReceipt.File,
        'chunks' : orgReceipt.Chunks,
        'receipt' : receipt,
        's_sign' : sign,
        's_pubkey' : public_key
      }
    })

    if( response.status == 200 )
    {
      if( response.data.resultCode == 0 ) {
        Logger.debug("receipt send ok ")
        return {  resultCode: 0, state: 'succeed' }
      }else{
        Logger.error("receipt send error =" + response.data.result )
        return {  resultCode: 500, resultMessage: response.data.result, state : 'fail' }
      }
    }else {
      Logger.error("receipt send error, status=" + response.status + ", err=" + response.statusText )
      return {  resultCode: 500, resultMessage: response.statusText, state : 'fail' }
    }
  }

  async executeTest() {
    const ethAddress = '0xe8a524218524edc9af8a921aef70f0fa4fad7fb5'
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
    let ecodedABI = transaction.encodeABI()

    console.log(DappAddress)
    console.log(ethAddress)
    console.log(ecodedABI)

    const addressKey = '0x3064c4d8a7756f56dc24e270ddf2b61d6a7514f40cde49806c7ccc63c685662d6c73d4da388a3951f2e99accbc14b18f08eb7dc025321d65755d9f200203da47'
    const dataKey = '0xf8c461ee36647a2eefdb5f65d62b79860663d2c86858532191449f2d668931e6'
    transaction = await this._BIdentity.methods.getSignature(addressKey, dataKey)
    ecodedABI = transaction.encodeABI()

    console.log(addressKey)
    console.log(dataKey)
    console.log(ecodedABI)
  }
  //------------------------------------------------------------------------------------------------//

  async setConfigData(inurl, inport, inopenPeriod, incollection, chunkPrice, depositRatio, timeoutMili  ) {

//    var tx = await this._BChannel.methods.setConfig(chunkPrice, depositRatio, timeoutMili)
    var tx = await this._BChannel.methods.setConfig(1, 10, 1000)
      .send({
        from: this._Address
      })
      .on("receipt", function(receipt) {
        Logger.debug("receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })


    tx = await this._Bconfig.methods.setBconfig(inurl, inport, inopenPeriod, incollection)
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
  async getConfigData() {
    return this._Bconfig.methods.getBconfig().call({
      from: this._Address
    })
  }

//------------------------------------------------------------------------------------------------//

    // async getTxChannel( ) {
    //   return this._BChannel;
    // }
}


///////////////////////////////////////////////////////////////////
/* for test event
const txb64_private_key = "iCiGlOSClr3ZuZjFHVN/ia+weW7Rxg/QBsNlLyv2WO8fGa+24uMV1FeVe3GJI5uB3PQaPfbVQtd64qRI5j/oLg=="
const txPrivateKey = CryptoUtils.B64ToUint8Array(txb64_private_key);
const txPubLicKey = CryptoUtils.publicKeyFromPrivateKey(txPrivateKey)
const txCLient = new Client(
  'extdev-plasma-us1',
  'wss://extdev-plasma-us1.dappchains.com/websocket',
  'wss://extdev-plasma-us1.dappchains.com/queryws'
)

const txWWW3 = new Web3(new LoomProvider(txCLient, txPrivateKey))
const txSNetworkID = Object.keys(jsonBChannel.networks)[0]
const addr = LocalAddress.fromPublicKey(txPubLicKey).toString()
const txtx= new txWWW3.eth.Contract(
  jsonBChannel.abi,
  jsonBChannel.networks[txSNetworkID].address, {
    addr
  }
);

txtx.events.NewID( (err, event) => {
    Logger.debug("NewID event! " )
    Logger.debug("Id : " + event.returnValues.Id )
    Logger.debug("flag : " + event.returnValues.flag )
} );
*/
