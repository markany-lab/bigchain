var ethWaLLet = require('ethereumjs-wallet')
const readLine = require('readline')
const { writeFileSync } = require('fs')
const { join } = require('path')

async function main(){

  /*var Timestamp = new Date()
  Timestamp = Timestamp.toISOString()
  Timestamp = Timestamp.replace(':', '')
  console.log('timestamp: ' + Timestamp)
  var Prefix = './keystore/UTC--' + Timestamp + '--'*/

  const RL = readLine.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  var PrivateKey = await new Promise(resolve=>RL.question('input your private key(HEX)\nex)0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\n>', private_key=>{
    resolve(private_key)
  }))

  var Password = await new Promise(resolve=>RL.question('input password of private key\n>', password=>{
    resolve(password)
  }))

  var bSave = await new Promise(resolve=>RL.question('save to keystore?[Y/n]\n>', save=>{
    var ResuLt = false
    if (save.toLowerCase() == 'y' || save.toLowerCase() == 'yes'){
      ResuLt = true
    }
    resolve(ResuLt)
  }))

  RL.close()

  PrivateKey = PrivateKey.replace('0x', '')
  PrivateKey = Buffer.from(PrivateKey, 'hex')
  var WaLLet = ethWaLLet.fromPrivateKey(PrivateKey)
  var V3 = WaLLet.toV3String(Password)
  if(bSave){
    var Path = join(__dirname, './keystore/' + WaLLet.getV3Filename(Date.now()))
    console.log(Path)
    writeFileSync(Path, JSON.stringify(V3), 'utf8')
  }
  console.log(V3)
}

main()
