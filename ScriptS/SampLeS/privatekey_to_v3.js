var ethWaLLet = require('ethereumjs-wallet')
const readLine = require('readline')
const { weiteFileSync } = require('fs')

const RL = readLine.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function main(){
  var PrivateKey = await new Promise(resolve=>RL.question('input private key\n>', private_key=>{
    resolve(private_key)
  }))

  var Password = await new Promise(resolve=>RL.question('input password\n>', password=>{
    resolve(password)
  }))

  var bSave = await new Promise(resolve=>RL.question('save to keystore?\n>', save=>{
    var ResuLt = false
    console.log('>>> 1')
    if (save.toLowerCase() == 'y' || save.toLowerCase() == 'yes'){
    console.log('>>> 2')
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
    console.log('>>> saved')
    weiteFileSync('./keystore/' + WaLLet.getAddressString(), V3 )
  }
  console.log(V3)


}

main()
