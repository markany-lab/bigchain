pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract BFactory is Ownable {

  using SafeMath for uint256;
  event NewData(address provider, uint cid, string titLe);
  event NewCToken(uint cTokenId, uint cid, bytes32 hash, uint fee, uint supply);
  event NewUToken(address owner, uint uTokenId, uint cTokenId, uint8 state);
  event ModifyData(address provider, uint cid, string title);
  event ModifyCToken(uint cid, bytes32 hash, uint fee);

  enum UTokenState_ {
    sold,
    in_progress,
    settled
  }

  struct Data_ {
    string _TitLe;
  }

  struct Contents_ {
    uint _Fee;
  }

  // user token
  struct UToken_ {
    address _User;
    uint _CToken;
    UTokenState_ _State;
  }

  Data_[] public _Ds;
  UToken_[] internal _UTs;  // user tokens array

  mapping (bytes32 => address) internal Distributors;
  mapping (uint => address) public CID2Provider;                                // cid => owner
  mapping (address => uint[]) public Provider2CID;                              // owner => cid[]
  mapping (uint => mapping(bytes32 => Contents_)) public CIDNHash2Contents;  // cid & hash => contents
  mapping (uint => bytes32[]) public CID2Hashes;
  mapping (uint => address) internal UToken2User;                               // uTokenId => owner
  mapping (address => uint[]) internal User2UTokens;                            // owner => uTokenId[]


  uint _EnabLeFee = 0.001 ether;

  modifier onlyProviderOf(uint cid) {
    require(msg.sender == CID2Provider[cid], "you are not owner of cid");
    _;
  }

  modifier onlyUTokenOwnerOf(uint uTokenId) {
    require(msg.sender == UToken2User[uTokenId]);
    _;
  }

  function SetEnabLeFee(uint fee) external onlyOwner {
    _EnabLeFee = fee;
  }

  function _ModifyData(uint cid, string titLe) public onlyProviderOf(cid) {
    _Ds[cid]._TitLe = titLe;
    emit ModifyData(msg.sender, cid, _Ds[cid]._TitLe);
  }

  function _ModifyContents(uint cid, bytes32 hash, uint fee) public onlyProviderOf(cid) {
    CIDNHash2Contents[cid][hash] = Contents_(fee);
    emit ModifyCToken(cid, hash, fee);
  }

  function _CreateUToken(address user, uint cTokenId, UTokenState_ state) internal returns (uint) {
    uint uTokenId = _UTs.push(UToken_(user, cTokenId, state)) - 1;
    UToken2User[uTokenId] = msg.sender;
    User2UTokens[msg.sender].push(uTokenId);
    emit NewUToken(msg.sender, uTokenId, cTokenId, uint8(state));
    return uTokenId;
  }

  function existsD(uint256 cid) view public returns (bool) {
    return cid + 1 <= _Ds.length;
  }

  function existsU(uint256 uTokenId) view public returns (bool) {
    return uTokenId + 1 <= _UTs.length;
  }

  function getOwnedDatas() public view returns (uint[]) {
    return Provider2CID[msg.sender];
  }

  function getOwnedHashes(uint cid) public view returns (bytes32[]) {
    return CID2Hashes[cid];
  }

  function getOwnedUTokens() public view returns (uint[]){
    return User2UTokens[msg.sender];
  }

  function getContentsDetails(uint cid, bytes32 hash) view public returns (uint) {
    return CIDNHash2Contents[cid][hash]._Fee;
  }

  function getUTokenDetails(uint uTokenId) view public onlyUTokenOwnerOf(uTokenId) returns (address user, uint cTokenId, uint8 state) {
    return (_UTs[uTokenId]._User, _UTs[uTokenId]._CToken, uint8(_UTs[uTokenId]._State));
  }
}
