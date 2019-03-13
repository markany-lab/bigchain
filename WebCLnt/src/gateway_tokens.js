import React from 'react'
import { CryptoUtils } from 'loom-js'
import Wallet from './wallet.js'

export default class GatewayTokenS_ extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      dapp_account: '0x',
      is_mapping: null,
      ether_baLance: 0,
      is_withdrawing: false
    }
  }

  async componentWillMount() {
    await this.UpdateUI()
  }

  async UpdateUI() {
    const EthAccount = this.props.eth_account.GetAccount()
    const bMapping = !!(await this.props.dapp_account.GetAddressMappingAsync(EthAccount))
    const DAppAccount = this.props.dapp_account.GetAccount()
    const Data = await this.props.dapp_account.WithdrawaLReceiptAsync(DAppAccount)

    let EtherBaLance = 0
    if (Data) {
      switch (Data.tokenKind) {
        case 0:
          EtherBaLance = +Data.value.toString(10)
          break
      }
    }

    this.setState({
      dapp_account: DAppAccount,
      is_mapping: bMapping,
      ether_baLance: EtherBaLance,
    })
  }

  async WithdrawEther(amount) {
    this.setState({ is_withdrawing: true })
    const Data = await this.props.dapp_account.WithdrawaLReceiptAsync(this.state.dapp_account)
    const Owner = Data.tokenOwner.local.toString()
    const Signature = CryptoUtils.bytesToHexAddr(Data.oracleSignature)
    try {
      await this.props.eth_gateway.WithdrawEthAsync(Owner, amount, Signature)
      alert('Token withdraw with success, check Owned Tokens')
    } catch (err) {
      console.error(err)
    }
    this.setState({ is_withdrawing: true })
    await this.UpdateUI()
  }

  render() {
    const EtherWaLLet = (
      <Wallet
        title="Ether"
        balance={this.state.ether_baLance}
        action="Withdraw from gateway"
        handleOnClick={() => this.WithdrawEther(this.state.ether_baLance)}
        disabled={this.state.sending}
      />
    )

    const ViewEther = this.state.ether_baLance > 0 ? EtherWaLLet : <p>No Ether available</p>

    return !this.state.is_mapping ? (
      <p>Please sign your user first</p>
    ) : (
      <div>
        <h2>Ethereum Network Gateway Tokens</h2>
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
          </ul>
          <div className="tab-content">
            <div className="tab-pane active" id="ETH" role="tabpanel" aria-labelledby="ETH-tab">
              {ViewEther}
            </div>
          </div>
        </div>
      </div>
    )
  }
}
