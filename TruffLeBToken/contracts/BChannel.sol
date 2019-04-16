pragma solidity ^0.4.24;

// import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./BToken.sol";

contract BChannel is BToken {

  uint prcieByChunk = 0;
  uint timeout = 86400;

  function setConfig(uint _prcieByChunk, uint _timeout) external onlyOwner {
    prcieByChunk = _prcieByChunk;
    timeout = _timeout;
  }

  enum ChannelState {
    invalid,
    open,
    off,
    settle
  }

  // off-chain channel token
  struct _Channel {
    address receiver;
    uint uTokenId;
    uint deposit;
    uint timestamp;
    uint timeout;
    ChannelState state;
  }

  _Channel[] internal _Cs;  // offchain channel tokens array

  modifier onlyVCOf(uint cTokenId) {
    require(_Cs[cTokenId].state != ChannelState.invalid);
    _;
  }

  function getChannelDetails(uint cTokenId)
  public view
  onlyVCOf(cTokenId)
  returns(address, uint, uint, uint, int, uint8) {
    _Channel memory _C = _Cs[cTokenId];
    return (_C.receiver, _Ts[_C.uTokenId].pTokenId, _C.deposit, _C.timestamp, int(_C.timeout - (now - _C.timestamp)), uint8(_C.state));
  }

  function getDepositAmount(uint uTokenId)
  view public
  onlyUOf(uTokenId)
  onlyVTOf(uTokenId)
  returns (uint amount) {
    _Product memory _P = _Ps[_Ts[uTokenId].pTokenId];
    uint chunks = getFileInfo(_P.ccid, _P.version, _P.filePath).chunks;
    return chunks * prcieByChunk;
  }

  function channelOpen(uint uTokenId)
  payable public
  onlyUOf(uTokenId)
  onlyVTOf(uTokenId) {
    require(getDepositAmount(uTokenId) <= msg.value);
    uint cTokenId = _Cs.push(_Channel(msg.sender, uTokenId, msg.value, now, timeout, ChannelState.open)) - 1;
    _Ts[uTokenId].state = TokenState.in_progress;
    emit NewID(cTokenId);
  }

  function channelOff(uint cTokenId)
  public
  onlyOwner
  onlyVCOf(cTokenId) {
    // require(msg.sender == owner || msg.sender == _Cs[cTokenId].receiver, "you are not permissioned");
    require(_Cs[cTokenId].state == ChannelState.open);
    _Cs[cTokenId].state = ChannelState.off;
  }

  function settleChannel(uint cTokenId, address[] contributors, uint[] chunks)
  external
  onlyOwner {
    require(_Cs[cTokenId].state == ChannelState.off);
    require(contributors.length == chunks.length);

    uint leftDeposit = _Cs[cTokenId].deposit;
    for(uint i = 0; i < contributors.length; i++) {
      uint payment = chunks[i] * prcieByChunk;
      contributors[i].transfer(payment);
      leftDeposit -= payment;
    }

    (_Cs[cTokenId].receiver).transfer(leftDeposit);
    _Cs[cTokenId].deposit = 0;
    _Cs[cTokenId].state = ChannelState.settle;
    _Ts[_Cs[cTokenId].uTokenId].state = TokenState.invalid;
  }
}
