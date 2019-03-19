import Web3 from 'web3'
import Tx from 'ethereumjs-tx'
import Utils from 'ethereumjs-util'
import jsonGateway from '../Gateway.json'
import {
  private_key as rinkeby_prv_key
} from '../rinkeby.json'

const PrivateKey = Utils.toBuffer(rinkeby_prv_key)

export default class EthGateway_ {
  static async CreateAsync() {
    const WWW3 = new Web3(window.web3.currentProvider)
    const NetworkID = await WWW3.eth.net.getId()
    const Con = new WWW3.eth.Contract(
      jsonGateway.abi,
      jsonGateway.networks[NetworkID].address
    )

    return new EthGateway_(Con, WWW3)
  }

  constructor(con, www3) {
    this._WWW3 = www3
    this._Con = con
  }

  async WithdrawEthAsync(from, amount, sig) {
    const inputAmount = this._WWW3.utils.toHex(amount)
    const query = await this._Con.methods.withdrawETH(inputAmount, sig)
    const data = query.encodeABI()

    const nonce = '0x' + (await this._WWW3.eth.getTransactionCount(from)).toString(16)
    const to = jsonGateway.networks[Object.keys(jsonGateway.networks)[0]].address

    var rawTx = {
      nonce,
      gasPrice: '0x09184e72a000',
      gasLimit: '0x27100',
      from: from,
      to,
      data,
      chainId: 4
    }

    let EstimateGas = await this._WWW3.eth.estimateGas(rawTx)
    console.log("# EstimateGas: " + EstimateGas)

    rawTx.gas = EstimateGas
    var tx = new Tx(rawTx)
    tx.sign(PrivateKey)
    var serializedTx = tx.serialize()
    EstimateGas = await this._WWW3.eth.estimateGas(rawTx)

    const transaction = await this._WWW3.eth.sendSignedTransaction("0x" + serializedTx.toString('hex'))
    console.log("transaction: " + JSON.stringify(transaction))
  }

  async Deposit2GatewayAsync(from, unit, amount) {
    var rawTx = {
      nonce: '0x' + (await this._WWW3.eth.getTransactionCount(from)).toString(16),
      from: from,
      to: this._Con.options.address,
      gasPrice: (await this._WWW3.eth.getGasPrice()),
      value: this._WWW3.utils.toHex(this._WWW3.utils.toWei(amount, unit)),
    }

    let EstimateGas = await this._WWW3.eth.estimateGas(rawTx)
    console.log("# EstimateGas: " + EstimateGas)
    rawTx.gas = EstimateGas
    var tx = new Tx(rawTx)
    tx.sign(PrivateKey)
    var serializedTx = tx.serialize()
    EstimateGas = await this._WWW3.eth.estimateGas(rawTx)

    const transaction = await this._WWW3.eth.sendSignedTransaction("0x" + serializedTx.toString('hex'))
    console.log("transaction: " + JSON.stringify(transaction))
  }
}
