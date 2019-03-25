"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ethereumjs_util_1 = tslib_1.__importDefault(require("ethereumjs-util"));
var web3_1 = tslib_1.__importDefault(require("web3"));
var web3 = new web3_1.default();
var Util = require('ethereumjs-util')
/**
 * Signs message using a Web3 account.
 * This signer should be used for interactive signing in the browser with MetaMask.
 */
var web3Signer = /** @class */ (function () {
    /**
     * @param web3 Web3 instance to use for signing.
     * @param accountAddress Address of web3 account to sign with.
     * @param accountPassword password
     */
    function web3Signer(accountPrivateKey) {
        this._privateKey = accountPrivateKey;
    }
    /**
     * Signs a message.
     * @param msg Message to sign.
     * @returns Promise that will be resolved with the signature bytes.
     */
    web3Signer.prototype.signAsync = function (msg) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var signature, sig, mode, r, s, v;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        var Msg = Util.toBuffer(msg)
                        const Prefix = new Buffer("\x19Ethereum Signed Message:\n")
                        const PrefixedMsg = Buffer.concat([Prefix, new Buffer(String(Msg.length)), Msg])
                        const ESCSign = Util.ecsign(Util.keccak256(PrefixedMsg), this._privateKey)
                        const Sign = Util.bufferToHex(ESCSign.r) + Util.bufferToHex(ESCSign.s).substr(2) + Util.bufferToHex(ESCSign.v).substr(2)
                        return [4, Sign]
                    case 1:
                        signature = _a.sent();
                        sig = signature.slice(2);
                        mode = 1 // Geth
                        ;
                        r = ethereumjs_util_1.default.toBuffer('0x' + sig.substring(0, 64));
                        s = ethereumjs_util_1.default.toBuffer('0x' + sig.substring(64, 128));
                        v = parseInt(sig.substring(128, 130), 16);
                        if (v === 0 || v === 1) {
                            v += 27;
                        }
                        return [2 /*return*/, Buffer.concat([ethereumjs_util_1.default.toBuffer(mode), r, s, ethereumjs_util_1.default.toBuffer(v)])];
                }
            });
        });
    };
    return web3Signer;
}());
exports.web3Signer = web3Signer;

//# sourceMappingURL=solidity-helpers.js.map
