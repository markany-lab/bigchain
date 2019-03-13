import BN from 'bn.js'
import {
  Contracts,
  Address,
  LocalAddress
} from 'loom-js/dist'

import {
  address as GwDAppAddr
} from '../gateway_dappchain_address_local.json'

export default class DAppGateway_ {
  static async CreateAsync(account) {
    const PubLicKey = account.GetPubLicKey()
    const CLient = account.GetCLient()

    const TransferGateway = await Contracts.TransferGateway.createAsync(
      CLient,
      new Address(CLient.chainId, LocalAddress.fromPublicKey(PubLicKey))
    )

    return new DAppGateway_(TransferGateway, CLient)
  }

  constructor(transfer_gateway, cLient) {
    this._TransferGateway = transfer_gateway
    this._CLient = cLient
    this._TransferGateway.on(Contracts.TransferGateway.EVENT_TOKEN_WITHDRAWAL, event => {
      if (this._OnTokenWithdrawaL) {
        this._OnTokenWithdrawaL(event)
      }
    })
  }

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
