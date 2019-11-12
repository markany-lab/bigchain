const Util = require('ethereumjs-util')
var fs = require('fs')
var Nacl = require('tweetnacl')
var crypto = require('crypto');

const {
    Client,
    LocalAddress,
    LoomProvider,
    CryptoUtils,
  } = require('loom-js/dist')

  function countRange( numString ) {
    if( numString == null || numString =="" || numString == "undefined") {
      return 0
    }
    let arrayInfo = numString.split("-")
    if( arrayInfo.length == 1 ) {
      return 1
    }else{
        return ( parseFloat(arrayInfo[1]) - parseFloat(arrayInfo[0]) + 1 )
    }
  }


module.exports = class Utils {

    static async getSha256(msg) {
      let shaAlg = crypto.createHash('sha256')
      shaAlg.update(msg)
      return  shaAlg.digest('hex')
    }

    //attached type
    static async getSign(msg) {
        const Msg = Buffer.from(JSON.stringify(msg))
        const sign = CryptoUtils.Uint8ArrayToB64(Nacl.sign(Msg, this._PrivateKey))
        const pubKey = CryptoUtils.Uint8ArrayToB64(Util.toBuffer(CryptoUtils.bytesToHexAddr(this._PubLicKey)))
        return {
            sign,
            pubKey
        }
    }

    //attached type
    static async vrfSign(signB64, publicKeyB64) {
        const sign = CryptoUtils.B64ToUint8Array(signB64)
        const publicKey = CryptoUtils.B64ToUint8Array(publicKeyB64)
        const msgBytes = Nacl.sign.open(sign, publicKey)
        if (msgBytes == null) {
            return null
        }
        const msg = JSON.parse(Buffer.from(msgBytes.buffer, msgBytes.byteOffset, msgBytes.byteLength).toString())
        return msg
    }

    //detached type
    static async getPubKey() {
        return CryptoUtils.Uint8ArrayToB64(Util.toBuffer(CryptoUtils.bytesToHexAddr(this._PubLicKey)))
     }

     //detached type
    static async getDSignVal(msg) {
        const Msg = Buffer.from(JSON.stringify(msg))
        const sign = CryptoUtils.Uint8ArrayToB64(Nacl.sign.detached(Msg, this._PrivateKey))
        return sign
    }

     //detached type
    static async vrfDSignVal(msg, signB64, publicKeyB64) {
        const Msg = Buffer.from(JSON.stringify(msg))
        const sign = CryptoUtils.B64ToUint8Array(signB64)
        const publicKey = CryptoUtils.B64ToUint8Array(publicKeyB64)
        const rest = Nacl.sign.detached.verify(Msg, sign, publicKey)
        return rest
    }


    static async countRangeString ( numString ) {
      if( numString == null || numString =="" || numString == "undefined") {
        return 0
      }
      let totCount = 0
      let arrayInfo = numString.split(",")
      for( let i=0 ; i < arrayInfo.length ; i++ ) {
        totCount += countRange( arrayInfo[i] )
      }
      return totCount
    }

    static async getMaxValue ( numString ) {
      if( numString == null || numString =="" || numString == "undefined") {
        return 0
      }
      let maxValue = 0
      let inarrayInfo = []
      let inTmp = 0
      let arrayInfo = numString.split(",")
      for( let i=0 ; i < arrayInfo.length ; i++ ) {
        if( arrayInfo[i] == null || arrayInfo[i] == "" || arrayInfo[i] == "undefined" ) {
          continue
        }
        inarrayInfo = numString.split("-")
        if( inarrayInfo.length == 1 ) {
          inTmp = parseFloat(arrayInfo[i]);
        }else{
          inTmp = parseFloat(inarrayInfo[1]);
        }

        if( maxValue < inTmp ) {
          maxValue = inTmp
        }
      }
      return maxValue
    }
}
