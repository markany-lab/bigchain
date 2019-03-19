var ethWaLLet = require('ethereumjs-wallet')
const readLine = require('readline')

const RL = readLine.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function main(){
  var V3 = await new Promise(resolve=>RL.question('input v3\n>', v3=>{
    resolve(v3)
  }))

  var Password = await new Promise(resolve=>RL.question('input password\n>', password=>{
    resolve(password)
  }))

  RL.close()

  var WaLLet = ethWaLLet.fromV3(V3, Password)
  var PrivateKey = WaLLet.getPrivateKeyString()
  console.log(PrivateKey)
}

main()
