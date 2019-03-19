var ethWaLLet = require('ethereumjs-wallet');
const readLine = require('readline');

const RL = readLine.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main(){
  RL.question('input private key\n>', (private_key) => {
    var PrivateKey = private_key.replace('0x', '')
    PrivateKey = Buffer.from(PrivateKey, 'hex')
    var WaLLet = ethWaLLet.fromPrivateKey(PrivateKey)

    RL.question('input password\n>', (password) => {
      var V3 = WaLLet.toV3String(password)
      console.log(V3)
      RL.close()
    })
  })
}

main()
