pragma solidity ^0.4.24;
// pragma experimental ABIEncoderV2;

import "./BFactory.sol";

contract BToken is BFactory {
  uint8 _cid = 0;
  function getCID() public {
    require(verifyRole(msg.sender, P) || verifyRole(msg.sender, CP));
    Cid2O[_cid] = msg.sender;
    emit NewID(_cid);
    _cid++;
  }

  //------------------------------------------ regist ------------------------------------------//
  function registData(address dOwner, uint8 cid, string ccid, string version, string category, string subCategory, string title, string fileDetails)
  public
  onlyRoleOf(dOwner, CP) {
    require(verifyRole(msg.sender, P) || verifyRole(msg.sender, CP) && msg.sender == dOwner);
    require(msg.sender == Cid2O[cid]);
    _Data memory data = _Data(dOwner, cid, ccid, version, category, subCategory, title, fileDetails);
    uint dataId = _Ds.push(data) - 1;
    O2Dids[dOwner].push(dataId);
    K2Did[keccak256(abi.encodePacked(ccid, version))] = dataId;
    emit NewID(dataId);
  }

  function registFileFee(string ccid, string version, string filePath, uint fee, uint chunks)
  public
  onlyRoleOf(msg.sender, CP) {
    require(_Ds[getDataIndex(ccid, version)].owner == msg.sender);
    K2F[keccak256(abi.encodePacked(ccid, version, filePath))] = _File(fee, chunks, true);
  }

  function registProduct(string ccid, string version, string filePath, uint price)
  public
  onlyRoleOf(msg.sender, D)
  onlyVFOf(ccid, version, filePath) {
    require(getFileInfo(ccid, version, filePath).fee <= price);
    _Product memory product = _Product(msg.sender, ccid, version, filePath, price);
    uint pTokenId = _Ps.push(product) - 1;
    O2Pids[msg.sender].push(pTokenId);
    emit NewID(pTokenId);
  }

  function buyProduct(uint pTokenId)
  payable public
  onlyVPOf(pTokenId) {
    _Product memory _P = _Ps[pTokenId];
    require(msg.value >= _P.price);
    uint uTokenId = _Ts.push(_Token(msg.sender, pTokenId, TokenState.valid)) - 1;
    O2Tids[msg.sender].push(uTokenId);
    address cOwner = _Ds[getDataIndex(_P.ccid, _P.version)].owner;
    uint fee = getFileInfo(_P.ccid, _P.version, _P.filePath).fee;
    cOwner.transfer(fee);
    _P.owner.transfer(_P.price - fee);
    msg.sender.transfer(msg.value - _P.price);
    emit NewID(uTokenId);
  }
  //--------------------------------------------------------------------------------------------//

  //------------------------------------------- list -------------------------------------------//
  function getDataList()
  view public
  returns (uint[] list) {
    return O2Dids[msg.sender];
  }

  function getProductList()
  view public
  returns (uint[] list) {
    return O2Pids[msg.sender];
  }

  function getTokenList()
  view public
  returns (uint[] list) {
    return O2Tids[msg.sender];
  }
  //--------------------------------------------------------------------------------------------//

  //----------------------------------------- details ------------------------------------------//
  function getDataDetails(uint dataId)
  view public
  returns (address, uint8, string, string, string, string, string, string) {
    require(_Ds[dataId].owner != address(0));
    _Data memory _D = _Ds[dataId];
    return (_D.owner, _D.cid, _D.ccid, _D.version, _D.category, _D.subCategory, _D.title, _D.fileDetails);
  }

  function getFileFee(string ccid, string version, string filePath)
  view public
  onlyVFOf(ccid, version, filePath)
  returns (uint fee) {
    return getFileInfo(ccid, version, filePath).fee;
  }

  function getProductDetails(uint pTokenId)
  view public
  onlyVPOf(pTokenId)
  returns (address, string, string, string, uint) {
    _Product memory _P = _Ps[pTokenId];
    return (_P.owner, _P.ccid, _P.version, _P.filePath, _P.price);
  }

  function getTokenDetails(uint uTokenId)
  view public
  onlyUOf(uTokenId)
  returns (address, uint, uint8) {
    _Token memory _T = _Ts[uTokenId];
    return (_T.owner, _T.pTokenId, uint8(_T.state));
  }
  //--------------------------------------------------------------------------------------------//



}
