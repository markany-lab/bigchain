pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract BChannel is Ownable {

  uint minDeposit = 0;
  uint unitPrice = 0;

  event channelOpened(uint oTokenId, address orderer, uint cid, string contents_hash, uint deposit);
  event settleFinished(address[] contributors, uint[] portions);

  // config
  function setConfig(uint deposit, uint price) external onlyOwner {
    minDeposit = deposit;
    unitPrice = price;
  }

  enum OTokenState_ {
    open,
    off,
    settle
  }

  // off-chain channel token
  struct OToken_ {
    address _Orderer;
    uint _CID;
    string _CHash;
    uint16 _NumOfChunks;
    OTokenState_ _State;
    uint _TimeStamp;
    uint _TimeOut;
  }

  OToken_[] internal _OTs;  // offchain channel tokens array

  mapping (uint => uint) public OToken2Deposit; // otokenId => deposit

  function existsO(uint256 oTokenId) view public returns (bool) {
    return oTokenId + 1 <= _OTs.length;
  }

  function getOTokenDetails(uint oTokenId) public view returns(address orderer, uint cid, string cHash, uint16 numOfChunks, uint deposit, uint8 state, uint timestamp, uint leftTime ) {
    OToken_ memory O = _OTs[oTokenId];
    return (
      O._Orderer,
      O._CID,
      O._CHash,
      O._NumOfChunks,
      OToken2Deposit[oTokenId],
      uint8(O._State),
      O._TimeStamp,
      O._TimeOut - (now - O._TimeStamp)
    );
  }

  // off-chain APIs
  function channelOpen(uint cid, string contentsHash, uint16 numOfChunks) payable public returns (uint oTokenId) {
    require(minDeposit <= msg.value, "deposit is too little");

    oTokenId = _OTs.push(OToken_(msg.sender, cid, contentsHash, numOfChunks, OTokenState_.open, now, 1000000/*timeout*/ )) - 1;
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
    _OTs[oTokenId]._State = OTokenState_.settle;

    emit settleFinished(contributor, portion);
  }
}
