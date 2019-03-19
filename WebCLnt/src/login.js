import DAppAccount_ from './dappchain/dapp_account.js'

import crypto from 'crypto'
import Https from 'https'
import Axios from 'axios'
import {
  prv_key as rinkeby_prv_key
} from '../rinkeby.json'
import Env from '../../.env.json'

export default class Login_ {
  static async InitDAppAccount(eth_account){
    const EthAccount = eth_account.GetAccount()
    const EthWWW3 = eth_account.GetWeb3()
    if( EthAccount === undefined ){
      console.error("login.js, ethereum account: " + EthAccount)
      return undefined
    }
    else{
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
    var PrivateKey = ''
    var Enc = false

    await Agent.post('/query_get_token', {})
    .then(await function(res){
      var MsgStr = res.data.string
      return EthWWW3.eth.personal.sign(MsgStr, EthAccount, "", async function(error, result){
        console.log("sign = " + result)
        Sign = result
        Token = res.data.token
      })
    })
    .catch(err => console.log('error: ' + JSON.stringify(err)))

    const ConfirmData = {
      addr: EthAccount,
      sign: Sign
    }

    console.log('token: ' + Token)
    await Agent.post('/query_get_private_key', {
      confirm_data: ConfirmData
    },
    {
      headers: {
        Authorization: "Bearer " + Token
      }
    })
    .then(await function(res){
      var QueryStatus = res.data.status
      if(QueryStatus == 'succeed'){
        console.log("private key: " + res.data.key)
        PrivateKey = res.data.key
        Enc = res.data.enc
      }
      else{
        console.log("error: verify signature failed")
      }
    })
    .catch(err => console.log('error: ' + JSON.stringify(err)))
    if(Enc){
      var EncKey = prv_key
      EncKey = EncKey.replace('0x', '')
      EncKey = new Buffer(EncKey, 'hex')

      var DecipheredKey = loom.CryptoUtils.B64ToUint8Array(PrivateKey)
      var Decipher = crypto.createDecipheriv("aes-256-ecb", EncKey, '')
      Decipher.setAutoPadding(false)
      var DecipheredKey = Decipher.update(DecipheredKey).toString('base64')
      DecipheredKey += Decipher.final('base64')
      PrivateKey = DecipheredKey
    }
    return PrivateKey
  }
}
