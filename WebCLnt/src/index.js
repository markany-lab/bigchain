import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter as Router, Route } from 'react-router-dom'

import Main_ from './main.js'
import Home_ from './home.js'

import EthTokenS_ from './eth_tokens.js'
import GatewayTokenS_ from './gateway_tokens.js'
import DAppTokenS_ from './dapp_tokens.js'

import EthAccount_ from './ethereum/eth_account.js'
import DAppAccount_ from './dappchain/dapp_account.js'
import Login_ from './login.js'

import EthGateway_ from './ethereum/eth_gateway.js'
import DAppBToken_ from './dappchain/dapp_btoken.js'

;(async () => {
  console.log('Loading ...')
  const t = setTimeout(
    () =>
      console.log(
        '\n\n----> If this takes too long to start, please try to reset MetaMask cache :)'
      ),
    5000
  )

  const EthAccount = await EthAccount_.CreateAsync()
  const EthGateway = await EthGateway_.CreateAsync()

  const b64PrivateKey = await Login_.InitDAppAccount(EthAccount);
  if ( b64PrivateKey === undefined ) {
    clearTimeout(t)

    const Main = () => (
      <Main_
        eth_account={EthAccount}
        dapp_account={null}
      />
    )

    const Home = () => (
      <Home_
        eth_account={EthAccount}
        dapp_account={null}
      />
    )

    ReactDOM.render(
      <Router>
        <div>
          <header>
            <Main />
          </header>
          <main role="main" style={{ marginTop: 100 }}>
            <div className="container">
              <Route exact path="/" component={Home} />
            </div>
          </main>
        </div>
      </Router>,
      document.getElementById('root')
    )
  }
  else {
    const DAppAccount = await DAppAccount_.CreateAsync(b64PrivateKey)
    const DAppBToken = await DAppBToken_.CreateAsync(DAppAccount)

    clearTimeout(t)

    const Main = () => (
      <Main_
        eth_account={EthAccount}
        dapp_account={DAppAccount}
      />
    )

    const Home = () => (
      <Home_
        eth_account={EthAccount}
        dapp_account={DAppAccount}
      />
    )

    const EthTokenS = () => (
      <EthTokenS_
        eth_account={EthAccount}
        dapp_account={DAppAccount}
        eth_gateway={EthGateway}
        dapp_btoken={DAppBToken}
      />
    )

    const GatewayTokenS = () => (
      <GatewayTokenS_
        eth_account={EthAccount}
        dapp_account={DAppAccount}
        eth_gateway={EthGateway}
      />
    )

    const DAppTokenS = () => (
      <DAppTokenS_
        eth_account={EthAccount}
        dapp_account={DAppAccount}
        dapp_btoken={DAppBToken}
      />
    )

    ReactDOM.render(
      <Router>
        <div>
          <header>
            <Main />
          </header>
          <main role="main" style={{ marginTop: 100 }}>
            <div className="container">
              <Route exact path="/" component={Home} />
              <Route path="/eth" component={EthTokenS} />
              <Route path="/gateway" component={GatewayTokenS} />
              <Route path="/dappchain" component={DAppTokenS} />
            </div>
          </main>
        </div>
      </Router>,
      document.getElementById('root')
    )
  }
})()
