const { readFileSync } = require('fs')
const path = require('path')
const { join } = require('path')
const EthJsWallet = require('ethereumjs-wallet')
const HDWalletProvider = require('truffle-hdwallet-provider')
const LoomTruffleProvider = require('loom-truffle-provider')

module.exports = {
  compilers: {
    solc: {
      version: '0.4.24'
    }
  },
  networks: {
    loom_dapp_chain: {
      provider: function() {
        const PrivateKey = readFileSync(path.join(__dirname, '../LoomNetwork/private_key'), 'utf-8')
        const ChainID = 'default'
        const WriteURL = 'http://127.0.0.1:46658/rpc'
        const ReadURL = 'http://127.0.0.1:46658/query'
        const Provider = new LoomTruffleProvider(ChainID, WriteURL, ReadURL, PrivateKey)
        Provider.createExtraAccountsFromMnemonic("gravity top burden flip student usage spell purchase hundred improve check genre", 10)
        return Provider
      },
      network_id: '*'
    },
    extdev_plasma_us1: {
      provider: function() {
        const PrivateKey = readFileSync(path.join(__dirname, '../LoomNetwork/private_key'), 'utf-8')
        const ChainID = 'extdev-plasma-us1'
        const WriteURL = 'http://extdev-plasma-us1.dappchains.com:80/rpc'
        const ReadURL = 'http://extdev-plasma-us1.dappchains.com:80/query'
        return new LoomTruffleProvider(ChainID, WriteURL, ReadURL, PrivateKey)
      },
      network_id: 'extdev-plasma-us1'
    },
    loomv2b: {
      provider: function() {
        const PrivateKey = readFileSync(path.join(__dirname, 'loomv2b_pk'), 'utf-8')
        const ChainID = 'loomv2b'
        const WriteURL = 'http://loomv2b.dappchains.com:46658/rpc'
        const ReadURL = 'http://loomv2b.dappchains.com:46658/query'
        return new LoomTruffleProvider(ChainID, WriteURL, ReadURL, PrivateKey)
      },
      network_id: '12106039541279'
    },
    geth: {
      provider: function() {
        const FiLeS = JSON.parse(readFileSync(path.join(__dirname, '../ethereum/local/keyfiles.json'), 'utf8'))

        const AlicePath = '../ethereum/local/data/keystore/' + FiLeS[0]
        const AliceV3 = JSON.parse(readFileSync(path.join(__dirname, AlicePath), 'utf8'))
        const AliceWallet = EthJsWallet.fromV3(AliceV3, 'Alice')
        const AlicePrivateKey = AliceWallet.getPrivateKeyString()
        console.log('alice\'s private key: ' + AlicePrivateKey)

        const BobPath = '../ethereum/local/data/keystore/' + FiLeS[1]
        const BobV3 = JSON.parse(readFileSync(path.join(__dirname, BobPath), 'utf8'))
        const BobWallet = EthJsWallet.fromV3(BobV3, 'Bob')
        const BobPrivateKey = BobWallet.getPrivateKeyString()
        console.log('bob\'s private key: ' + BobPrivateKey)

        const CarlosPath = '../ethereum/local/data/keystore/' + FiLeS[2]
        const CarlosV3 = JSON.parse(readFileSync(path.join(__dirname, CarlosPath), 'utf8'))
        const CarlosWallet = EthJsWallet.fromV3(CarlosV3, 'Carlos')
        const CarlosPrivateKey = CarlosWallet.getPrivateKeyString()
        console.log('carlos\'s private key: ' + CarlosPrivateKey)

        const PrivateKeyS = [
          AlicePrivateKey,
          BobPrivateKey,
          CarlosPrivateKey
        ]

        var Provider = new HDWalletProvider(PrivateKeyS, 'http://localhost:8545', 0, PrivateKeyS.length)
        return Provider
      },
      network_id: 1943
    },
    rinkeby: {
      provider: function() {
        const PrivateKey = readFileSync(path.join(__dirname, 'rinkeby_private.key'), 'utf8')
        console.log('private key: ' + PrivateKey)

        const ApiToken = readFileSync(path.join(__dirname, 'rinkeby_api.token'), 'utf8')
        console.log('api token: ' + ApiToken)

        const PrivateKeyS = [
          PrivateKey
        ]
        //console.log('length: ' + PrivateKeyS.length)
        var Provider = new HDWalletProvider(PrivateKeyS, 'https://rinkeby.infura.io/' + ApiToken, 0, PrivateKeyS.length)
        return Provider
      },
      network_id: 4,
      gasPrice: 15000000001
      // 약 0.1214 이더 소모
    }
  }
}