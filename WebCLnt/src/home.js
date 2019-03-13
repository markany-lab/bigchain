import React from 'react'

export default class Home_ extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      eth_account: '0x',
      dapp_account: '0x',
      is_mapping: null
    }
  }

  async componentWillMount() {
    const EthAccount = this.props.eth_account.GetAccount()
    await this.setState({ eth_account:EthAccount })

    if (this.props.dapp_account) {
      const DAppAccount = this.props.dapp_account.GetAccount()
      await this.setState({ dapp_account:DAppAccount })
    }

    await this.UpdateMapping()
  }

  async UpdateMapping() {
    const Mapping = this.props.dapp_account ?
      await this.props.dapp_account.GetAddressMappingAsync(this.state.eth_account) : null
    if (Mapping) {
      console.log('Mapped accounts', Mapping.from.toString(), Mapping.to.toString())
    }
    this.setState({ is_mapping:!!(Mapping) })
  }

  async SignAsync() {
    if (this.props.dapp_account) {
      await this.props.dapp_account.SignAsync(this.state.eth_account)
    }
    await this.UpdateMapping()
    location.reload()
  }

  render() {
    const SignView = (
      <div>
        <p>
          By signing the contract you are confirming that your Ethereum account (
          {this.state.eth_account}) on MetaMask is related with account on DappChain (
          {this.state.dapp_account})
        </p>
        <button className="btn btn-primary" onClick={() => this.SignAsync()}>
          Click to Sign
        </button>
      </div>
    )

    if (!this.state.eth_account) {
      return (
        <div>
          <p>No MetaMask detected, please check if installed and active</p>
        </div>
      )
    }

    const SignedView = <div>Thanks for sign</div>
    return (
      <div>
        <div>
          <h2>Home</h2>
          {this.state.is_mapping ? SignedView : SignView}
        </div>
      </div>
    )
  }
}
