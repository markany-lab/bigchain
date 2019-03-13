import Web3 from 'web3'
import BN from 'bn.js'
import {
  address as GwDAppAddr
} from '../gateway_dappchain_address_extdev-plasma-us1.json'

const {
  NonceTxMiddleware,
  SignedTxMiddleware,
  Client,
  Address,
  LocalAddress,
  CryptoUtils,
  Contracts,
  Web3Signer
} = require('loom-js/dist')
const util = require('ethereumjs-util')

export default class DAppAccount_ {
  static async CreateWWW3Async() {
    return WWW3
  }

  static async CreateAsync(b64_private_key) {
    const WWW3 = new Web3(window.web3.currentProvider)
    const PrivateKey = CryptoUtils.B64ToUint8Array(b64_private_key);
    const PubLicKey = CryptoUtils.publicKeyFromPrivateKey(PrivateKey)
    const CLient = new Client(
      'extdev-plasma-us1',
      'wss://extdev-plasma-us1.dappchains.com/websocket',
      'wss://extdev-plasma-us1.dappchains.com/queryws'
    )

    CLient.on('error', msg => {
      console.error("dapp_account.js, " + msg)
    })

    CLient.txMiddleware = [
      new NonceTxMiddleware(PubLicKey, CLient),
      new SignedTxMiddleware(PrivateKey)
    ]

    const AddressMapper = await Contracts.AddressMapper.createAsync(
      CLient,
      new Address(CLient.chainId, LocalAddress.fromPublicKey(PubLicKey))
    )

    const EthCoin = await Contracts.EthCoin.createAsync(
      CLient,
      new Address(CLient.chainId, LocalAddress.fromPublicKey(PubLicKey))
    )

    const TransferGateway = await Contracts.TransferGateway.createAsync(
      CLient,
      new Address(CLient.chainId, LocalAddress.fromPublicKey(PubLicKey))
    )

    return new DAppAccount_(WWW3, PrivateKey, PubLicKey, CLient, AddressMapper, EthCoin, TransferGateway)
  }

  constructor(www3, private_key, pubLic_key, cLient, address_mapper, eth_coin, transfer_gateway) {
    this._WWW3 = www3
    this._PrivateKey = private_key
    this._PubLicKey = pubLic_key
    this._CLient = cLient
    this._AddressMapper = address_mapper
    this._EthCoin = eth_coin
    this._TransferGateway = transfer_gateway
    this._TransferGateway.on(Contracts.TransferGateway.EVENT_TOKEN_WITHDRAWAL, event => {
      if (this._OnTokenWithdrawaL) {
        this._OnTokenWithdrawaL(event)
      }
    })
  }

  GetPrivateKey() {
    return this._PrivateKey
  }

  GetPubLicKey() {
    return this._PubLicKey
  }

  GetCLient() {
    return this._CLient
  }

  GetAccount() {
    return LocalAddress.fromPublicKey(this._PubLicKey).toString()
  }

  async GetAddressMappingAsync(eth_address) {
    try {
      const From = new Address('eth', LocalAddress.fromHexString(eth_address))
      return await this._AddressMapper.getMappingAsync(From)
    } catch (_) {
      return null
    }
  }

  async SignAsync(eth_address) {
    const From = new Address('eth', LocalAddress.fromHexString(eth_address))
    const To = new Address(this._CLient.chainId, LocalAddress.fromPublicKey(this._PubLicKey))
    const WWW3Signer = new Web3Signer(this._WWW3, eth_address)
    return await this._AddressMapper.addIdentityMappingAsync(From, To, WWW3Signer)
  }

  async ApproveAsync(amount) {
    return await this._EthCoin.approveAsync(
      new Address(
        this._CLient.chainId,
        LocalAddress.fromHexString(GwDAppAddr)
      ),
      new BN(amount)
    )
  }

  async GetBaLanceAsync() {
    const UserAddress = new Address(this._CLient.chainId, LocalAddress.fromPublicKey(this._PubLicKey))
    return await this._EthCoin.getBalanceOfAsync(UserAddress)
  }


  // transfer_gateway
  OnTokenWithdrawaL(fn) {
    this._OnTokenWithdrawaL = fn
  }

  async WithdrawEthAsync(amount) {
    return await this._TransferGateway.withdrawETHAsync(
      new BN(amount),
      new Address(
        this._CLient.chainId,
        //LocalAddress.fromHexString('0xf5cAD0DB6415a71a5BC67403c87B56b629b4DdaA')
        LocalAddress.fromHexString(GwDAppAddr)
      )
    )
  }

  async WithdrawaLReceiptAsync(address) {
    return await this._TransferGateway.withdrawalReceiptAsync(
      new Address(this._CLient.chainId, LocalAddress.fromHexString(address))
    )
  }
}
