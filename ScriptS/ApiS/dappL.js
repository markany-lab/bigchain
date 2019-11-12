var Env = require('./.env.json')
const Util = require('ethereumjs-util')
var Log4JS = require('log4js')
var Logger = Log4JS.getLogger('DApp')
Logger.level = Env.log_level
var Nacl = require('tweetnacl')

const {
  NonceTxMiddleware,
  SignedTxMiddleware,
  Client,
  Address,
  LocalAddress,
  LoomProvider,
  CryptoUtils,
  Contracts,
  Web3Signer
} = require('loom-js/dist')

module.exports = class DappInit_ {
  static async createAsync(b64_private_key) {
    const PrivateKey = CryptoUtils.B64ToUint8Array(b64_private_key);
    const PubLicKey = CryptoUtils.publicKeyFromPrivateKey(PrivateKey)
    return new DappInit_(PrivateKey, PubLicKey)
  }

  constructor(private_key, pubLic_key) {
    this._PrivateKey = private_key
    this._PubLicKey = pubLic_key
  }

  // dapp_account
  GetPrivateKey() {
    return this._PrivateKey
  }

  GetPubLicKey() {
    return this._PubLicKey
  }
  //---------------------------------------------------------------- sign ---------------------------------------------------------------//
  async signReceipt(msg) {
    const Msg = Buffer.from(JSON.stringify(msg))
    const sign = CryptoUtils.Uint8ArrayToB64(Nacl.sign(Msg, this._PrivateKey))
    const pubKey = CryptoUtils.Uint8ArrayToB64(Util.toBuffer(CryptoUtils.bytesToHexAddr(this._PubLicKey)))
    return {
      sign,
      pubKey
    }
  }

  async verifyReceript(signB64, publicKeyB64) {
    const sign = CryptoUtils.B64ToUint8Array(signB64)
    const publicKey = CryptoUtils.B64ToUint8Array(publicKeyB64)
    const msgBytes = Nacl.sign.open(sign, publicKey)
    const msg = JSON.parse(Buffer.from(msgBytes.buffer, msgBytes.byteOffset, msgBytes.byteLength).toString())
    return msg
  }
  //-------------------------------------------------------------------------------------------------------------------------------------//
}
