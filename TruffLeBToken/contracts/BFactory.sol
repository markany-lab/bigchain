pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract BFactory is Ownable {

  using SafeMath for uint256;
  event NewCToken(address content_provider, uint cid, string titLe);
  event NewUToken(address owner, uint uTokenId, uint cTokenId, uint8 state);
  event ModifyCToken(address content_provider, uint cid, string title, bool disabLed);
  event checkPayment(address from, uint from_balance, address to, uint to_balance);

  enum UTokenState_ {
    sold,
    in_progress,
    settled
  }

  // contents token
  struct CToken_ {
    string _TitLe;
    bool _DisabLed;
  }

  // user token
  struct UToken_ {
    address _User;
    uint _CToken;
    UTokenState_ _State;
  }

  CToken_[] public _CTs;    // contents tokens array
  UToken_[] internal _UTs;  // user tokens array

  mapping (uint => address) public CID2ContentProvider;     // cTokenId => owner
  mapping (uint => address) internal UToken2User;              // uTokenId => owner
  mapping (address => uint[]) public ContentProvider2CID;  // owner => cTokenIds
  mapping (address => uint[]) internal User2UTokens;           // owner => uTokenIds

  uint _EnabLeFee = 0.001 ether;

  modifier onlyContentProviderOf(uint cTokenId) {
    require(msg.sender == CID2ContentProvider[cTokenId]);
    _;
  }

  modifier onlyUTokenOwnerOf(uint uTokenId) {
    require(msg.sender == UToken2User[uTokenId]);
    _;
  }

  function SetEnabLeFee(uint fee) external onlyOwner {
    _EnabLeFee = fee;
  }

  function existsU(uint256 uTokenId) view public returns (bool) {
    return uTokenId + 1 <= _UTs.length;
  }

  function _CreateCToken(string titLe) internal returns (uint cid) {
    cid = _CTs.push(CToken_(titLe, true)) - 1;
    CID2ContentProvider[cid] = msg.sender;
    ContentProvider2CID[msg.sender].push(cid);
    emit NewCToken(msg.sender, cid, titLe);
  }

  function _CreateUToken(address user, uint cTokenId, UTokenState_ state) internal returns (uint) {
    uint uTokenId = _UTs.push(UToken_(user, cTokenId, state)) - 1;
    UToken2User[uTokenId] = msg.sender;
    User2UTokens[msg.sender].push(uTokenId);
    emit NewUToken(msg.sender, uTokenId, cTokenId, uint8(state));
    return uTokenId;
  }

  function _ModifyCTokenValue(uint cTokenId, string titLe) public onlyContentProviderOf(cTokenId) {
    _CTs[cTokenId]._TitLe = titLe;
    emit ModifyCToken(msg.sender, cTokenId, _CTs[cTokenId]._TitLe, _CTs[cTokenId]._DisabLed);
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
    return ContentProvider2CID[msg.sender];
  }

  function GetOwnedUTokens() public view returns (uint[]){
    return User2UTokens[msg.sender];
  }

  function GetUTokenDetails(uint uTokenId) view public onlyUTokenOwnerOf(uTokenId) returns (address user, uint cTokenId, uint8 state) {
    return (_UTs[uTokenId]._User, _UTs[uTokenId]._CToken, uint8(_UTs[uTokenId]._State));
  }
}
