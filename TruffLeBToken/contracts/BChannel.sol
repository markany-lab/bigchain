pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
// import "./BToken.sol";

contract BMSPInterface {
  function verifyRole(address target, uint8 role, bool isRevoke) view public returns (bool);
}

contract BTokenInterface {
  function getDetailsForChannel(uint uTokenId) view external returns (address, uint, uint8, uint);
  function tokenStateByChannel(uint uTokenId, uint8 state) external;
}

contract BChannel is Ownable {
  uint8 public P = 1;             // packager
  uint8 public CP = 2;            // contents provider
  uint8 public SP = 4;            // storage provider
  uint8 public D = 8;             // distributor
  uint8 public M = 16;

  BMSPInterface BMSPCon;
  BTokenInterface BTokenCon;
  uint prcieByChunk = 0;
  uint addPercent = 0;
  uint timeout = 86400;

  event NewID(uint flag, uint Id);                                 //  0: cid, 1: data id, 2: file id, 3: product id, 4: token id, 5: channel id

  function setConfig(uint _prcieByChunk, uint _addPercent, uint _timeout) external onlyOwner {
    prcieByChunk = _prcieByChunk;
    addPercent = _addPercent;
    timeout = _timeout;
  }

  function setOutsideContracts(address BMSPAddress, address BTokenAddress) external onlyOwner {
    BMSPCon = BMSPInterface(BMSPAddress);
    BTokenCon = BTokenInterface(BTokenAddress);
  }

  modifier onlyRoleOf(address target, uint8 role, bool isRevoke) {
    require(target != address(0));
    if(!isRevoke) {
      require(BMSPCon.verifyRole(target, role, false));
    } else {
      require(!BMSPCon.verifyRole(target, role, true));
    }
    _;
  }

  modifier onlyUOf(uint uTokenId) {
    require(msg.sender != address(0));
    address tokenOwner;
    (tokenOwner,,,) = BTokenCon.getDetailsForChannel(uTokenId);
    require(tokenOwner == msg.sender);
    _;
  }

  modifier onlyVTOf(uint uTokenId) {
    uint8 tokenState;
    (,,tokenState,) = BTokenCon.getDetailsForChannel(uTokenId);
    require(tokenState == 1);
    _;
  }

  enum ChannelState {
    invalid,
    open,
    settled
  }

  // off-chain channel token
  struct _Channel {
    address receiver;
    uint uTokenId;
    string key;
    uint deposit;
    uint collateral;
    uint timestamp;
    uint timeout;
    ChannelState state;
    string mroot;
  }

  mapping(uint => _Channel) _Cs;              // channel id => channel structure

  function getChannelDetails(uint channelId)
  public view
  returns(address, uint, string, uint, uint, uint, uint, uint8, string)
  {
    _Channel memory _C = _Cs[channelId];
    return (_C.receiver, _C.uTokenId, _C.key, _C.deposit, _C.collateral, _C.timestamp, _C.timeout, uint8(_C.state), _C.mroot);
  }

  function getDepositNCollateral(uint uTokenId)
  view public
  onlyUOf(uTokenId)
  returns (uint, uint)
  {
    uint chunks;
    (,,,chunks) = BTokenCon.getDetailsForChannel(uTokenId);
    uint deposit = chunks * prcieByChunk;
    uint collateral = deposit * (100 + addPercent) / 100;
    return (deposit, collateral);
  }

  function getDepositNCollateral2(uint chunks)
  view public
  returns (uint, uint)
  {
    uint deposit = chunks * prcieByChunk;
    uint collateral = deposit * (100 + addPercent) / 100;
    return (deposit, collateral);
  }


  function channelOpen(uint uTokenId, string key, uint chunkcount)
  payable public
  //onlyUOf(uTokenId)
  //onlyVTOf(uTokenId)
  {
    uint deposit;
    uint collateral;
    uint channelId;
    if(BMSPCon.verifyRole(msg.sender, SP, false)) {
      deposit = 0;
      collateral = 0;
      channelId = uint(keccak256(abi.encodePacked(msg.sender, now )));
      _Cs[channelId] = _Channel(msg.sender, 0, key, deposit, collateral, now, timeout, ChannelState.open,"");
      emit NewID(5, channelId);
      return;
    }else{
      require(msg.sender != address(0));
      address tokenOwner;
      (tokenOwner,,,) = BTokenCon.getDetailsForChannel(uTokenId);
      require(tokenOwner == msg.sender);
    }
    if( chunkcount == 0)
      (deposit, collateral) = getDepositNCollateral(uTokenId);
    else
      (deposit, collateral) = getDepositNCollateral2(chunkcount);

    uint total = deposit + collateral;
    require(total <= msg.value);
    msg.sender.transfer(msg.value - total);
    channelId = uint(keccak256(abi.encodePacked(msg.sender, now, uTokenId)));
    _Cs[channelId] = _Channel(msg.sender, uTokenId, key, deposit, collateral, now, timeout, ChannelState.open,"");
    BTokenCon.tokenStateByChannel(uTokenId, 2);
    emit NewID(5, channelId);
  }

  function settleChannel(string mroot, uint chid, address[] senders, uint[] chunks)
  external
  onlyRoleOf(msg.sender, M, false)
  {
    require(_Cs[chid].state == ChannelState.open);
    require(senders.length == chunks.length);
        //for cp
    if(_Cs[chid].collateral == 0) {
      _Cs[chid].state = ChannelState.settled;
      _Cs[chid].mroot = mroot;
      return;
    }
    uint leftDeposit = _Cs[chid].deposit;
    if (leftDeposit == 0) {
      return;
    }
    for(uint i = 0; i < senders.length; i++) {
      uint payment = chunks[i] * prcieByChunk;
      senders[i].transfer(payment);
      leftDeposit -= payment;
    }
    _Cs[chid].deposit = 0;
    _Cs[chid].collateral = 0;
    (_Cs[chid].receiver).transfer(leftDeposit + _Cs[chid].collateral);
    _Cs[chid].state = ChannelState.settled;
    _Cs[chid].mroot = mroot;
    BTokenCon.tokenStateByChannel(_Cs[chid].uTokenId, 1);
  }
}
