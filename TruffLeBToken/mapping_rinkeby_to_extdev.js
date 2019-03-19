var crypto = require('crypto')
const { readFileSync } = require('fs')
const { writeFileSync } = require('fs')
const { join } = require('path')
const ethWaLLet = require('ethereumjs-wallet')
const ethUtiL = require('ethereumjs-util')

var {
  CryptoUtils
} = require('loom-js/dist')

var Rinkeby = require(join(__dirname, './rinkeby.json'))
var Env = require(join(__dirname, '../.env.json'))

var Https = require('https')
var Axios = require('axios')

const HotWaLLetAddr = Env.hot_wallet_url + ':' + Env.hot_wallet_port
console.log('hot wallet address: ' + HotWaLLetAddr)

const EthWaLLet = ethWaLLet.fromPrivateKey(ethUtiL.toBuffer(Rinkeby.private_key))
console.log('wallet address: ' +  EthWaLLet.getAddressString())

async function GetLoomPrivateKeyAsync(waLLet){
  var Agent = Axios.create({
    baseURL: HotWaLLetAddr,
    httpsAgent: new Https.Agent({
      rejectUnauthorized: false
    }),
    adapter: require('axios/lib/adapters/http'),
    withCredentials: true
  })

  var Token
  var Sign
  var PrivateKey = ''
  var Enc = false

  var EncKey = Rinkeby.private_key
  EncKey = EncKey.replace('0x', '')
  EncKey = new Buffer(EncKey, 'hex')

  await Agent.post('/query_get_token', {})
  .then(await function(res){
    var MsgStr = res.data.string
    var Msg = Buffer.from(MsgStr, 'utf8')
    const Prefix = new Buffer("\x19Ethereum Signed Message:\n")
    const PrefixedMsg = Buffer.concat([Prefix, new Buffer(String(Msg.length)), Msg])
    const PreSign = ethUtiL.ecsign(ethUtiL.keccak256(PrefixedMsg), waLLet.getPrivateKey())
    Sign = ethUtiL.bufferToHex(PreSign.r) + ethUtiL.bufferToHex(PreSign.s).substr(2) + ethUtiL.bufferToHex(PreSign.v).substr(2)
    Token = res.data.token
  })
  .catch(err=>console.log('>>> ' + err))

  const ConfirmData = {
    addr: waLLet.getAddressString(),
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
  .catch(err=>console.log('>>> ' + err))
  if(Enc){
    var DecipheredKey = CryptoUtils.B64ToUint8Array(PrivateKey)
    var Decipher = crypto.createDecipheriv("aes-256-ecb", EncKey, '')
    Decipher.setAutoPadding(false)
    var DecipheredKey = Decipher.update(DecipheredKey).toString('base64')
    DecipheredKey += Decipher.final('base64')
    PrivateKey = DecipheredKey
    console.log('deciphered key: ' + PrivateKey)
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

async function main(){
  GetLoomPrivateKeyAsync(EthWaLLet)
  .then((loom_private_key)=>{
    var ExtDev = {
      private_key: loom_private_key
    }
    writeFileSync(join(__dirname, './extdev.json'), JSON.stringify(ExtDev))
  })
}

main()
