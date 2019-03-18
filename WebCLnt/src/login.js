import DAppAccount_ from './dappchain/dapp_account.js'

import Https from 'https'
import Axios from 'axios'
import Env from '../../.env.json'

export default class Login_ {
  static async InitDAppAccount(eth_account) {
    const EthAccount = eth_account.GetAccount()
    const EthWWW3 = eth_account.GetWeb3()
    if ( EthAccount === undefined ) {
      console.error("login.js, ethereum account: " + EthAccount)
      return undefined
    }
    else {
      console.log("login.js, ethereum account: " + EthAccount)
    }

    const HotWaLLetAddr = Env.key_server_ip + ':' + Env.key_server_port
    var Agent = Axios.create({
      baseURL: HotWaLLetAddr,
      httpsAgent: new Https.Agent({
        rejectUnauthorized: false,
      })
    })

    var Token
    var Sign
    var PrivateKey

    await Agent.post('/query_token', {})
    .then(await function(res) {
      var TgtStr = res.data.string
      return EthWWW3.eth.personal.sign(TgtStr, EthAccount, "", async function(error, result) {
        console.log("sign = " + result)
        Sign = result
        Token = res.data.token
      })
    })
    .catch(err => console.log('error: ' + JSON.stringify(err)))

    const ConfirmData = {
      ethAddress: EthAccount,
      sign: Sign
    }

    console.log('token: ' + Token)
    await Agent.post('/query_private_key_plain', {
      confirmData: ConfirmData
    }, {
      headers: { Authorization: "Bearer " + Token }
    })
    .then(await function(res) {
      var QueryStatus = res.data.status
      if (QueryStatus == 'verify failed') {
        console.log("login failed: verify signature failed")
      } else {
        if (QueryStatus == 'create') {
          console.log("login succeed: new key pair is generated")
        }
        if (QueryStatus == 'return') {
          console.log("login succeed: key pair is returned")
        }
        console.log("private key: " + res.data.prv_key)
        PrivateKey =  res.data.prv_key
      }
    })
    .catch(err => console.log('error: ' + JSON.stringify(err)))
    return PrivateKey
  }
}
