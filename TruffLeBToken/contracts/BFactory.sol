pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract BFactory is Ownable {

  using SafeMath for uint256;
  event NewCToken(address content_provider, uint cTokenId, string titLe, uint cid, string hash);
  event NewUToken(address owner, uint uTokenId, uint cTokenId, uint8 state);
  event ModifyCToken(address content_provider, uint cTokenId, string titLe, uint cid, string hash, uint fee, bool disabLed);
  event checkPayment(address from, uint from_balance, address to, uint to_balance);

  enum UTokenState_ {
    sold,
    in_progress,
    settled
  }

  enum OTokenState_ {
    open,
    off
  }

  // contents token
  struct CToken_ {
    string _TitLe;
    uint _CID;
    string _Hash;
    uint _Fee;
    bool _DisabLed;
  }

  // user token
  struct UToken_ {
    address _User;
    uint _CToken;
    UTokenState_ _State;
  }

  // off-chain channel token
  struct OToken_ {
    address _Orderer;
    uint _UTokenId;
    uint _CTokenId;
    uint _Deposit;
    OTokenState_ _State;
    uint _TimeStamp;
    uint _TimeOut;
  }

  CToken_[] public _CTs;    // contents tokens array
  UToken_[] internal _UTs;  // user tokens array
  OToken_[] internal _OTs;  // offchain channel tokens array

  mapping (uint => address) public CToken2ContentProvider;     // cTokenId => owner
  mapping (uint => address) internal UToken2User;              // uTokenId => owner
  mapping (address => uint[]) public ContentProvider2CTokens;  // owner => cTokenIds
  mapping (address => uint[]) internal User2UTokens;           // owner => uTokenIds
  mapping (uint => uint) public OToken2Deposit;                // otokenId => deposit

  uint _EnabLeFee = 0.001 ether;

  modifier onlyContentProviderOf(uint cTokenId) {
    require(msg.sender == CToken2ContentProvider[cTokenId]);
    _;
  }

  modifier onlyUTokenOwnerOf(uint uTokenId) {
    require(msg.sender == UToken2User[uTokenId]);
    _;
  }

  modifier isVaLid(uint cTokenId) {
    require(keccak256(abi.encodePacked(_CTs[cTokenId]._TitLe))
      != keccak256(abi.encodePacked("")));
    require(_CTs[cTokenId]._CID != 0);
    require(keccak256(abi.encodePacked(_CTs[cTokenId]._Hash))
      != keccak256(abi.encodePacked("")));
    _;
  }

  function SetEnabLeFee(uint fee) external onlyOwner {
    _EnabLeFee = fee;
  }

  function existsU(uint256 uTokenId) view public returns (bool) {
    return uTokenId + 1 <= _UTs.length;
  }

  function existsO(uint256 oTokenId) view public returns (bool) {
    return oTokenId + 1 <= _OTs.length;
  }

  function _CreateCToken(string titLe, uint cid, uint fee, string hash) internal returns (uint) {
    uint cTokenId = _CTs.push(CToken_(titLe, cid, hash, fee, true)) - 1;
    CToken2ContentProvider[cTokenId] = msg.sender;
    ContentProvider2CTokens[msg.sender].push(cTokenId);
    emit NewCToken(msg.sender, cTokenId, titLe, cid, hash);
    return cTokenId;
  }

  function _CreateUToken(address user, uint cTokenId, UTokenState_ state) internal returns (uint) {
    uint uTokenId = _UTs.push(UToken_(user, cTokenId, state)) - 1;
    UToken2User[uTokenId] = msg.sender;
    User2UTokens[msg.sender].push(uTokenId);
    emit NewUToken(msg.sender, uTokenId, cTokenId, uint8(state));
    return uTokenId;
  }

  function _CreateOToken(uint uTokenId, uint deposit) internal returns (uint) {
    uint oTokenId = _OTs.push(OToken_(msg.sender, uTokenId, _UTs[uTokenId]._CToken, deposit, OTokenState_.open, now, 1000000/*timeout*/ )) - 1;
    return oTokenId;
  }

  function _ModifyCTokenValue(uint cTokenId, string titLe, uint cid, uint fee, string hash) public onlyContentProviderOf(cTokenId) {
    _CTs[cTokenId]._TitLe = titLe;
    _CTs[cTokenId]._CID = cid;
    _CTs[cTokenId]._Fee = fee;
    _CTs[cTokenId]._Hash = hash;
    emit ModifyCToken(msg.sender, cTokenId, _CTs[cTokenId]._TitLe, _CTs[cTokenId]._CID, _CTs[cTokenId]._Hash, _CTs[cTokenId]._Fee, _CTs[cTokenId]._DisabLed);
  }

  function EnabLeContents(uint cTokenId) external payable onlyContentProviderOf(cTokenId) {
    require(msg.value == _EnabLeFee);
    require(_CTs[cTokenId]._DisabLed == true);
    _CTs[cTokenId]._DisabLed = false;
    owner.transfer(msg.value);
    emit checkPayment(msg.sender, msg.sender.balance, owner, owner.balance);
  }

  function DisabLeContents(uint cTokenId) external onlyContentProviderOf(cTokenId) {
    require(_CTs[cTokenId]._DisabLed == false);
    _CTs[cTokenId]._DisabLed = true;
  }

  function GetOwnedCTokens() public view returns (uint[]){
    return ContentProvider2CTokens[msg.sender];
  }

  function GetOwnedUTokens() public view returns (uint[]){
    return User2UTokens[msg.sender];
  }

  function GetUTokenDetails(uint uTokenId) view public onlyUTokenOwnerOf(uTokenId) returns (address user, uint cTokenId, uint8 state) {
    return (_UTs[uTokenId]._User, _UTs[uTokenId]._CToken, uint8(_UTs[uTokenId]._State));
  }

  function getOTokenDetails(uint oTokenId) public view returns(address orderer, uint uTokenId, uint cTokenId, uint deposit, uint8 state, uint timestamp, uint leftTime ) {
    return (
      _OTs[oTokenId]._Orderer,
      _OTs[oTokenId]._UTokenId,
      _OTs[oTokenId]._CTokenId,
      _OTs[oTokenId]._Deposit,
      uint8(_OTs[oTokenId]._State),
      _OTs[oTokenId]._TimeStamp,
      _OTs[oTokenId]._TimeOut - (now - _OTs[oTokenId]._TimeStamp)
    );
  }
}
