var Env = require('../../.env.json')
const Web3 = require('web3');
const Util = require('ethereumjs-util')
const BN = require('bn.js')
var Log4JS = require('log4js')
var Logger = Log4JS.getLogger('Ether')
Logger.level = Env.log_level
const jsonBToken = require('../../TruffLeBToken/build/contracts/BToken.json')
const jsonBChannel = require('../../TruffLeBToken/build/contracts/BChannel.json')
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

    const NetworkID = Object.keys(jsonBToken.networks)[0]
    const Addr = LocalAddress.fromPublicKey(PubLicKey).toString()
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

    return new DappInit_(WWW3, PrivateKey, PubLicKey, CLient, AddressMapper, EthCoin, TransferGateway, Addr, BTokenCon, BChannelCon)
  }

  constructor(www3, private_key, pubLic_key, cLient, address_mapper, eth_coin, transfer_gateway, addr, btoken_con, bchannel_con) {
    this._Web3 = www3
    this._PrivateKey = private_key
    this._PubLicKey = pubLic_key
    this._CLient = cLient
    this._AddressMapper = address_mapper
    this._EthCoin = eth_coin
    this._TransferGateway = transfer_gateway
    this._Address = addr
    this._BToken = btoken_con
    this._BChannel = bchannel_con
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
      return {newAddress: ethAddress, mappedAddress: dappAddress}
    }
    await this._AddressMapper.addIdentityMappingAsync(From, To, WWW3Signer)
    return {newAddress: wallet.getAddressString(), mappedAddress: LocalAddress.fromPublicKey(this._PubLicKey)}
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

  //+++++++++++++++++++++++++++++ dapp_btoken +++++++++++++++++++++++++++++//

  //--------------------------------- list --------------------------------//
  async GetOwnedDsAsync() {
    const From = this._Address
    return await this._BToken.methods.getOwnedDatas().call({
      from: From
    })
  }

  async GetOwnedHsAsync(cid) {
    const From = this._Address
    return await this._BToken.methods.getOwnedHashes(cid).call({
      from: From
    })
  }

  async GetOwnedPTsAsync() {
    const From = this._Address
    return await this._BToken.methods.getOwnedPTokens().call({
      from: From
    })
  }

  async GetOwnedDCsAsync() {
    const From = this._Address
    return await this._BToken.methods.getOwnedDCs().call({
      from: From
    })
  }

  async GetOwnedDCsWithPTokenAsync(pTokenId) {
    const From = this._Address
    return await this._BToken.methods.getOwnedDCsWithPToken(pTokenId).call({
      from: From
    })
  }

  async GetOwnedSCsAsync() {
    const From = this._Address
    return await this._BToken.methods.getOwnedSCs().call({
      from: From
    })
  }

  async GetOwnedSCsWithPTokenAsync(pTokenId) {
    const From = this._Address
    return await this._BToken.methods.getOwnedSCsWithPToken(pTokenId).call({
      from: From
    })
  }

  async GetOwnedUTsAsync() {
    const From = this._Address
    return await this._BToken.methods.getOwnedUTokens().call({
      from: From
    })
  }
  //-----------------------------------------------------------------------//


  //------------------------------- details -------------------------------//
  async GetDataWithID(cid) {
    const From = this._Address
    return await this._BToken.methods._Ds(cid).call({
      from: From
    })
  }

  async GetHashWithCIDandHash(hash) {
    const From = this._Address
    return await this._BToken.methods.Hash2Contents(hash).call({
      from: From
    })
  }

  async GetPTWithID(pTokenId) {
    const From = this._Address
    return await this._BToken.methods._PTs(pTokenId).call({
      from: From
    })
  }

  async GetDCWithID(dcIndex) {
    const From = this._Address
    return await this._BToken.methods.getDCDetails(dcIndex).call({
      from: From
    })
  }

  async GetSCWithID(scIndex) {
    const From = this._Address
    return await this._BToken.methods.getSCDetails(scIndex).call({
      from: From
    })
  }

  async GetUTWithID(uTokenId) {
    const From = this._Address
    return await this._BToken.methods.getUTokenDetails(uTokenId).call({
      from: From
    })
  }

  async GetOTWithID(oTokenId) {
    const From = this._Address
    return await this._BChannel.methods.getOTokenDetails(oTokenId).call({
      from: From
    })
  }
  //-----------------------------------------------------------------------//

  //------------------------------ existance ------------------------------//
  async IsExistsData(cid) {
    const From = this._Address
    return this._BToken.methods.existsD(cid).call({
      from: From
    })
  }

  async IsExistsHash(hash) {
    const From = this._Address
    return this._BToken.methods.existsH(hash).call({
      from: From
    })
  }

  async IsExistsPToken(pTokenId) {
    const From = this._Address
    return this._BToken.methods.existsP(pTokenId).call({
      from: From
    })
  }

  async IsExistsDC(dcIndex) {
    const From = this._Address
    return this._BToken.methods.existsDC(dcIndex).call({
      from: From
    })
  }

  async IsExistsSC(scIndex) {
    const From = this._Address
    return this._BToken.methods.existsDC(scIndex).call({
      from: From
    })
  }

  async IsExistsUToken(uTokenId) {
    const From = this._Address
    return this._BToken.methods.existsU(uTokenId).call({
      from: From
    })
  }

  async IsExistsOToken(oTokenId) {
    const From = this._Address
    return this._BChannel.methods.existsO(oTokenId).call({
      from: From
    })
  }
  //-----------------------------------------------------------------------//

  //-------------------------------- APIs ---------------------------------//
  async EnrollDistributor(distributor) {
    const From = this._Address
    return await this._BToken.methods.enrollDistributor(distributor)
      .send({
        from: From
      })
      .on("receipt", function(receipt) {
        Logger.debug("receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })
  }

  async EnrollSearchProvider(searchProvider) {
    const From = this._Address
    return await this._BToken.methods.enrollSearchProvider(searchProvider)
      .send({
        from: From
      })
      .on("receipt", function(receipt) {
        Logger.debug("receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })
  }

  async RegisterData(titLe) {
    const From = this._Address
    const transaction = await this._BToken.methods.registerData(titLe)
      .send({
        from: From
      })
      .on("receipt", function(receipt) {
        Logger.debug("receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })
    return transaction.events.NewData.returnValues
  }

  async RegisterHash(cid, hash, fee) {
    const From = this._Address
    const transaction = await this._BToken.methods.registerHash(cid, hash, fee)
      .send({
        from: From
      })
      .on("receipt", function(receipt) {
        Logger.debug("receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })
    return transaction.events.NewHash.returnValues
  }

  async RegisterProduct(hash, value) {
    const From = this._Address
    const transaction =  await this._BToken.methods.registerProduct(hash, From, value)
      .send({
        from: From
      })
      .on("receipt", function(receipt) {
        Logger.debug("receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })
    return transaction.events.NewPToken.returnValues
  }

  async DistributionContract(pTokenId, distributor, cost) {
    const From = this._Address
    const transaction = await this._BToken.methods.distContract(pTokenId, distributor, cost)
      .send({
        from: From
      })
      .on("receipt", function(receipt) {
        Logger.debug("receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })
    return transaction.events.NewDistContract.returnValues
  }

  async SearchProviderContract(pTokenId, searchProvider, cost) {
    const From = this._Address
    const transaction = await this._BToken.methods.searchContract(pTokenId, searchProvider, cost)
      .send({
        from: From
      })
      .on("receipt", function(receipt) {
        Logger.debug("receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })
    return transaction.events.NewSearchContract.returnValues
  }

  async BuyToken(pTokenId) {
    const From = this._Address
    const WWW3 = this._Web3

    const tokenDetails = await this.GetPTWithID(pTokenId)
    Logger.debug('token details: ' + JSON.stringify(tokenDetails))

    const transaction = await this._BToken.methods.buyToken(pTokenId)
      .send({
        from: From,
        value: tokenDetails._Price
      })
      .on("receipt", function(receipt) {
        Logger.debug("receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })
    return transaction.events.NewUToken.returnValues
  }

  async ChannelOpen(cid, hash, numOfChunks) {
    const From = this._Address
    const WWW3 = this._Web3

    await this._BChannel.methods.channelOpen(cid, hash, numOfChunks)
      .send({
        from: From,
        value: WWW3.utils.toWei("0.001")
      })
      .on("receipt", function(receipt) {
        var oTokenId = receipt.events.channelOpened.returnValues.oTokenId
        Logger.debug("receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })
  }

  async ChannelOff(oTokenId) {
    const From = this._Address
    await this._BChannel.methods.channelOff(oTokenId)
      .send({
        from: From,
      })
      .on("receipt", function(receipt) {
        Logger.debug("receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })
  }

  async Settle(oTokenId) {
    const From = this._Address
    var addresses = ['0x16db17db1113c9d409e37c820ff0e5dd5b229f64', '0x101b70635498929bf4b14b0ecaf55d0a19a02ade'];
    var portions = [70, 30]
    await this._BChannel.methods.settleChannel(oTokenId, addresses, portions)
      .send({
        from: From,
      })
      .on("receipt", function(receipt) {
        Logger.debug("receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        Logger.error("error occured: " + error)
      })
  }

  async sendAggregatedReceipt() {
    let msg = {
      channel_id: "6",
      sender: '0xb73C9506cb7f4139A4D6Ac81DF1e5b6756Fab7A2',
      count: 20,
      chunk_list: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    }
    const Msg = Buffer.from(JSON.stringify(msg))
    const sign = CryptoUtils.Uint8ArrayToB64(Nacl.sign(Msg, this._PrivateKey))
    const public_key = CryptoUtils.Uint8ArrayToB64(Util.toBuffer(CryptoUtils.bytesToHexAddr(this._PubLicKey)))

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
}
