var ethWaLLet = require('ethereumjs-wallet');
const readLine = require('readline');


var PrivateKey = Buffer.from('efca4cdd31923b50f4214af5d2ae10e7ac45a5019e9431cc195482d707485378', 'hex');
var WaLLet = ethWaLLet.fromPrivateKey(PrivateKey);
var UTC = WaLLet.toV3String('password')
console.log('utc: ' + UTC)


const AliceWallet = ethWaLLet.fromV3(UTC, 'password')
const AlicePrivateKey = AliceWallet.getPrivateKeyString()
console.log('alice\'s private key: ' + AlicePrivateKey)




const rl = readLine.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('What do you think of Node.js? ', (answer) => {
  // TODO: Log the answer in a database
  console.log(`Thank you for your valuable feedback: ${answer}`);

  rl.close();
});
