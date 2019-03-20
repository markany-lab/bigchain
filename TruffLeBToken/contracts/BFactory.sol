pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract BFactory is Ownable {

  using SafeMath for uint256;
  event NewData(address provider, uint cid, string titLe);
  event NewHash(uint cid, bytes32 hash, uint fee);
  event NewPToken(address owner, uint pTokenId, uint cid, bytes32 hash, uint price);
  event NewUToken(address owner, uint uTokenId, uint pTokenId, uint8 state);
  event ModifyData(address provider, uint cid, string title);
  event ModifyContents(uint cid, bytes32 hash, uint fee);
  event NewDistContract(address distributor, uint dcIndex, uint pTokenId, uint cost);
  event NewSearchContract(address searchProvider, uint pTokenId, uint cost);

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
    uint _Price;
  }

  struct DistCon_ {
    address _Distributor;
    uint _PTokenId;
    uint _Cost;
  }

  struct SearchCon_ {
    address _SearchProvider;
    uint _PTokenId;
    uint _Cost;
  }

  struct UToken_ {
    address _User;
    uint _PToken;
    UTokenState_ _State;
  }

  Data_[] public _Ds;
  PToken_[] public _PTs;
  DistCon_[] internal _DCs;
  SearchCon_[] internal _SCs;
  UToken_[] internal _UTs;

  mapping (bytes32 => address) internal Distributors;                           // distributors
  mapping (bytes32 => address) internal SearchProviders;                        // search providers
  mapping (address => uint[]) public Provider2CIDs;                             // owner => cid[]
  mapping (uint => mapping(bytes32 => Contents_)) public CIDNHash2Contents;     // cid & hash => contents
  mapping (uint => bytes32[]) public CID2Hashes;                                // cid => hash[]
  mapping (address => uint[]) public Owner2PTokenIds;                           // owner => pTokenId[]
  mapping (uint => uint[]) internal PTokenId2DistConIds;                        // pTokenId => dcIndexes[]
  mapping (address => uint[]) internal Owner2DistConIds;                        // owner => dcIndexes[]
  mapping (uint => uint[]) internal PTokenId2SearchConIds;                      // pTokenId => scIndexes[]
  mapping (address => uint[]) internal Owner2SearchConIds;                      // owner => scIndexes[]
  mapping (address => uint[]) internal User2UTokens;                            // owner => uTokenId[]

//------------------------------------- modifier -------------------------------------//
  modifier onlyProviderOf(uint cid) {
    require(msg.sender == _Ds[cid]._Owner, "you are not owner of cid");
    _;
  }

  modifier onlyEnableContentsOf(uint cid, bytes32 hash) {
    require(CIDNHash2Contents[cid][hash]._Enable, "this contents is not enable");
    _;
  }

  modifier onlyPTokenOwnerOf(uint pTokenId) {
    require(_PTs[pTokenId]._Owner == msg.sender, "you are not owner of pTokenId");
    _;
  }

  modifier onlyDistributorOf(address distributor) {
    require(Distributors[keccak256(abi.encode(distributor))] == distributor, "you are not distributor");
    _;
  }

  modifier onlySearchProviderOf(address searchProvider) {
    require(SearchProviders[keccak256(abi.encode(searchProvider))] == searchProvider, "you are not search provider");
    _;
  }

  modifier onlyDCPermisionedOf(uint dcIndex) {
    require(_DCs[dcIndex]._Distributor == msg.sender || _PTs[_DCs[dcIndex]._PTokenId]._Owner == msg.sender, "you are not permissioned to see distribution contract");
    _;
  }

  modifier onlySCPermissionedOf(uint scIndex) {
    require(_SCs[scIndex]._SearchProvider == msg.sender || _PTs[_SCs[scIndex]._PTokenId]._Owner == msg.sender, "you are not permissioned to see search provider contract");
    _;
  }

  modifier onlyUTokenOwnerOf(uint uTokenId) {
    require(msg.sender == _UTs[uTokenId]._User);
    _;
  }
//------------------------------------------------------------------------------------//

//-------------------------------------- create --------------------------------------//
  function createUToken(address user, uint pTokenId, UTokenState_ state) internal {
    uint uTokenId = _UTs.push(UToken_(user, pTokenId, state)) - 1;
    User2UTokens[user].push(uTokenId);
    emit NewUToken(user, uTokenId, pTokenId, uint8(state));
  }
//------------------------------------------------------------------------------------//

//----------------------------------- modify data ------------------------------------//
  function modifyData(uint cid, string titLe) public onlyProviderOf(cid) {
    _Ds[cid]._TitLe = titLe;
    emit ModifyData(msg.sender, cid, _Ds[cid]._TitLe);
  }

  function modifyContents(uint cid, bytes32 hash, uint fee) public onlyProviderOf(cid) {
    CIDNHash2Contents[cid][hash] = Contents_(fee, true);
    emit ModifyContents(cid, hash, fee);
  }
//------------------------------------------------------------------------------------//

//----------------------------------- existance --------------------------------------//
  function existsD(uint256 cid) view public returns (bool) {
    return cid + 1 <= _Ds.length;
  }

  function existsP(uint256 pTokenId) view public returns (bool) {
    return pTokenId + 1 <= _PTs.length;
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

  function getOwnedPTokens() public view returns (uint[]) {
    return Owner2PTokenIds[msg.sender];
  }

  function getOwnedDCs() public view returns (uint[]) {
    return Owner2DistConIds[msg.sender];
  }

  function getOwnedDCsWithPToken(uint pTokenId) view public onlyPTokenOwnerOf(pTokenId) returns (uint[]) {
    return PTokenId2DistConIds[pTokenId];
  }

  function getOwnedSCs() view public returns (uint[]) {
    return Owner2SearchConIds[msg.sender];
  }

  function getOwnedSCsWithPToken(uint pTokenId) view public onlyPTokenOwnerOf(pTokenId) returns (uint[]) {
    return PTokenId2SearchConIds[pTokenId];
  }

  function getOwnedUTokens() public view returns (uint[]){
    return User2UTokens[msg.sender];
  }
//------------------------------------------------------------------------------------//

//------------------------------------ details ---------------------------------------//
  function getDCDetails(uint dcIndex) view public onlyDCPermisionedOf(dcIndex) returns (address distributor, uint pTokenId, uint cost) {
    return (_DCs[dcIndex]._Distributor, _DCs[dcIndex]._PTokenId, _DCs[dcIndex]._Cost);
  }

  function getSCDetails(uint scIndex) view public onlySCPermissionedOf(scIndex) returns (address searchProvider, uint pTokenId, uint cost) {
    return (_SCs[scIndex]._SearchProvider, _SCs[scIndex]._PTokenId, _SCs[scIndex]._Cost);
  }

  function getUTokenDetails(uint uTokenId) view public onlyUTokenOwnerOf(uTokenId) returns (address user, uint cTokenId, uint8 state) {
    return (_UTs[uTokenId]._User, _UTs[uTokenId]._PToken, uint8(_UTs[uTokenId]._State));
  }
//------------------------------------------------------------------------------------//
}
