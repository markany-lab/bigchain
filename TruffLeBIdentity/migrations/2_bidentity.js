const BIdentity = artifacts.require("./BIdentity.sol")

module.exports = function(deployer, network, accounts){
  deployer.then(async ()=>{
    const [_, user] = accounts
    console.log('>>> network: ' + network)
    for(let i = 0; i < accounts.length; i++){
      console.log('>>> accounts[' + i + ']: ' + accounts[i])
    }

    await deployer.deploy(BIdentity)
  })
}
