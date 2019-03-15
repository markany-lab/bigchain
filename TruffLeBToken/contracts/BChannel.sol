pragma solidity ^0.4.24;

contract BChannel {

  uint minDeposit = 0;
  uint unitPrice = 0;

  event channelOpened(uint oTokenId, address orderer, uint cid, bytes32 contents_hash, uint deposit);
  event settleFinished(address[] contributors, uint[] portions);

  // config
  function setConfig(uint deposit, uint price) external onlyOwner {
    minDeposit = deposit;
    unitPrice = price;
  }

  enum OTokenState_ {
    open,
    off
  }

  // off-chain channel token
  struct OToken_ {
    address _Orderer;
    uint _CID;
    bytes32 _CHash;
    OTokenState_ _State;
    uint _TimeStamp;
    uint _TimeOut;
  }

  OToken_[] internal _OTs;  // offchain channel tokens array

  mapping (uint => uint) public OToken2Deposit; // otokenId => deposit

  function existsO(uint256 oTokenId) view public returns (bool) {
    return oTokenId + 1 <= _OTs.length;
  }

  function getOTokenDetails(uint oTokenId) public view returns(address orderer, uint cid, uint cHash, uint deposit, uint8 state, uint timestamp, uint leftTime ) {
    return (
      _OTs[oTokenId]._Orderer,
      _OTs[oTokenId]._CID,
      _OTs[oTokenId]._CHash,
      OToken2Deposit[oTokenId]
      uint8(_OTs[oTokenId]._State),
      _OTs[oTokenId]._TimeStamp,
      _OTs[oTokenId]._TimeOut - (now - _OTs[oTokenId]._TimeStamp)
    );
  }

  // off-chain APIs
  function channelOpen(uint cid, bytes32 contentsHash) payable public returns (uint oTokenId) {
    require(minDeposit <= msg.value, "deposit is too little");

    oTokenId = _OTs.push(OToken_(msg.sender, cid, contentsHash, OTokenState_.open, now, 1000000/*timeout*/ )) - 1;
    OToken2Deposit[oTokenId] = msg.value;
    emit channelOpened(oTokenId, msg.sender, cid, contentsHash, msg.value);
  }

  function channelOff(uint oTokenId) public {
    require(existsO(oTokenId), "this off-chain is not exists");
    require(_OTs[oTokenId]._State == OTokenState_.open, "this off-chain is already offed");
    _OTs[oTokenId]._State = OTokenState_.off;
  }

  function settleChannel(uint oTokenId, address[] contributor, uint[] portion) onlyOwner external {
    require(_OTs[oTokenId]._State == OTokenState_.off, "channel is not offed yet");

    uint balanceForUser = OToken2Deposit[oTokenId];
    uint[] memory payForSender = new uint[](contributor.length);
    uint totalPay = 0;
    for(uint i = 0; i < contributor.length; i++) {
      payForSender[i] = (unitPrice * portion[i]) / 100;
      totalPay += payForSender[i];
      require(totalPay <= balanceForUser, "deposit is less than total payment");
    }

    for(i = 0; i < contributor.length; i++) {
      contributor[i].transfer(payForSender[i]);
      balanceForUser -= payForSender[i];
    }

    (_OTs[oTokenId]._Orderer).transfer(balanceForUser);
    OToken2Deposit[oTokenId] = 0;

    emit settleFinished(contributor, portion);
  }
}
