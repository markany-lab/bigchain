pragma solidity ^0.4.24;

import "./BMSP.sol";

contract BFactory is BMSP {

  enum TokenState {
    invalid,
    valid,
    in_progress
  }

  struct _Data {
    address owner;
    uint8 cid;
    string ccid;
    string version;
    string category;
    string subCategory;
    string title;
    string fileDetails;
  }

  struct _File {
    uint fee;
    uint chunks;
    bool validity;
  }

  struct _Product {
    address owner;
    string ccid;
    string version;
    string filePath;
    uint price;
  }

  struct _Token {
    address owner;
    uint pTokenId;
    TokenState state;
  }

  mapping (uint => address) internal Cid2O;                        //  cid => cid owner
  mapping (address => uint[]) public O2Dids;                       //  data owner => data ids
  mapping (bytes32 => uint) internal K2Did;                        //  data key => data id
  mapping (bytes32 => _File) internal K2F;                         //  file key => file
  mapping (address => uint[]) internal O2Pids;                     //  product owner => product ids
  mapping (address => uint[]) internal O2Tids;                     //  token owner => token ids

  event NewID(uint Id);

  _Data[] public _Ds;
  _Product[] public _Ps;
  _Token[] internal _Ts;

  modifier onlyVDOf(uint dataId) {
    require(_Ds[dataId].owner != address(0));
    _;
  }

  modifier onlyVFOf(string ccid, string version, string filePath) {
    require(getFileInfo(ccid, version, filePath).validity);
    _;
  }

  modifier onlyVPOf(uint pTokenId) {
    require(_Ps[pTokenId].owner != address(0));
    _;
  }

  modifier onlyVTOf(uint uTokenId) {
    require(_Ts[uTokenId].state == TokenState.valid);
    _;
  }

  modifier onlyUOf(uint uTokenId) {
    require(msg.sender != address(0));
    require(_Ts[uTokenId].owner == msg.sender);
    _;
  }

  function getDataIndex(string ccid, string version)
  view internal
  returns(uint) {
    return K2Did[keccak256(abi.encodePacked(ccid, version))];
  }

  function getFileInfo(string ccid, string version, string filePath)
  view internal
  returns(_File) {
    return K2F[keccak256(abi.encodePacked(ccid, version, filePath))];
  }
}
