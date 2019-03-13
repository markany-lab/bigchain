import React from 'react'
import BN from 'bn.js'
import Wallet from './wallet.js'
import UToken from './utoken.js'
import CToken from './ctoken.js'

export default class DAppTokenS_ extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      is_mapping: null,
      dapp_account: '0x',
      ether_baLance: 0,
      dapp_owned_utoken_idS: [],
      dapp_owned_utokenS: [],
      dapp_owned_ctoken_idS: [],
      dapp_owned_ctokenS: [],
      dapp_ctoken_titLe: 'no-title',
      dapp_ctoken_cid: 0,
      dapp_ctoken_fee: 200,
      dapp_ctoken_hash: '1234567890',
      dapp_ctoken_suppLy: 100,
      dapp_ctoken_id: 0,
      dapp_utoken_id: 0,
      dapp_otoken_id: 0,
      is_allowing: false
    }
  }

  async componentWillMount() {
    this.props.dapp_account.OnTokenWithdrawaL(async event => {
      alert(`Token ${event.value} ready for withdraw, check Ethereum Gateway`)
      await this.UpdateUI()
    })

    await this.UpdateUI()
  }

  async UpdateUI() {
    const EthAccount = this.props.eth_account.GetAccount()
    const bMapping = !!(await this.props.dapp_account.GetAddressMappingAsync(EthAccount))
    const DAppAccount = this.props.dapp_account.GetAccount()
    const EtherBaLance = (await this.props.dapp_account.GetBaLanceAsync()).toString()

    let DAppOwnedUTokenS = []
    let DAppOwnedCTokenS = []
    let DAppOwnedUTokenIDs = await this.props.dapp_btoken.GetOwnedUTsAsync()
    let DAppOwnedCTokenIDs = await this.props.dapp_btoken.GetOwnedCTsAsync()

    for (let id of DAppOwnedUTokenIDs) {
      let DetaiL = await this.props.dapp_btoken.GetUTWithID(id)
      DAppOwnedUTokenS.push(DetaiL)
    }

    for (let id of DAppOwnedCTokenIDs) {
      let DetaiL = await this.props.dapp_btoken.GetCTWithID(id)
      DAppOwnedCTokenS.push(DetaiL)
    }

    this.setState({
      dapp_account: DAppAccount,
      is_mapping: bMapping,
      ether_baLance: EtherBaLance,
      dapp_owned_utoken_idS: DAppOwnedUTokenIDs,
      dapp_owned_utokenS: DAppOwnedUTokenS,
      dapp_owned_ctoken_idS: DAppOwnedCTokenIDs,
      dapp_owned_ctokenS: DAppOwnedCTokenS,
    })
  }

  async ALLowEther2Withdraw(amount) {
    this.setState({ is_allowing: true })
    await this.props.dapp_account.ApproveAsync(this.state.dapp_account, amount)
    try {
      await this.props.dapp_account.WithdrawEthAsync(amount)
      alert('Processing allowance')
    } catch (err) {
      if (err.message.indexOf('pending') > -1) {
        alert('Pending withdraw exists, check Ethereum Gateway')
      } else {
        console.error(err)
      }
    }
    this.setState({ is_allowing: false })
    await this.UpdateUI()
  }

  render() {
    const EtherWaLLet = (
      <Wallet
        title="Ether"
        balance={this.state.ether_baLance}
        action="Allow Withdraw"
        handleOnClick={() => this.ALLowEther2Withdraw(this.state.ether_baLance)}
        disabled={this.state.sending}
      />
    )

    const DAppOwnedUTokenS = this.state.dapp_owned_utoken_idS.map((id, idx) => {
      const DetaiL = this.state.dapp_owned_utokenS[idx]
      let tokenState
      switch(DetaiL.tokenState) {
        case '0': tokenState = 'sold'; break;
        case '1': tokenState = 'channel opened'; break;
        case '2': tokenState = 'channel offed'; break;
        case '3': tokenState = 'settled'; break;
        default: tokenState = 'unknown state'; break;
      }

      return (
        <UToken
          id={id}
          user={DetaiL.user}
          cTokenId={DetaiL.cTokenId}
          state={tokenState}
          key={idx}
        />
      )
    })

    const DAppOwnedCTokenS = this.state.dapp_owned_ctoken_idS.map((id, idx) => {
      const DetaiL = this.state.dapp_owned_ctokenS[idx]
      return (
        <CToken
        title={DetaiL._TitLe}
        id={id}
        cid={DetaiL._CID}
        hash={DetaiL._Hash}
        fee={DetaiL._Fee}
        amount={DetaiL._Amount}
        state={DetaiL._DisabLed ? 'disabled' : 'enabled'}
        key={idx}
        />
      )
    })

    const ViewEther =
      this.state.ether_baLance > 0 ? EtherWaLLet : <p>No Ether available</p>

    const ViewOwnedUTokenS = DAppOwnedUTokenS
    const ViewOwnedCTokenS = DAppOwnedCTokenS

    return !this.state.is_mapping ? (
      <p>Please sign your user first</p>
    ) : (
      <div>
        <h2>DAppChain Available Token</h2>
        <div className="container">
          <ul className="nav nav-tabs" id="myTab" role="tablist">
            <li className="nav-item">
              <a
                className="nav-link active"
                id="ETH-tab"
                data-toggle="tab"
                href="#ETH"
                role="tab"
                aria-controls="ETH"
                aria-selected="true">
                ETH&nbsp;
                <span className="badge badge-light">{this.state.ether_baLance > 0 ? 1 : 0}</span>
              </a>
            </li>
            <li className="nav-item">
              <a
                className="nav-link"
                id="OwendUToken-tab"
                data-toggle="tab"
                href="#OwendUToken"
                role="tab"
                aria-controls="OwendUToken"
                aria-selected="false">
                OwendUToken&nbsp;
                <span className="badge badge-light">{this.state.dapp_owned_utoken_idS.length}</span>
              </a>
            </li>
            <li className="nav-item">
              <a
                className="nav-link"
                id="OwnedCToken-tab"
                data-toggle="tab"
                href="#OwnedCToken"
                role="tab"
                aria-controls="OwnedCToken"
                aria-selected="false">
                OwnedCToken&nbsp;
                <span className="badge badge-light">{this.state.dapp_owned_ctoken_idS.length}</span>
              </a>
            </li>
            <li className="nav-item">
              <a
                className="nav-link"
                id="CTokenFactory-tab"
                data-toggle="tab"
                href="#CTokenFactory"
                role="tab"
                aria-controls="CTokenFactory"
                aria-selected="false">
                CTokenFactory&nbsp;
              </a>
            </li>
            <li className="nav-item">
              <a
                className="nav-link"
                id="BuyCToken-tab"
                data-toggle="tab"
                href="#BuyCToken"
                role="tab"
                aria-controls="BuyCToken"
                aria-selected="false">
                BuyCToken&nbsp;
              </a>
            </li>
            <li className="nav-item">
              <a
                className="nav-link"
                id="ChannelOpen-tab"
                data-toggle="tab"
                href="#ChannelOpen"
                role="tab"
                aria-controls="ChannelOpen"
                aria-selected="false">
                ChannelOpen&nbsp;
              </a>
            </li>
            <li className="nav-item">
              <a
                className="nav-link"
                id="ChannelOff-tab"
                data-toggle="tab"
                href="#ChannelOff"
                role="tab"
                aria-controls="ChannelOff"
                aria-selected="false">
                ChannelOff&nbsp;
              </a>
            </li>
            <li className="nav-item">
              <a
                className="nav-link"
                id="Settle-tab"
                data-toggle="tab"
                href="#Settle"
                role="tab"
                aria-controls="Settle"
                aria-selected="false">
                Settle&nbsp;
              </a>
            </li>
          </ul>
          <div className="tab-content">
            <div className="tab-pane active"
              id="ETH"
              role="tabpanel"
              aria-labelledby="ETH-tab">
              {ViewEther}
            </div>
            <div
              className="tab-pane"
              id="OwendUToken"
              role="tabpanel"
              aria-labelledby="OwendUToken-tab">
              {ViewOwnedUTokenS}
            </div>
            <div
              className="tab-pane"
              id="OwnedCToken"
              role="tabpanel"
              aria-labelledby="OwnedCToken-tab">
              {ViewOwnedCTokenS}
            </div>
            <div
              className="tab-pane"
              id="CTokenFactory"
              role="tabpanel"
              aria-labelledby="CTokenFactory-tab">
              <div className="ctoken_factory">
                <input
                  placeholder="title"
                  value={this.state.dapp_ctoken_titLe}
                  onChange={(titLe) => this.UpdateCTokenTitLe4DApp(titLe)}
                />&nbsp;title<br/><br/>
                <input
                  placeholder="cid"
                  value={this.state.dapp_ctoken_cid}
                  onChange={(cid) => this.UpdateCTokenCID4DApp(cid)}
                />&nbsp;cid<br/><br/>
                <input
                  placeholder="fee"
                  value={this.state.dapp_ctoken_fee}
                  onChange={(fee) => this.UpdateCTokenFEE4DApp(fee)}
                />&nbsp;fee<br/><br/>
                <input
                  placeholder="hash"
                  value={this.state.dapp_ctoken_hash}
                  onChange={(hash) => this.UpdateCTokenHash4DApp(hash)}
                />&nbsp;hash<br/><br/>
                <input
                  placeholder="supply"
                  value={this.state.dapp_ctoken_suppLy}
                  onChange={(suppLy) => this.UpdateCTokenSuppLy4DApp(suppLy)}
                />&nbsp;supply<br/><br/>
                <button
                  disabled={0}
                  type="button"
                  className="btn btn-primary"
                  onClick={() => this.props.dapp_btoken.CreateCToken(
                    this.state.dapp_ctoken_titLe,
                    this.state.dapp_ctoken_cid,
                    this.state.dapp_ctoken_fee,
                    this.state.dapp_ctoken_hash,
                    this.state.dapp_ctoken_suppLy)}>
                  Mint ERC721X Token
                </button>
              </div>
            </div>
            <div
              className="tab-pane"
              id="BuyCToken"
              role="tabpanel"
              aria-labelledby="BuyCToken-tab">
              <div className="buy_ctoken">
              <input
              placeholder="token ID"
              value={this.state.dapp_ctoken_id}
              onChange={(tokenId) => this.UpdateCTokenID4DApp(tokenId)}
              />&nbsp;token id<br/><br/>
              <button
              disabled={0}
              type="button"
              className="btn btn-primary"
              onClick={() => this.props.dapp_btoken.BuyToken(
                this.state.dapp_ctoken_id)}>
                Buy Token
                </button>
                </div>
            </div>
            <div
              className="tab-pane"
              id="ChannelOpen"
              role="tabpanel"
              aria-labelledby="ChannelOpen-tab">
              <div className="channel_open">
              <input
              placeholder="token ID"
              value={this.state.dapp_utoken_id}
              onChange={(tokenId) => this.UpdateUTokenID4DApp(tokenId)}
              />&nbsp;token id<br/><br/>
              <button
              disabled={0}
              type="button"
              className="btn btn-primary"
              onClick={() => this.props.dapp_btoken.ChannelOpen(
                this.state.dapp_utoken_id)}>
                Channel Open
                </button>
                </div>
            </div>
            <div
              className="tab-pane"
              id="ChannelOff"
              role="tabpanel"
              aria-labelledby="ChannelOff-tab">
              <div className="channel_open">
              <input
              placeholder="token ID"
              value={this.state.dapp_otoken_id}
              onChange={(tokenId) => this.UpdateOTokenID4DApp(tokenId)}
              />&nbsp;token id<br/><br/>
              <button
              disabled={0}
              type="button"
              className="btn btn-primary"
              onClick={() => this.props.dapp_btoken.ChannelOff(
                this.state.dapp_otoken_id)}>
                Channel Off
                </button>
                </div>
            </div>
            <div
              className="tab-pane"
              id="Settle"
              role="tabpanel"
              aria-labelledby="Settle-tab">
              <div className="Settle">
              <input
              placeholder="token ID"
              value={this.state.dapp_otoken_id}
              onChange={(tokenId) => this.UpdateOTokenID4DApp(tokenId)}
              />&nbsp;token id<br/><br/>
              <button
              disabled={0}
              type="button"
              className="btn btn-primary"
              onClick={() => this.props.dapp_btoken.Settle(
                this.state.dapp_otoken_id)}>
                Settle
                </button>
                </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  UpdateCTokenTitLe4DApp(titLe) {
    this.setState({dapp_ctoken_titLe: titLe.target.value});
  }

  UpdateCTokenCID4DApp(cid) {
    this.setState({dapp_ctoken_cid: cid.target.value});
  }

  UpdateCTokenFEE4DApp(fee) {
    this.setState({dapp_ctoken_fee: fee.target.value});
  }

  UpdateCTokenHash4DApp(hash) {
    this.setState({dapp_ctoken_hash: hash.target.value});
  }

  UpdateCTokenSuppLy4DApp(suppLy) {
    this.setState({dapp_ctoken_suppLy: suppLy.target.value});
  }

  UpdateCTokenID4DApp(tokenId) {
    this.setState({dapp_ctoken_id: tokenId.target.value});
  }

  UpdateUTokenID4DApp(tokenId) {
    this.setState({dapp_utoken_id: tokenId.target.value});
  }

  UpdateOTokenID4DApp(tokenId) {
    this.setState({dapp_otoken_id: tokenId.target.value});
  }
}
