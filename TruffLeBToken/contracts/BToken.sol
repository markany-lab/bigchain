pragma solidity ^0.4.24;
// pragma experimental ABIEncoderV2;

import "./BFactory.sol";

contract BToken is BFactory {
  uint _cid = 0;
  function getCID(address cidOwner)
  public
  onlyRoleOf(msg.sender, P, false)
  onlyRoleOf(cidOwner, CP, true)
  {
    C2O[_cid] = _CID(cidOwner, true);
    emit NewID(0, _cid);
    _cid++;
  }

  //------------------------------------------ register ------------------------------------------//
  function registerData(uint _c, string c, string v, uint fee, string fH, uint[] chunks)
  public
  onlyRoleOf(msg.sender, CP, true)
  {
    require(C2O[_c].validity && msg.sender == C2O[_c].owner);
    C2O[_c].validity = false;
    uint dataId = uint(keccak256(abi.encodePacked(c, v)));
    require(_Ds[dataId].owner == address(0));
    bytes[] memory hashes = splitByLengths(fH);
    require(hashes.length == chunks.length);
    for(uint i = 0; i < hashes.length; i++) {
      uint fileId = uint(keccak256(abi.encodePacked(hashes[i])));
      _Fs[fileId] = _File(dataId, chunks[i]);
      I2I[dataId][0].push(fileId);
    }
    _Ds[dataId] = _Data(msg.sender, _c, c, v, fee, block.number, false);
    O2I[msg.sender][0].push(dataId);
    _DIDs.push(dataId);
  }

  function registerDataAttr(string c, string v, string info, address[] TD, address[] TU, uint[] ad)
  public
  onlyRoleOf(msg.sender, CP, true)
  {
    uint dataId = uint(keccak256(abi.encodePacked(c, v)));
    require(_Ds[dataId].owner == msg.sender);
    _DAs[dataId] = _DataAttr(info, TD, TU, ad);
    _Ds[dataId].validity = true;
    emit NewID(1, dataId);
  }

  function registerProduct(string c, string v, uint price)
  public
  onlyRoleOf(msg.sender, D, false)
  {
    uint dataId = uint(keccak256(abi.encodePacked(c, v)));
    require(_Ds[dataId].validity && _Ds[dataId].fee <= price);
    if (_DAs[dataId].TD[0] != address(0)) {
      require(checkAddr(_DAs[dataId].TD, msg.sender));
    }
    uint productId = uint(keccak256(abi.encodePacked(msg.sender, now, dataId, _DAs[dataId].TU, nonce)));
    nonce++;
    _Ps[productId] = _Product(msg.sender, dataId, price, _DAs[dataId].TU, true);
    O2I[msg.sender][1].push(productId);
    I2I[dataId][1].push(productId);
    emit NewID(2, productId);
  }

  function buyProduct(uint productId)
  payable public
  {
    _Product memory _P = _Ps[productId];
    _Data memory _D = _Ds[_P.dataId];
    if (_P.TU[0] != address(0)) {
      require(checkAddr(_P.TU, msg.sender));
    }
    require(_P.validity && _P.price <= msg.value);
    uint uTokenId = uint(keccak256(abi.encodePacked(msg.sender, now, nonce)));
    nonce++;
    _Ts[uTokenId] = _Token(msg.sender, productId, TokenState.valid);
    O2I[msg.sender][2].push(uTokenId);
    OC2T[msg.sender][_D.cid].push(uTokenId);
    _D.owner.transfer(_D.fee);
    _P.owner.transfer(_P.price - _D.fee);
    emit NewID(4, uTokenId);
  }
  //--------------------------------------------------------------------------------------------//

  //------------------------------------------- list -------------------------------------------//
  function getList(uint8 flag)
  view public
  returns (uint[] list) {
    return O2I[msg.sender][flag];
  }

  function getFileList(uint dataId)
  view public
  returns (uint[] list)
  {
    return I2I[dataId][0];
  }

  function getFileList(string c, string v)
  view public
  returns (uint[] list)
  {
    uint dataId = uint(keccak256(abi.encodePacked(c, v)));
    return getFileList(dataId);
  }

  function getDataLength() view public returns (uint) {
    return _DIDs.length;
  }
  //--------------------------------------------------------------------------------------------//

  //----------------------------------------- details ------------------------------------------//
  function getDataDetails(uint dataId)
  view public
  returns (address, uint, string, string, uint, uint, bool, string, address[], address[]) {
    _Data memory _D = _Ds[dataId];
    _DataAttr memory _DA = _DAs[dataId];
    return (_D.owner, _D.cid, _D.c, _D.v, _D.fee, _D.BN, _D.validity, _DA.info, _DA.TD, _DA.TU);
  }

  function getDataAtDetails(uint dataId)
  view public
  returns (uint[]) {
    _DataAttr memory _DA = _DAs[dataId];
    return (_DA.ad);
  }

  function getDataDetails(string c, string v)
  view public
  returns (address, uint, string, string, uint, uint, bool, string, address[], address[]) {
    uint dataId = uint(keccak256(abi.encodePacked(c, v)));
    return getDataDetails(dataId);
  }
  function getDataAtDetails(string c, string v)
  view public
  returns (uint[]) {
    uint dataId = uint(keccak256(abi.encodePacked(c, v)));
    return getDataAtDetails(dataId);
  }

  function getFileDetails1(uint fileId)
  view public
  returns (uint, uint) {
    _File memory _F = _Fs[fileId];
    return (_F.dataId, _F.chunks);
  }

  function getFileDetails2(string fileHash)
  view public
  returns (uint, uint) {
    uint fileId = uint(keccak256(abi.encodePacked(fileHash)));
    return getFileDetails1(fileId);
  }

  function getProductDetails(uint productId)
  view public
  returns (address, uint, uint, address[], bool) {
    _Product memory _P = _Ps[productId];
    return (_P.owner, _P.dataId, _P.price, _P.TU, _P.validity);
  }

  function getTokenDetails(uint uTokenId)
  view public
  returns (address, uint, uint8) {
    _Token memory _T = _Ts[uTokenId];
    require(msg.sender == _T.owner);
    return (_T.owner, _T.productId, uint8(_T.state));
  }

  function checkValidToken(address tOwner, uint8 cid)
  view public
  onlyRoleOf(msg.sender, P, false)
  returns (bool)
  {
    uint[] memory uTokenIds = OC2T[tOwner][cid];
    for(uint i = 0; i < uTokenIds.length; i++) {
      _Token memory _T = _Ts[uTokenIds[i]];
      if(_T.state == TokenState.valid) {
        return true;
      }
    }
    return false;
  }
  //--------------------------------------------------------------------------------------------//

  //---------------------------------- functions for BChannel ----------------------------------//
  function getDetailsForChannel(uint uTokenId)
  view external
  returns (address, uint, uint8, uint) {
    require(msg.sender == channelAddr);
    _Token memory _T = _Ts[uTokenId];
    uint[] memory fileIds = I2I[_Ps[_T.productId].dataId][0];
    uint chunks = 0;
    for (uint i = 0; i < fileIds.length; i++) {
      chunks += _Fs[fileIds[i]].chunks;
    }
    return (_T.owner, _T.productId, uint8(_T.state), chunks);
  }

  function tokenStateByChannel(uint uTokenId, uint8 state)
  external
  {
    require(msg.sender == channelAddr);
    _Ts[uTokenId].state = TokenState(state);
  }
  //--------------------------------------------------------------------------------------------//

  //----------------------------------- functions for BRevoke ----------------------------------//
  function getProductListForRevoke(uint dataId)
  view external
  returns (uint[]) {
    require(msg.sender == mspAddr);
    return (I2I[dataId][1]);
  }

  function getListForRevoke(address user, uint8 flag)
  view external
  returns (uint[]) {
    require(msg.sender == mspAddr);
    return O2I[user][flag];
  }

  function validityByRevoke(uint id, bool isData)
  external
  {
    require(msg.sender == mspAddr);
    if(isData) {
      _Ds[id].validity = false;
    } else {
      _Ps[id].validity = false;
    }
  }
  //--------------------------------------------------------------------------------------------//
}
