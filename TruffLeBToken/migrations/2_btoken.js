const { readFileSync, writeFileSync } = require('fs')

const BToken = artifacts.require("./BToken.sol")
const BChannel = artifacts.require("./BChannel.sol")

module.exports = function(deployer, network, accounts){
  deployer.then(async ()=>{
    const [_, user] = accounts
    console.log('>>> network: ' + network)
    for(let i = 0; i < accounts.length; i++){
      console.log('>>> accounts[' + i + ']: ' + accounts[i])
    }

    //
    const BTokenInst = await deployer.deploy(BToken)
    const BChannelInst = await deployer.deploy(BChannel)
    await BChannelInst.setConfig(1000000, 100)
    const GwDAppAddr = readFileSync('../gateway_dappchain_address_local', 'utf-8')
    var jsonGwDAppAddr = {address: GwDAppAddr}
    writeFileSync("../WebCLnt/src/gateway_dappchain_address_local.json", JSON.stringify(jsonGwDAppAddr))
  })
}
