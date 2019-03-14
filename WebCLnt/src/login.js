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

    var Sign;
    var PrivateKey

    await Agent.post('/query_string', {})
    .then(await function(data) {
      var TgtStr = data.data.string;
      return EthWWW3.eth.personal.sign(TgtStr, EthAccount, "", async function(error, result) {
        console.log("sign = " + result)
        Sign = result;
      });
    })
    .catch(err => console.log(err))

    const ConfirmData = {
      ethAddress: EthAccount,
      sign: Sign
    }

    await Agent.post('/query_prv_key', {
        confirmData: ConfirmData
    })
    .then(await function(data) {
      var QueryStatus = data.data.status;
      if (QueryStatus == 'verify failed') {
        console.log("login failed: verify signature failed");
      } else {
        if (QueryStatus == 'create') {
          console.log("login succeed: new key pair is generated");
        }
        if (QueryStatus == 'return') {
          console.log("login succeed: key pair is returned");
        }
        console.log("private key: " + data.data.prv_key);
        PrivateKey =  data.data.prv_key;
      }
    })
    .catch(err => console.log(err))
    return PrivateKey;
  }
}
