import Web3 from 'web3'
import jsonBToken from '../../../TruffleDAppChain/build/contracts/BToken.json'
const json721ZToken = require('../../../TruffleDAppChain/build/contracts/ERC721ZToken.json')

const {
  LocalAddress,
  LoomProvider
} = require('loom-js/dist')

export default class DAppB_ {
  static async CreateAsync(account) {
    const PrivateKey = account.GetPrivateKey()
    const PubLicKey = account.GetPubLicKey()
    const CLient = account.GetCLient()

    const WWW3 = new Web3(new LoomProvider(CLient, PrivateKey))
    const NetworkID = CLient.chainId
    const Addr = LocalAddress.fromPublicKey(PubLicKey).toString()
    const Con = new WWW3.eth.Contract(
      jsonBToken.abi,
      jsonBToken.networks[NetworkID].address, {
        Addr
      }
    )

    return new DAppB_(WWW3, Con, Addr, CLient)
  }

  constructor(www3, con, addr, client) {
    this._WWW3 = www3
    this._Con = con
    this._Addr = addr
    this._CLient = client
  }

  async initContract() {
    var NetworkID = this._CLient.chainId
    var Addr = this._Addr

    const ERC721ZTokenCon = new this._WWW3.eth.Contract(
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
      .on("receipt", function(receipt) {
        console.log("# successfully finished!")
        // console.log("# receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        console.log("# error occured: " + error)
      })

    console.log("\n# init ERC721ZToken to BToken")
    await this._Con.methods.setERC721ZInterface(json721ZToken.networks[NetworkID].address)
      .send({
        from: Addr,
      })
      .on("receipt", function(receipt) {
        console.log("# successfully finished!")
        // console.log("# receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        console.log("# error occured: " + error)
      })

    console.log("\n# set minimum deposit")
    await this._Con.methods.setConfig(1000000, 10).send({
        from: Addr,
      })
      .on("receipt", function(receipt) {
        console.log("# successfully finished!")
        // console.log("# receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        console.log("# error occured: " + error)
      })
    alert("init contract complete")
  }

  async SetEvent(address) {
    const To = this._Addr
    this._Con.events.NewB({
        filter: {
          _to: To
        }
      })
      .on("data", (event) => {
        let Data = event.returnValues
        alert(JSON.stringify(Data))
      }).on("error", (error) => {
        throw alert(error)
      })
  }

  async GetCTWithID(cTokenId) {
    const From = this._Addr
    const DetaiL = await this._Con.methods._CTs(cTokenId).call({
      from: From
    })
    const balance = await this._Con.methods.balanceOf(From, cTokenId).call({
      from: From
    })
    DetaiL._Amount = balance
    return DetaiL
  }

  async GetUTWithID(uTokenId) {
    const From = this._Addr
    return this._Con.methods.GetUTokenDetails(uTokenId).call({
      from: From
    })
  }

  async GetOwnedUTsAsync() {
    const From = this._Addr
    return this._Con.methods.GetOwnedUTokens().call({
      from: From
    })
  }

  async GetOwnedCTsAsync() {
    const From = this._Addr
    return this._Con.methods.GetOwnedCTokens().call({
      from: From
    })
  }

  async IsExistsCToken(cTokenId) {
    const From = this._Addr
    return this._Con.methods.exists(cTokenId).call({
      from: From
    })
  }

  async IsExistsUToken(uTokenId) {
    const From = this._Addr
    return this._Con.methods.existsU(uTokenId).call({
      from: From
    })
  }

  async CreateCToken(titLe, cid, fee, hash, suppLy) {
    const From = this._Addr
    console.log("# minting new ERC721Z token(" + titLe + ", " + cid + ", " + fee + ", " + hash + ", " + suppLy + ") on the dapp chain. this may take a while...");
    this._Con.methods.mintX(titLe, cid, fee, hash, suppLy)
      /*.send({from: From, gas: 4712388})*/
      .send({
        from: From
      })
      .on("receipt", function(receipt) {
        console.log("# successfully created!")
        console.log("# receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        console.log("# error occured: " + error)
      })
  }

  async BuyToken(tokenId) {
    const From = this._Addr
    const WWW3 = this._WWW3

    const tokenDetails = await this.GetCTWithID(tokenId)
    console.log('# token details:')
    console.log(' - title: ' + tokenDetails._TitLe)
    console.log(' - cid: ' + tokenDetails._CID)
    console.log(' - fee: ' + tokenDetails._Fee)
    console.log(' - hash: ' + tokenDetails._Hash)

    this._Con.methods.buyToken(tokenId)
      .send({
        from: From,
        value: WWW3.utils.toWei(tokenDetails._Fee, 'wei')
      })
      .on("receipt", function(receipt) {
        console.log("# successfully finished!")
        console.log("# receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        console.log("# error occured: " + error)
      })
  }

  async ChannelOpen(uTokenId) {
    const From = this._Addr
    const WWW3 = this._WWW3
    var oTokenId;

    await this._Con.methods.channelOpen(uTokenId)
      .send({
        from: From,
        value: WWW3.utils.toWei("0.001")
      })
      .on("receipt", function(receipt) {
        console.log("# successfully finished!")
        var oTokenId = receipt.events.channelOpened.returnValues.oTokenId
        // console.log("# receipt: " + JSON.stringify(receipt))
        console.log("oTokenId: " + oTokenId)
      })
      .on("error", function(error) {
        console.log("# error occured: " + error)
      })
  }

  async ChannelOff(oTokenId) {
    const From = this._Addr
    await this._Con.methods.channelOff(oTokenId)
      .send({
        from: From,
      })
      .on("receipt", function(receipt) {
        console.log("# successfully finished!")
        console.log("# receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        console.log("# error occured: " + error)
      })
  }

  async Settle(oTokenId) {
    const From = this._Addr
    var addresses = ['0x16db17db1113c9d409e37c820ff0e5dd5b229f64', '0x101b70635498929bf4b14b0ecaf55d0a19a02ade'];
    var portions = [70,30]
    await this._Con.methods.settleChannel(oTokenId, addresses, portions)
      .send({
        from: From,
      })
      .on("receipt", function(receipt) {
        console.log("# successfully finished!")
        console.log("# receipt: " + JSON.stringify(receipt))
      })
      .on("error", function(error) {
        console.log("# error occured: " + error)
      })
  }

}
