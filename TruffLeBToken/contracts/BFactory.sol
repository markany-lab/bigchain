pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract BFactory is Ownable {

  using SafeMath for uint256;
  event NewData(address provider, uint cid, string titLe);
  event NewCToken(uint cTokenId, uint cid, bytes32 hash, uint fee, uint supply);
  event NewUToken(address owner, uint uTokenId, uint cTokenId, uint8 state);
  event NewDistCon(address owner, address distributor, uint cTokenId, uint cost, bool exclusivity, uint timeout);
  event ModifyData(address provider, uint cid, string title);
  event ModifyCToken(uint cTokenId, uint cid, bytes32 hash, uint fee);

  enum UTokenState_ {
    sold,
    in_progress,
    settled
  }

  struct Data_ {
    string _TitLe;
  }

  struct CToken_ {
    uint _Cid;
    bytes32 _Hash;
    uint _Fee;
    uint _Supply;
    bool _DisabLed;
  }

  struct UToken_ {
    address _User;
    uint _CToken;
    UTokenState_ _State;
  }

  struct DistCon_ {
    address _Distributor;
    uint _Cost;
    bool _Exclusivity;
    uint _Timeout;
  }

  Data_[] public _CIDs;
  CToken_[] public _CTs;
  UToken_[] internal _UTs;  // user tokens array

  mapping (uint => address) public CID2Provider;     // cid => owner
  mapping (address => uint[]) public Provider2CID;   // owner => cid[]
  mapping (uint => uint[]) public CID2CTokenID;      // cid => cTokenId[]
  mapping (uint => address) internal UToken2User;    // uTokenId => owner
  mapping (address => uint[]) internal User2UTokens; // owner => uTokenId[]
  mapping (bytes32 => address) internal Distributors;
  mapping (uint => DistCon_[]) internal CTokenID2DistCon;
  mapping (uint => mapping(address => bool)) AuthorizedUsers;


  uint _EnabLeFee = 0.001 ether;

  modifier onlyProviderOfCID(uint cid) {
    require(msg.sender == CID2Provider[cid], "you are not owner of cid");
    _;
  }

  modifier onlyProviderOfCTokenID(uint cTokenId) {
    require(msg.sender == CID2Provider[_CTs[cTokenId]._Cid], "you are not owner of cTokenId");
    _;
  }

  modifier onlyUTokenOwnerOf(uint uTokenId) {
    require(msg.sender == UToken2User[uTokenId]);
    _;
  }

  modifier onlyDistributorOf(address distributor) {
    require(distributor != address(0));
    require(Distributors[keccak256(abi.encode(distributor))] == distributor, "you are not distributor");
    _;
  }

  modifier onlyAuthorizedOf(uint cTokenId) {
    require((msg.sender == CID2Provider[_CTs[cTokenId]._Cid]) ||
            (AuthorizedUsers[cTokenId][msg.sender]), "you are not authorized user");
    _;
  }

  function SetEnabLeFee(uint fee) external onlyOwner {
    _EnabLeFee = fee;
  }

  function _ModifyData(uint cid, string titLe) public onlyProviderOfCID(cid) {
    _CIDs[cid]._TitLe = titLe;
    emit ModifyData(msg.sender, cid, _CIDs[cid]._TitLe);
  }

  function _CreateCToken(uint cid, bytes32 hash, uint fee, uint supply) internal onlyProviderOfCID(cid) returns (uint cTokenId){
    cTokenId = _CTs.push(CToken_(cid, hash, fee, supply, true)) - 1;
    CID2CTokenID[cid].push(cTokenId);
    emit NewCToken(cTokenId, cid, hash, fee, supply);
  }

  function _ModifyCToken(uint cTokenId, uint cid, bytes32 hash, uint fee) public onlyProviderOfCTokenID(cTokenId) {
    _CTs[cTokenId]._Cid = cid;
    _CTs[cTokenId]._Hash = hash;
    _CTs[cTokenId]._Fee = fee;
    emit ModifyCToken(cTokenId, cid, hash, fee);
  }

  function EnabLeCToken(uint cTokenId) external payable onlyProviderOfCTokenID(cTokenId) {
    require(msg.value == _EnabLeFee);
    require(_CTs[cTokenId]._DisabLed == true);
    _CTs[cTokenId]._DisabLed = false;
    owner.transfer(msg.value);
  }

  function DisabLeCToken(uint cTokenId) external onlyProviderOfCTokenID(cTokenId) {
    require(_CTs[cTokenId]._DisabLed == false);
    _CTs[cTokenId]._DisabLed = true;
  }

  function _CreateUToken(address user, uint cTokenId, UTokenState_ state) internal returns (uint) {
    uint uTokenId = _UTs.push(UToken_(user, cTokenId, state)) - 1;
    UToken2User[uTokenId] = msg.sender;
    User2UTokens[msg.sender].push(uTokenId);
    emit NewUToken(msg.sender, uTokenId, cTokenId, uint8(state));
    return uTokenId;
  }

  function existsD(uint256 cid) view public returns (bool) {
    return cid + 1 <= _CIDs.length;
  }

  function existsU(uint256 uTokenId) view public returns (bool) {
    return uTokenId + 1 <= _UTs.length;
  }

  function GetOwnedDatas() public view returns (uint[]){
    return Provider2CID[msg.sender];
  }

  function GetDataDetails(uint cid) public view returns (string title) {
    return _CIDs[cid]._TitLe;
  }

  function GetOwnedCTokens() public view returns (uint[]) {
    uint length = 0;
    uint[] memory cids = GetOwnedDatas();
    for(uint i = 0; i < cids.length; i++) {
      length += CID2CTokenID[cids[i]].length;
    }
    uint[] memory cTokens = new uint[](length);
    uint count = 0;
    for(i = 0; i < cids.length; i++) {
      for(uint j = 0; j < CID2CTokenID[cids[i]].length; j++) {
        cTokens[count] = CID2CTokenID[cids[i]][j];
        count++;
      }

    }
    return cTokens;
  }

  function GetOwnedUTokens() public view returns (uint[]){
    return User2UTokens[msg.sender];
  }

  function GetUTokenDetails(uint uTokenId) view public onlyUTokenOwnerOf(uTokenId) returns (address user, uint cTokenId, uint8 state) {
    return (_UTs[uTokenId]._User, _UTs[uTokenId]._CToken, uint8(_UTs[uTokenId]._State));
  }
}
