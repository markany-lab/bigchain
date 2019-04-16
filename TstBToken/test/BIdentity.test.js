const {
  assertEventVar,
  printEventVar,
  expectThrow,
} = require('./helpers')
const {
  BN
} = web3.utils
const ecurve = require('ecurve')
const bigInt = require('bigi')
const ethUtil = require('ethereumjs-util')
const bnChai = require('bn-chai')

require('chai')
  .use(require('chai-as-promised'))
  .use(bnChai(BN))
  .should()

const BIdentity = artifacts.require('./BIdentity.sol')

Number.prototype.pad = function(size) {
  var s = String(this)
  while (s.length < (size || 2)) {
    s = "0" + s;
  }
  return s
}

contract('BIdentity', accounts => {
  var Ct
  const [alice, bob, carlos] = accounts
  before(async () => {
    Ct = await BIdentity.new({
      from: carlos
    })
  })

  const alicePrvKey = Buffer.from('bd8cdfe50ad365f979caa887841ae5452ff60d7d78e1e1ed918625a223dc2aad', 'hex')
  const bobPrvKey = Buffer.from('40593ffa02e032a807acfecfcdfca79a76af87afa5357a72ade9320fc05e89fa', 'hex')
  const carlosPrvKey = Buffer.from('0566e06904b9ea8e00450d6634b7dc757443e762c8cdb1c2732269126b158c34', 'hex')

  describe("request to add & approve request", () => {
    let convertedAddress
    let dataHash
    let signature

    before(async () => {
      let Tx = await Ct.enrollIssuer(bob, {
        from: carlos
      })

      var address = new Buffer(alice.substring(2), 'hex')
      var ecparams = ecurve.getCurveByName('secp256k1')
      var convert = ecparams.G.multiply(bigInt.fromBuffer(address))
      convertedAddress = Buffer.concat([convert.affineX.toBuffer(32), convert.affineY.toBuffer(32)])

      var data = {
        age: 18
      }

      var dataToSign = convertedAddress + JSON.stringify(data)
      dataHash = ethUtil.keccak256(dataToSign)
      var ecSign = ethUtil.ecsign(dataHash, ethUtil.toBuffer(bobPrvKey))
      signature = ethUtil.bufferToHex(ecSign.r) + ethUtil.bufferToHex(ecSign.s).substr(2) + ethUtil.bufferToHex(ecSign.v).substr(2)
    });

    it('with issuer & identity owner, approve: true', async () => {
      Tx = await Ct.requestAdd(convertedAddress, dataHash, signature, {from: bob})
      let Evt = Tx.logs.find(log => log.event === 'RequestAdd')
      let requestKey = Evt.args['requestKey']

      let returnedsignature = await Ct.getSignature.call(convertedAddress, dataHash, {from: alice})
      assert.isNull(returnedsignature.signature)

      Tx = await Ct.approveAdd(dataHash, requestKey, true, {from: alice})
      returnedsignature = await Ct.getSignature.call(convertedAddress, dataHash, {from: alice})
      assert.equal(signature, returnedsignature.signature)

      await Ct.revokeBySigner(convertedAddress, dataHash, {from: bob})
    })

    it('with issuer & identity owner, approve: false', async () => {
      Tx = await Ct.requestAdd(convertedAddress, dataHash, signature, {from: bob})
      let Evt = Tx.logs.find(log => log.event === 'RequestAdd')
      let requestKey = Evt.args['requestKey']

      let returnedsignature = await Ct.getSignature.call(convertedAddress, dataHash, {from: alice})
      assert.isNull(returnedsignature.signature)

      Tx = await Ct.approveAdd(dataHash, requestKey, false, {from: alice})
      returnedsignature = await Ct.getSignature.call(convertedAddress, dataHash, {from: alice})
      assert.isNull(returnedsignature.signature)
    })

    it('with fake issuer', async () => {
      // should be failed
      try {
        Tx = await Ct.requestAdd(convertedAddress, dataHash, signature, {from: alice})
      } catch (error) {
        assert.include(error.message, 'not issuer', 'not issuer')
      }
    })

    it('with fake identity owner', async () => {
      try {
        Tx = await Ct.requestAdd(convertedAddress, dataHash, signature, {from: bob})
        Evt = Tx.logs.find(log => log.event === 'RequestAdd')
        requestKey = Evt.args['requestKey']
        let returnedsignature = await Ct.getSignature.call(convertedAddress, dataHash, {from: alice})
        assert.isNull(returnedsignature.signature)
        Tx = await Ct.approveAdd(dataHash, requestKey, true, {from: carlos})
      } catch (error) {
        assert.include(error.message, "not identity owner")
        let returnedsignature = await Ct.getSignature.call(convertedAddress, dataHash, {from: alice})
        assert.isNull(returnedsignature.signature)
      }
    })
  })

  describe("revoke signature", () => {
    let convertedAddress
    let dataHash
    let signature

    beforeEach(async () => {
      let Tx = await Ct.enrollIssuer(bob, {
        from: carlos
      })

      var address = new Buffer(alice.substring(2), 'hex')
      var ecparams = ecurve.getCurveByName('secp256k1')
      var convert = ecparams.G.multiply(bigInt.fromBuffer(address))
      convertedAddress = Buffer.concat([convert.affineX.toBuffer(32), convert.affineY.toBuffer(32)])

      var data = {
        age: 18
      }

      var dataToSign = convertedAddress + JSON.stringify(data)
      dataHash = ethUtil.keccak256(dataToSign)
      var ecSign = ethUtil.ecsign(dataHash, ethUtil.toBuffer(bobPrvKey))
      signature = ethUtil.bufferToHex(ecSign.r) + ethUtil.bufferToHex(ecSign.s).substr(2) + ethUtil.bufferToHex(ecSign.v).substr(2)

      Tx = await Ct.requestAdd(convertedAddress, dataHash, signature, {from: bob})
      let Evt = Tx.logs.find(log => log.event === 'RequestAdd')
      const requestKey = Evt.args['requestKey']
      await Ct.approveAdd(dataHash, requestKey, true, {from: alice})
    });

    it('with signer', async () => {
      let returnedsignature = await Ct.getSignature.call(convertedAddress, dataHash, {from: alice})
      assert.equal(signature, returnedsignature.signature)
      Tx = await Ct.revokeBySigner(convertedAddress, dataHash, {from: bob})
      returnedsignature = await Ct.getSignature.call(convertedAddress, dataHash, {from: alice})
      assert.isNull(returnedsignature.signature)
    })

    it('with identity owner', async () => {
      let returnedsignature = await Ct.getSignature.call(convertedAddress, dataHash, {from: alice})
      assert.equal(signature, returnedsignature.signature)
      Tx = await Ct.revokeByOwner(dataHash, {from: alice})
      returnedsignature = await Ct.getSignature.call(convertedAddress, dataHash, {from: alice})
      assert.isNull(returnedsignature.signature)
    })

    it('with fake signer', async () => {
      // should be failed
      try {
        let returnedsignature = await Ct.getSignature.call(convertedAddress, dataHash, {from: alice})
        assert.equal(signature, returnedsignature.signature)
        Tx = await Ct.revokeBySigner(convertedAddress, dataHash, {from: carlos})
      } catch (error) {
        assert.include(error.message, "not signer")
        let returnedsignature = await Ct.getSignature.call(convertedAddress, dataHash, {from: alice})
        assert.equal(signature, returnedsignature.signature)
      }
    })

    it('with fake identity owner', async() => {
      try {
        let returnedsignature = await Ct.getSignature.call(convertedAddress, dataHash, {from: alice})
        assert.equal(signature, returnedsignature.signature)
        Tx = await Ct.revokeByOwner(dataHash, {from: carlos})
      } catch (error) {
        assert.include(error.message, "not owner or issuer")
        let returnedsignature = await Ct.getSignature.call(convertedAddress, dataHash, {from: alice})
        assert.equal(signature, returnedsignature.signature)
      }
    })
  })

  describe("verify signature", () => {
    let convertedAddress
    let dataHash
    let signature

    before(async () => {
      let Tx = await Ct.enrollIssuer(bob, {
        from: carlos
      })

      var address = new Buffer(alice.substring(2), 'hex')
      var ecparams = ecurve.getCurveByName('secp256k1')
      var convert = ecparams.G.multiply(bigInt.fromBuffer(address))
      convertedAddress = Buffer.concat([convert.affineX.toBuffer(32), convert.affineY.toBuffer(32)])

      var data = {
        age: 18
      }

      var dataToSign = convertedAddress + JSON.stringify(data)
      dataHash = ethUtil.keccak256(dataToSign)
      var ecSign = ethUtil.ecsign(dataHash, ethUtil.toBuffer(bobPrvKey))
      signature = ethUtil.bufferToHex(ecSign.r) + ethUtil.bufferToHex(ecSign.s).substr(2) + ethUtil.bufferToHex(ecSign.v).substr(2)

      Tx = await Ct.requestAdd(convertedAddress, dataHash, signature, {from: bob})
      let Evt = Tx.logs.find(log => log.event === 'RequestAdd')
      const requestKey = Evt.args['requestKey']
      await Ct.approveAdd(dataHash, requestKey, true, {from: alice})
    });

    it('with identity owner', async () => {
      let targetAddress = alice;
      let targetData = {age: 18};

      var ecparams = ecurve.getCurveByName('secp256k1')
      var convert = ecparams.G.multiply(bigInt.fromBuffer(new Buffer(targetAddress.substring(2), 'hex')))
      var targetAddressKey = Buffer.concat([convert.affineX.toBuffer(32), convert.affineY.toBuffer(32)])
      var targetDataHash = ethUtil.keccak256(targetAddressKey + JSON.stringify(targetData))

      let returnedsignature = await Ct.getSignature.call(targetAddressKey, targetDataHash, {from: carlos})
      const {v, r, s} = ethUtil.fromRpcSig(returnedsignature.signature)

      const publicKey = ethUtil.ecrecover(targetDataHash, v, r, s)
      const addr = ethUtil.bufferToHex(ethUtil.pubToAddress(publicKey))
      assert.equal(addr.toLowerCase(), returnedsignature.signer.toLowerCase())
    })
  })
})
