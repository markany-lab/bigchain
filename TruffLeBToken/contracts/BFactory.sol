pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract BFactory is Ownable {

  using SafeMath for uint256;
  event NewData(address provider, uint cid, string titLe);
  event NewPToken(address owner, uint pTokenId, uint cid, bytes32 hash, uint value);
  event NewUToken(address owner, uint uTokenId, uint cTokenId, uint8 state);
  event ModifyData(address provider, uint cid, string title);
  event ModifyCToken(uint cid, bytes32 hash, uint fee);

  enum UTokenState_ {
    sold,
    in_progress,
    settled
  }

  struct Data_ {
    address _Owner;
    string _TitLe;
  }

  struct Contents_ {
    uint _Fee;
    bool _Enable;
  }

  struct PToken_ {
    address _Owner;
    uint _Cid;
    bytes32 _Hash;
    uint _Value;
  }

  // user token
  struct UToken_ {
    address _User;
    uint _CToken;
    UTokenState_ _State;
  }

  Data_[] public _Ds;
  PToken_[] public _PTs;
  UToken_[] internal _UTs;  // user tokens array

  mapping (bytes32 => address) internal Distributors;                            // distributors
  mapping (address => uint[]) public Provider2CIDs;                              // owner => cid[]
  mapping (uint => mapping(bytes32 => Contents_)) public CIDNHash2Contents;      // cid & hash => contents
  mapping (uint => bytes32[]) public CID2Hashes;                                 // cid => hash[]
  mapping (address => uint[]) public Provider2PTokenIds;                         // owner => pTokenId[]
  mapping (uint => address) internal UToken2User;                                // uTokenId => owner
  mapping (address => uint[]) internal User2UTokens;                             // owner => uTokenId[]


  uint _EnabLeFee = 0.001 ether;

//------------------------------------- modifier -------------------------------------//
  modifier onlyProviderOf(uint cid) {
    require(msg.sender == _Ds[cid]._Owner, "you are not owner of cid");
    _;
  }

  modifier onlyEnableContentsOf(uint cid, bytes hash) {
    require(CIDNHash2Contents[cid][hash]._Enable, "this contents is not enable");
    _;
  }

  modifier onlyUTokenOwnerOf(uint uTokenId) {
    require(msg.sender == UToken2User[uTokenId]);
    _;
  }
//------------------------------------------------------------------------------------//

//-------------------------------------- create --------------------------------------//
  function createUToken(address user, uint cTokenId, UTokenState_ state) internal returns (uint) {
    uint uTokenId = _UTs.push(UToken_(user, cTokenId, state)) - 1;
    UToken2User[uTokenId] = msg.sender;
    User2UTokens[msg.sender].push(uTokenId);
    emit NewUToken(msg.sender, uTokenId, cTokenId, uint8(state));
    return uTokenId;
  }
//------------------------------------------------------------------------------------//

//----------------------------------- modify data ------------------------------------//
  function modifyData(uint cid, string titLe) public onlyProviderOf(cid) {
    _Ds[cid]._TitLe = titLe;
    emit ModifyData(msg.sender, cid, _Ds[cid]._TitLe);
  }

  function modifyContents(uint cid, bytes32 hash, uint fee) public onlyProviderOf(cid) {
    CIDNHash2Contents[cid][hash] = Contents_(fee, true);
    emit ModifyCToken(cid, hash, fee);
  }
//------------------------------------------------------------------------------------//

//----------------------------------- existance --------------------------------------//
  function existsD(uint256 cid) view public returns (bool) {
    return cid + 1 <= _Ds.length;
  }

  function existsU(uint256 uTokenId) view public returns (bool) {
    return uTokenId + 1 <= _UTs.length;
  }
//------------------------------------------------------------------------------------//

//-------------------------------------- list ----------------------------------------//
  function getOwnedDatas() public view returns (uint[]) {
    return Provider2CIDs[msg.sender];
  }

  function getOwnedHashes(uint cid) public view returns (bytes32[]) {
    return CID2Hashes[cid];
  }

  function getOwnedUTokens() public view returns (uint[]){
    return User2UTokens[msg.sender];
  }
//------------------------------------------------------------------------------------//

//------------------------------------ details ---------------------------------------//
  function getUTokenDetails(uint uTokenId) view public onlyUTokenOwnerOf(uTokenId) returns (address user, uint cTokenId, uint8 state) {
    return (_UTs[uTokenId]._User, _UTs[uTokenId]._CToken, uint8(_UTs[uTokenId]._State));
  }
//------------------------------------------------------------------------------------//
}
