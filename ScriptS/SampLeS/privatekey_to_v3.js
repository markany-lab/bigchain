var ethWaLLet = require('ethereumjs-wallet')
const readLine = require('readline')

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

  RL.close()

  PrivateKey = PrivateKey.replace('0x', '')
  PrivateKey = Buffer.from(PrivateKey, 'hex')
  var WaLLet = ethWaLLet.fromPrivateKey(PrivateKey)
  var V3 = WaLLet.toV3String(Password)
  console.log(V3)
}

main()
