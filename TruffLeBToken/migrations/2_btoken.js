const { readFileSync, writeFileSync } = require('fs')

const ObjectLib = artifacts.require('./Libraries/ObjectLib.sol')
const BToken = artifacts.require("./BToken.sol")
const ERC721ZToken = artifacts.require("./Core/ERC721Z/ERC721ZToken.sol")

module.exports = function(deployer, network, accounts) {
  deployer.then(async () => {
    const [_, user] = accounts
    console.log('>>> network: ' + network)
    for (let i = 0; i < accounts.length; i++) {
      console.log('>>> accounts[' + i + ']: ' + accounts[i])
    }

    //
    await deployer.deploy(ObjectLib)
    await deployer.link(ObjectLib, ERC721ZToken)
    const ERC721ZTokenInst = await deployer.deploy(ERC721ZToken)
    const BTokenInst = await deployer.deploy(BToken)

    await ERC721ZTokenInst.setOnlyContract(BTokenInst.address)
    await BTokenInst.setERC721ZInterface(ERC721ZTokenInst.address)

    const OnlyContract = await ERC721ZTokenInst.getOnlyContract.call();
    console.log('>>> only contract: ' + OnlyContract)

    const GwDAppAddr = readFileSync('../gateway_dappchain_address_local', 'utf-8')
    var jsonGwDAppAddr = { address: GwDAppAddr }
    writeFileSync("../WebCLnt/src/gateway_dappchain_address_local.json", JSON.stringify(jsonGwDAppAddr))
  })
}
