import React from 'react'
import { NavLink } from 'react-router-dom'

export default class Main_ extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      eth_account: '0x',
      is_mapping: null
    }
  }

  async componentWillMount() {
    const Account = this.props.eth_account.GetAccount()
    const bMapping = this.props.dapp_account ?
      !!(await this.props.dapp_account.GetAddressMappingAsync(Account)) : false
    await this.setState({ eth_account:Account, is_mapping:bMapping })
  }

  render() {
    const NavLinkS = (
      <ul className="navbar-nav mr-auto">
        <li className="nav-item">
          <NavLink to="/eth" activeClassName="active" className="nav-link">
            Ethereum Account
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/gateway" activeClassName="active" className="nav-link">
            Ethereum Gateway
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/dappchain" activeClassName="active" className="nav-link">
            DAppChain Account
          </NavLink>
        </li>
      </ul>
    )

    const EthAccountButton = (
      <button className="btn btn-outline-success my-2 my-sm-0" type="button">
        {this.state.eth_account}
      </button>
    )

    return (
      <nav className="navbar navbar-expand-md navbar-dark fixed-top bg-dark">
        <NavLink to="/" className="navbar-brand">
          Big Hybrid Chain
        </NavLink>
        <button
          className="navbar-toggler"
          type="button"
          data-toggle="collapse"
          data-target="#navbarCollapse"
          aria-controls="navbarCollapse"
          aria-expanded="false"
          aria-label="Toggle navigation">
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="navbarCollapse">
          {this.state.eth_account && this.state.is_mapping ? NavLinkS : ''}
          <form className="form-inline mt-2 mt-md-0 text-right">
            {this.state.eth_account && this.state.is_mapping ? EthAccountButton : ''}
          </form>
        </div>
      </nav>
    )
  }
}
