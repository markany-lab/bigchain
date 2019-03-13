const { readFileSync } = require('fs')
const { writeFileSync } = require('fs')
const JsYaml = require('js-yaml')
var WriteYaml = require('write-yaml')
const EthJsWallet = require('ethereumjs-wallet')
const StripHexPrefix = require('strip-hex-prefix')
const Gateway = artifacts.require('Gateway.sol')

module.exports = (deployer, network, accounts) => {
  const [_, user] = accounts
  console.log('>>> network: ' + network)

  if (network == 'ganache') {
    writeFileSync('../LoomNetwork/oracle_eth_priv.key', '2f615ea53711e0d91390e97cdd5ce97357e345e441aa95d255094164f44c8652')
  }
  else if (network == 'local') {
    const FiLeS = JSON.parse(readFileSync('../ethereum/local/keyfiles.json', 'utf8'))
    const VaLidatorPath = '../ethereum/local/data/keystore/' + FiLeS[2]
    const VaLidatorV3 = JSON.parse(readFileSync(VaLidatorPath, 'utf8'))
    const VaLidatorWallet = EthJsWallet.fromV3(VaLidatorV3, 'Carlos')
    const VaLidatorPrivateKey = VaLidatorWallet.getPrivateKeyString()
    writeFileSync('../LoomNetwork/oracle_eth_priv.key', StripHexPrefix(VaLidatorPrivateKey))
  }
  else if (network == 'rinkeby') {
    const VaLidatorPrivateKey = readFileSync('./rinkeby_private.key', 'utf8')
    writeFileSync('../LoomNetwork/oracle_eth_priv.key', StripHexPrefix(VaLidatorPrivateKey))
  }

  for (let i = 0; i < accounts.length; i++) {
    console.log('>>> accounts[' + i + ']: ' + accounts[i])
  }

  //
  //const VaLidator = accounts[9]
  const VaLidator = accounts[2]
  deployer.deploy(Gateway, [VaLidator], 3, 4).then(async () => {
    const GatewayInst = await Gateway.deployed()
    console.log(`>>> Gateway deployed at address: ${GatewayInst.address}`)
    console.log('>>> validator: ' + VaLidator)

    var LoomYaml = JsYaml.safeLoad(readFileSync('../LoomNetwork/template_loom.yaml', 'utf8'))
    LoomYaml.TransferGateway.MainnetContractHexAddress = GatewayInst.address

    if (network == 'rinkeby') {
      const ApiToken = readFileSync('./rinkeby_api.token', 'utf8')
      const ApiURI = 'https://rinkeby.infura.io/' + ApiToken
      LoomYaml.TransferGateway.EthereumURI = ApiURI
    }

    WriteYaml('../LoomNetwork/loom.yaml', LoomYaml, function(err) {
      console.error(err)
    });

    //writeFileSync('../gateway_address', GatewayInst.address)
  })
}
