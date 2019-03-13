const express = require('express');
var cors = require('cors');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const loomjs = require('loom-js');
const randomstring = require('randomstring');
const etherutil = require('ethereumjs-util');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

var key_path = './priv_keys.json';
var randomString = 'cSgRQzjIddeTOoxtGEUvYQtUVzkOZGDrexepbbELcqTirupjprVrzBFHvdutcWLlyavochrhKIbyYUIGInWUfkwhBixyTDWCdQWQoQxldeeuRtJNgJFBpKwkyFnOoKPCzWCgieDWicsxlmSrvpFZlJslCscMjHDPdHBZwRWeHZclmvvgmEKfxKaKTHLtsqvTxkfaQKwLfaLVNlfvVhmZxduCoDcCcPolJwGOGbSRUucKkwnFopTCcRWqFIFjbZBR';

function read_key_path() {
  try {
    return fs.readFileSync(key_path, 'utf-8');
  } catch (err) {
    return -1;
  }
}

function write_key_path(obj) {
  try {
    fs.writeFileSync(key_path, JSON.stringify(obj), 'utf-8');
  } catch (err) {
    console.log(err);
  }
}

function find_prv_key(account) {
  var keys = read_key_path();
  console.log("account = " + account);
  if (keys == -1) {
    return -1;
  } else {
    var key = JSON.parse(keys)[account];
    console.log("key = " + key);
    if (typeof key === "undefined") {
      return -1;
    } else {
      return key;
    }
  }
}

function save_prv_key(account, prv_key) {
  var prev_keys = read_key_path();
  if (prev_keys == -1) {
    var obj = new Object();
    obj[account] = prv_key;
    write_key_path(obj);
  } else {
    var prev_keys_obj = JSON.parse(prev_keys);
    console.log("prev_keys = " + JSON.stringify(prev_keys_obj));
    prev_keys_obj[account] = prv_key;

    console.log("prev_keys = " + JSON.stringify(prev_keys_obj));
    write_key_path(prev_keys_obj);
  }
  return 1;
}

app.post('/query_string', (req, res) => {
  console.log('/query_string');
  randomString = randomstring.generate({
    length: 256,
    charset: 'alphabetic'
  });
  res.json({
    status: 'rs',
    string: randomString
  });
})

app.post('/query_key', (req, res) => {
  console.log('/query_registered');
  try {
    var targetAccount = req.body.confirmData.ethAddress;
    var targetSign = req.body.confirmData.sign;

    var msg = Buffer.from(randomString, 'utf8');
    const prefix = new Buffer("\x19Ethereum Signed Message:\n");
    const prefixedMsg = Buffer.concat([prefix, new Buffer(String(msg.length)), msg]);
    const prefixedMsgInput = etherutil.keccak256(prefixedMsg)

    const {
      v,
      r,
      s
    } = etherutil.fromRpcSig(targetSign);

    const pubKeyBuf = etherutil.ecrecover(prefixedMsgInput, v, r, s);
    const pubKey = etherutil.bufferToHex(pubKeyBuf);
    const addrBuf = etherutil.pubToAddress(pubKeyBuf);
    const addr = etherutil.bufferToHex(addrBuf);

    if (targetAccount.toLowerCase() == addr) {
      var savedKey = find_prv_key(targetAccount.toLowerCase());

      if (savedKey == -1) {
        var prv_key = loomjs.CryptoUtils.Uint8ArrayToB64(loomjs.CryptoUtils.generatePrivateKey());
        save_prv_key(targetAccount.toLowerCase(), prv_key);
        console.log("prv_key: " + prv_key);
        res.json({
          status: 'create',
          prv_key: prv_key
        });
      } else {
        console.log("savedKey: " + savedKey);
        res.json({
          status: 'return',
          prv_key: savedKey
        });
      }
    } else {
      console.log(targetAccount.toLowerCase() + " / " + addr);
      res.json({
        status: 'verify failed'
      });
    }
  } catch (err) {
    console.log('query_registered error: ' + err);
    res.json({
      status: 'error occured'
    });
  }
})

app.listen(3000, () => {
  console.log('Example app listening on port 3000!');
});
