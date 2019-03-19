import DAppAccount_ from './dappchain/dapp_account.js'

import crypto from 'crypto'
import loom from 'loom-js'
import Https from 'https'
import Axios from 'axios'

import {
  CryptoUtils
} from 'loom-js/dist'

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

    const HotWaLLetAddr = Env.hot_wallet_url + ':' + Env.hot_wallet_port
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

    var EncKey = rinkeby_prv_key
    EncKey = EncKey.replace('0x', '')
    EncKey = new Buffer(EncKey, 'hex')

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

    var CipheredKey = CryptoUtils.generatePrivateKey()
    var Cipher = crypto.createCipheriv('aes-256-ecb', EncKey, '')
    Cipher.setAutoPadding(false)
    var CipheredKey = Cipher.update(CipheredKey).toString('base64')
    CipheredKey += Cipher.final('base64')
    console.log('suggested key: ' + CipheredKey)

    console.log('token: ' + Token)
    await Agent.post('/query_get_private_key', {
      confirm_data: ConfirmData,
      suggested_key: CipheredKey
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
      var DecipheredKey = CryptoUtils.B64ToUint8Array(PrivateKey)
      var Decipher = crypto.createDecipheriv("aes-256-ecb", EncKey, '')
      Decipher.setAutoPadding(false)
      var DecipheredKey = Decipher.update(DecipheredKey).toString('base64')
      DecipheredKey += Decipher.final('base64')
      PrivateKey = DecipheredKey
    }
    else{
      // 키가 암호화되어 있지 않다면 암오화 하여 업데이트
      var Cipher = crypto.createCipheriv('aes-256-ecb', EncKey, '')
      Cipher.setAutoPadding(false)
      CipheredKey = CryptoUtils.B64ToUint8Array(PrivateKey)
      if (CipheredKey.length == 64){
        CipheredKey = Cipher.update(CipheredKey).toString('base64')
        CipheredKey += Cipher.final('base64')

        await Agent.post('/query_update_private_key', {
          confirm_data: ConfirmData,
          suggested_key: CipheredKey
        },
        {
          headers: {
            Authorization: "Bearer " + Token
          }
        })
        .then(await function(res){
          console.log("status: " + res.data.status)
        })
      }
    }
    return PrivateKey
  }
}
