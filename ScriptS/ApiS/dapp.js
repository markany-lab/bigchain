const Web3 = require('web3');
const Util = require('ethereumjs-util')
const BN = require('bn.js')
const jsonBToken = require('../../TruffLeBToken/build/contracts/BToken.json')
const json721ZToken = require('../../TruffLeBToken/build/contracts/ERC721ZToken.json')
const dappGatewayAddress = require('../../WebCLnt/src/gateway_dappchain_address_extdev-plasma-us1.json')
const { web3Signer } = require('./web3Signer.js')
var axios = require('axios')

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

    const NetworkID = CLient.chainId
    const Addr = LocalAddress.fromPublicKey(PubLicKey).toString()
    const BTokenCon = new WWW3.eth.Contract(
      jsonBToken.abi,
      jsonBToken.networks[NetworkID].address, {
        Addr
      }
    )

    return new DappInit_(WWW3, PrivateKey, PubLicKey, CLient, AddressMapper, EthCoin, TransferGateway, Addr, BTokenCon)
  }

  constructor(www3, private_key, pubLic_key, cLient, address_mapper, eth_coin, transfer_gateway, addr, con) {
    this._Web3 = www3
    this._PrivateKey = private_key
    this._PubLicKey = pubLic_key
    this._CLient = cLient
    this._AddressMapper = address_mapper
    this._EthCoin = eth_coin
    this._TransferGateway = transfer_gateway
    this._Address = addr
    this._Contract = con
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

  async initContract() {
    var NetworkID = this._CLient.chainId
    var Addr = this._Address

    const ERC721ZTokenCon = new this._Web3.eth.Contract(
      json721ZToken.abi,
      json721ZToken.networks[NetworkID].address, {
        Addr
      }
    )

    console.log("# set permissioned contract to ERC721Z Token")
    await ERC721ZTokenCon.methods.setOnlyContract(jsonBToken.networks[NetworkID].address)
      .send({
        from: Addr,
      })
      .on("receipt", function (receipt) {
        console.log("# successfully finished!")
        // console.log("# receipt: " + JSON.stringify(receipt))
      })
      .on("error", function (error) {
        console.log("# error occured: " + error)
      })

    console.log("\n# init ERC721ZToken to BToken")
    await this._Contract.methods.setERC721ZInterface(json721ZToken.networks[NetworkID].address)
      .send({
        from: Addr,
      })
      .on("receipt", function (receipt) {
        console.log("# successfully finished!")
        // console.log("# receipt: " + JSON.stringify(receipt))
      })
      .on("error", function (error) {
        console.log("# error occured: " + error)
      })

    console.log("\n# set minimum deposit")
    await this._Contract.methods.setConfig(1000000, 10).send({
      from: Addr,
    })
      .on("receipt", function (receipt) {
        console.log("# successfully finished!")
        // console.log("# receipt: " + JSON.stringify(receipt))
      })
      .on("error", function (error) {
        console.log("# error occured: " + error)
      })
  }

  async SignAsync(wallet) {
    const From = new Address('eth', LocalAddress.fromHexString(wallet.getAddressString()))
    const To = new Address(this._CLient.chainId, LocalAddress.fromPublicKey(this._PubLicKey))
    const WWW3Signer = new web3Signer(wallet.getPrivateKey())
    if(await this._AddressMapper.hasMappingAsync(From)) {
      const mappingInfo = await this._AddressMapper.getMappingAsync(From)
      console.log("already mapped: " + JSON.stringify(mappingInfo))
      return
    }
    return await this._AddressMapper.addIdentityMappingAsync(From, To, WWW3Signer)
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

  // dapp_btoken
  async SetEvent(address) {
    const To = this._Address
    this._Contract.events.NewB({
      filter: {
        _to: To
      }
    })
      .on("data", (event) => {
        console.log(JSON.stringify(data))
      })
      .on("error", (error => {
        console.log(error)
      }))
  }

  async GetCTWithID(cTokenId) {
    const From = this._Address
    const DetaiL = await this._Contract.methods._CTs(cTokenId).call({
      from: From
    })
    const balance = await this._Contract.methods.balanceOf(From, cTokenId).call({
      from: From
    })
    DetaiL.balance = balance
    return DetaiL
  }

  async GetUTWithID(uTokenId) {
    const From = this._Address
    return this._Contract.methods.GetUTokenDetails(uTokenId).call({
      from: From
    })
  }

  async GetOTWithID(oTokenId) {
    const From = this._Address
    return await this._Contract.methods.getOTokenDetails(oTokenId).call({
      from: From
    })
  }

  async GetOwnedUTsAsync() {
    const From = this._Address
    return this._Contract.methods.GetOwnedUTokens().call({
      from: From
    })
  }

  async GetOwnedCTsAsync() {
    const From = this._Address
    return this._Contract.methods.GetOwnedCTokens().call({
      from: From
    })
  }

  async IsExistsCToken(cTokenId) {
    const From = this._Address
    return this._Contract.methods.exists(cTokenId).call({
      from: From
    })
  }

  async IsExistsUToken(uTokenId) {
    const From = this._Address
    return this._Contract.methods.existsU(uTokenId).call({
      from: From
    })
  }

  async IsExistsOToken(oTokenId) {
    const From = this._Address
    return this._Contract.methods.existsO(oTokenId).call({
      from: From
    })
  }

  async CreateCToken(titLe, cid, fee, hash, suppLy) {
    const From = this._Address
    console.log("# minting new ERC721Z token(" + titLe + ", " + cid + ", " + fee + ", " + hash + ", " + suppLy + ") on the dapp chain. this may take a while...");
    return this._Contract.methods.mintX(titLe, cid, fee, hash, suppLy)
      /*.send({from: From, gas: 4712388})*/
      .send({
        from: From
      })
      .on("receipt", function (receipt) {
        console.log("# successfully created!")
        console.log("# receipt: " + JSON.stringify(receipt))
      })
      .on("error", function (error) {
        console.log("# error occured: " + error)
      })
  }

  async MintB(cTokenId, suppLy) {
    const From = this._Address
    console.log("# minting the ERC721Z token with id " + cTokenId + " on the dapp chain. this may take a while...");
    return this._Contract.methods.mintX_withTokenID(cTokenId, suppLy)
      /*.send({from: From, gas: 4712388})*/
      .send({
        from: From
      })
      .on("receipt", function (receipt) {
        console.log("# successfully minted!")
        console.log("# receipt: " + JSON.stringify(receipt))
      })
      .on("error", function (error) {
        console.log("# error occured: " + error)
      })
  }

  async BuyToken(cTokenId) {
    const From = this._Address
    const WWW3 = this._Web3

    const tokenDetails = await this.GetCTWithID(cTokenId)
    console.log('# token details:')
    console.log(' - title: ' + tokenDetails._TitLe)
    console.log(' - cid: ' + tokenDetails._CID)
    console.log(' - fee: ' + tokenDetails._Fee)
    console.log(' - hash: ' + tokenDetails._Hash)

    this._Contract.methods.buyToken(cTokenId)
      .send({
        from: From,
        value: WWW3.utils.toWei(tokenDetails._Fee, 'wei')
      })
      .on("receipt", function (receipt) {
        console.log("# successfully finished!")
        console.log("# receipt: " + JSON.stringify(receipt))
      })
      .on("error", function (error) {
        console.log("# error occured: " + error)
      })
  }

  async ChannelOpen(uTokenId) {
    const From = this._Address
    const WWW3 = this._Web3
    var oTokenId;

    await this._Contract.methods.channelOpen(uTokenId)
      .send({
        from: From,
        value: WWW3.utils.toWei("0.001")
      })
      .on("receipt", function (receipt) {
        console.log("# successfully finished!")
        var oTokenId = receipt.events.channelOpened.returnValues.oTokenId
        console.log("# receipt: " + JSON.stringify(receipt))
        console.log("oTokenId: " + oTokenId)
      })
      .on("error", function (error) {
        console.log("# error occured: " + error)
      })
  }

  async ChannelOff(oTokenId) {
    const From = this._Address
    await this._Contract.methods.channelOff(oTokenId)
      .send({
        from: From,
      })
      .on("receipt", function (receipt) {
        console.log("# successfully finished!")
        console.log("# receipt: " + JSON.stringify(receipt))
      })
      .on("error", function (error) {
        console.log("# error occured: " + error)
      })
  }

  async Settle(oTokenId) {
    const From = this._Address
    var addresses = ['0x16db17db1113c9d409e37c820ff0e5dd5b229f64', '0x101b70635498929bf4b14b0ecaf55d0a19a02ade'];
    var portions = [70, 30]
    await this._Contract.methods.settleChannel(oTokenId, addresses, portions)
      .send({
        from: From,
      })
      .on("receipt", function (receipt) {
        console.log("# successfully finished!")
        console.log("# receipt: " + JSON.stringify(receipt))
      })
      .on("error", function (error) {
        console.log("# error occured: " + error)
      })
  }

  async sendAggregatedReceipt() {
    let msg = {
      channel_id: "0",
      receiver: this._Address,
      sender: '0xb73C9506cb7f4139A4D6Ac81DF1e5b6756Fab7A2',
      count: 10,
      chunk_list:[0,1,2,3,4,5,6,7,8,9]
    }
    const Msg = Buffer.from(JSON.stringify(msg))
    const sign = CryptoUtils.sign(Msg, this._PrivateKey)

    await axios({
      method: 'post',
      url: 'http://127.0.0.1:3003/get_receipt',
      data: {
        sign,
        msg,
        public_key: this._PubLicKey
      }
    })
    .then((res) => {
      console.log(JSON.stringify(res.data))
    })
  }
}
