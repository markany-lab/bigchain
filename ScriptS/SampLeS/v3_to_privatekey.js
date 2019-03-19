var ethWaLLet = require('ethereumjs-wallet');
const readLine = require('readline');

const RL = readLine.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main(){
  RL.question('input v3\n>', (v3) => {
    var V3 = v3

    RL.question('input password\n>', (password) => {
      var WaLLet = ethWaLLet.fromV3(V3, password)
      var PrivateKey = WaLLet.getPrivateKeyString()
      console.log(PrivateKey)
      RL.close()
    })
  })
}

main()
