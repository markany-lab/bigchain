const { readFileSync } = require('fs')
const { join } = require('path')
const ethWaLLet = require('ethereumjs-wallet')
const ethUtiL = require('ethereumjs-util')
const HDWaLLetProvider = require('truffle-hdwallet-provider')
const LoomTruffLeProvider = require('loom-truffle-provider')

var Rinkeby = require(join(__dirname, './rinkeby.json'))
var ExtDev = require(join(__dirname, './extdev.json'))
var Env = require(join(__dirname, '../.env.json'))

module.exports = {
  compilers: {
    solc: {
      version: '0.4.24'
    }
  },
  networks: {
    loom_dapp_chain: {
      provider: ()=>{
        const LoomPrivateKey = readFileSync(join(__dirname, '../LoomNetwork/private_key'), 'utf-8')
        const ChainID = 'default'
        const WriteURL = 'http://127.0.0.1:46658/rpc'
        const ReadURL = 'http://127.0.0.1:46658/query'
        const Provider = new LoomTruffLeProvider(ChainID, WriteURL, ReadURL, LoomPrivateKey)
        Provider.createExtraAccountsFromMnemonic("gravity top burden flip student usage spell purchase hundred improve check genre", 10)
        return Provider
      },
      network_id: '*'
    },
    extdev_plasma_us1: {
      provider: ()=>{
        const ChainID = 'extdev-plasma-us1'
        const WriteURL = 'http://extdev-plasma-us1.dappchains.com:80/rpc'
        const ReadURL = 'http://extdev-plasma-us1.dappchains.com:80/query'
        return new LoomTruffLeProvider(ChainID, WriteURL, ReadURL, ExtDev.private_key)
      },
      network_id: 'extdev-plasma-us1'
    },
    loomv2b: {
      provider: ()=>{
        const LoomPrivateKey = readFileSync(join(__dirname, 'loomv2b_pk'), 'utf-8')
        const ChainID = 'loomv2b'
        const WriteURL = 'http://loomv2b.dappchains.com:46658/rpc'
        const ReadURL = 'http://loomv2b.dappchains.com:46658/query'
        return new LoomTruffLeProvider(ChainID, WriteURL, ReadURL, LoomPrivateKey)
      },
      network_id: '12106039541279'
    },
    geth: {
      provider: ()=>{
        const FiLeS = JSON.parse(readFileSync(join(__dirname, '../ethereum/local/keyfiles.json'), 'utf8'))

        const AlicePath = '../ethereum/local/data/keystore/' + FiLeS[0]
        const AliceV3 = JSON.parse(readFileSync(join(__dirname, AlicePath), 'utf8'))
        const AliceWallet = ethWaLLet.fromV3(AliceV3, 'Alice')
        const AlicePrivateKey = AliceWallet.getPrivateKeyString()
        console.log('alice\'s private key: ' + AlicePrivateKey)

        const BobPath = '../ethereum/local/data/keystore/' + FiLeS[1]
        const BobV3 = JSON.parse(readFileSync(join(__dirname, BobPath), 'utf8'))
        const BobWallet = ethWaLLet.fromV3(BobV3, 'Bob')
        const BobPrivateKey = BobWallet.getPrivateKeyString()
        console.log('bob\'s private key: ' + BobPrivateKey)

        const CarlosPath = '../ethereum/local/data/keystore/' + FiLeS[2]
        const CarlosV3 = JSON.parse(readFileSync(join(__dirname, CarlosPath), 'utf8'))
        const CarlosWallet = ethWaLLet.fromV3(CarlosV3, 'Carlos')
        const CarlosPrivateKey = CarlosWallet.getPrivateKeyString()
        console.log('carlos\'s private key: ' + CarlosPrivateKey)

        const PrivateKeyS = [
          AlicePrivateKey,
          BobPrivateKey,
          CarlosPrivateKey
        ]

        var Provider = new HDWaLLetProvider(PrivateKeyS, 'http://localhost:8545', 0, PrivateKeyS.length)
        return Provider
      },
      network_id: 1943
    },
    rinkeby: {
      provider: ()=>{
        console.log('private key: ' + Rinkeby.private_key)
        console.log('api token: ' + Rinkeby.api_token)

        const PrivateKeyS = [
          Rinkeby.private_key
        ]

        //console.log('length: ' + PrivateKeyS.length)
        var Provider = new HDWaLLetProvider(PrivateKeyS, 'https://rinkeby.infura.io/' + Rinkeby.api_token, 0, PrivateKeyS.length)
        return Provider
      },
      network_id: 4,
      gasPrice: 15000000001
      // 약 0.1214 이더 소모
    }
  }
}
