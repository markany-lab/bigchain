import React from 'react'
import Wallet from './eth_wallet.js'

export default class EthTokenS_ extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      eth_account: '0x',
      is_mapping: null,
      ether_baLance: 0,
      is_sending: false
    }
  }

  async componentWillMount() {
    await this.UpdateUI()
  }

  async UpdateUI() {
    const EthAccount = this.props.eth_account.GetAccount()
    const bMapping = !!(await this.props.dapp_account.GetAddressMappingAsync(EthAccount))
    const EtherBaLance = await this.props.eth_account.GetBaLanceAsync(EthAccount)
    console.log("EthAccount: " + EthAccount)
    console.log("EtherBaLance: " + EtherBaLance)

    this.setState({
      eth_account:EthAccount,
      is_mapping:bMapping,
      ether_baLance:EtherBaLance
    })
  }

  async SendEther2DApp(amount) {
    this.setState({ is_sending: true })
    try {
      await this.props.eth_gateway.Deposit2GatewayAsync(this.state.eth_account, 'ether', '0.01')
    } catch (err) {
      console.log(err)
      console.log('Transaction failed or denied by user')
    }

    this.setState({ is_sending: false })
    await this.UpdateUI()
  }

  render() {
    const EtherWaLLet = (
      <Wallet
        title="Ether"
        balance={this.state.ether_baLance}
        action="Send to DAppChain"
        handleOnClick={() => this.SendEther2DApp(this.state.ether_baLance)}
        disabled={this.state.is_sending}
      />
    )

    const ViewEther =
      this.state.ether_baLance > 0 ? EtherWaLLet : <p>No Ether available</p>

    return !(this.state.is_mapping) ? (
      <p>Please sign your user first</p>
    ) : (
      <div>
        <h2>Ethereum Network Owned Tokens</h2>
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
            <div className="tab-pane active"
              id="ETH"
              role="tabpanel"
              aria-labelledby="ETH-tab">
              {ViewEther}
            </div>
          </div>
        </div>
      </div>
    )
  }
}
