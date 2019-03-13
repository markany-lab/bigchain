const { readFileSync } = require('fs')
const path = require('path')
const { join } = require('path')
const EthJsWallet = require('ethereumjs-wallet')
const HDWalletProvider = require('truffle-hdwallet-provider')

module.exports = {
  compilers: {
    solc: {
      version: "0.4.24"
    }
  },
  networks: {
    ganache: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*',
      gas: 4700000
    },
    geth: {
      provider: function() {
        const FiLeS = JSON.parse(readFileSync(path.join(__dirname, '../ethereum/geth/keyfiles.json'), 'utf8'))

        const AlicePath = '../ethereum/geth/data/keystore/' + FiLeS[0]
        const AliceV3 = JSON.parse(readFileSync(path.join(__dirname, AlicePath), 'utf8'))
        const AliceWallet = EthJsWallet.fromV3(AliceV3, 'Alice')
        const AlicePrivateKey = AliceWallet.getPrivateKeyString()
        console.log('alice\'s private key: ' + AlicePrivateKey)

        const BobPath = '../ethereum/geth/data/keystore/' + FiLeS[1]
        const BobV3 = JSON.parse(readFileSync(path.join(__dirname, BobPath), 'utf8'))
        const BobWallet = EthJsWallet.fromV3(BobV3, 'Bob')
        const BobPrivateKey = BobWallet.getPrivateKeyString()
        console.log('bob\'s private key: ' + BobPrivateKey)

        const CarlosPath = '../ethereum/geth/data/keystore/' + FiLeS[2]
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
      network_id: 1943,
      gasPrice: 15000000001
    },
    rinkeby: {
      provider: function() {
        const PrivateKey = readFileSync(path.join(__dirname, 'rinkeby_private.key'), 'utf8')
        console.log('private key: ' + PrivateKey)

        const ApiToken = readFileSync(path.join(__dirname, 'rinkeby_api.token'), 'utf8')
        console.log('api token: ' + ApiToken)

        const PrivateKeyS = [
          PrivateKey,
          PrivateKey,
          PrivateKey
        ]
        //console.log('length: ' + PrivateKeyS.length)
        var Provider = new HDWalletProvider(PrivateKeyS, 'https://rinkeby.infura.io/' + ApiToken, 0, PrivateKeyS.length)
        return Provider
      },
      network_id: 4,
      gasPrice: 15000000001
      // 약 0.1214 이더 소모
    },
  }
}