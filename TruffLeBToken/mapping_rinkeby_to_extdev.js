var crypto = require('crypto')
const { readFileSync } = require('fs')
const { writeFileSync } = require('fs')
const { join } = require('path')
const ethWaLLet = require('ethereumjs-wallet')
const ethUtiL = require('ethereumjs-util')

var Rinkeby = require(join(__dirname, './rinkeby.json'))
var Env = require(join(__dirname, '../.env.json'))

var Https = require('https')
var Axios = require('axios')

const HotWaLLetAddr = Env.key_server_ip + ':' + Env.key_server_port
console.log('hot wallet address: ' + HotWaLLetAddr)

const EthWaLLet = ethWaLLet.fromPrivateKey(ethUtiL.toBuffer(Rinkeby.prv_key))
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
  .catch(err=>console.error('error: ' + JSON.stringify(err)))

  const ConfirmData = {
    addr: waLLet.getAddressString(),
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
  .catch(err=>console.log('error: ' + JSON.stringify(err)))
  if(Enc){
    var EncKey = Rinkeby.prv_key
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

async function main(){
  GetLoomPrivateKeyAsync(EthWaLLet)
  .then((loom_private_key)=>{
    var ExtDev = {
      prv_key: loom_private_key
    }
    writeFileSync(join(__dirname, './extdev.json'), JSON.stringify(ExtDev))
  })
}

main()
