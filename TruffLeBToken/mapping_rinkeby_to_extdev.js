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
  await Agent.post('/query_token', {})
  .then(await function(res){
    var TgtStr = res.data.string
    var Msg = Buffer.from(TgtStr, 'utf8')
    const Prefix = new Buffer("\x19Ethereum Signed Message:\n")
    const PrefixedMsg = Buffer.concat([Prefix, new Buffer(String(Msg.length)), Msg])
    const ESCSign = ethUtiL.ecsign(ethUtiL.keccak256(PrefixedMsg), waLLet.getPrivateKey())
    Sign = ethUtiL.bufferToHex(ESCSign.r) + ethUtiL.bufferToHex(ESCSign.s).substr(2) + ethUtiL.bufferToHex(ESCSign.v).substr(2)
    Token = res.data.token
  })
  .catch(err=>console.error('error: ' + JSON.stringify(err)))

  const ConfirmData = {
    addr: waLLet.getAddressString(),
    sign: Sign
  }

  console.log('token: ' + Token)
  await Agent.post('/query_private_key_plain', {
    confirm_data: ConfirmData
  }, {
    headers: { Authorization: "Bearer " + Token }
  })
  .then(await function(res){
    var QueryStatus = res.data.status
    if (QueryStatus == 'verify failed'){
      console.log("login failed: verify signature failed")
    }
    else{
      if (QueryStatus == 'create'){
        console.log("login succeed: new key pair is generated")
      }
      if (QueryStatus == 'return'){
        console.log("login succeed: key pair is returned")
      }
      console.log("private key: " + res.data.prv_key)
      PrivateKey = res.data.prv_key
    }
  })
  .catch(err=>console.log('error: ' + JSON.stringify(err)))
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
