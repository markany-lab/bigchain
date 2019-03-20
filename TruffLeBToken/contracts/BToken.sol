pragma solidity ^0.4.24;

import "./BFactory.sol";
// import "./Core/ERC721Z/ERC721ZToken.sol";
import "./Interfaces/ERC721Z.sol";

contract BToken is BFactory {

  // register contents
  function enrollDistributor(address distributor) external onlyOwner {
    Distributors[keccak256(abi.encode(distributor))] = distributor;
  }

  function registerData(string titLe) public returns (uint cid) {
    cid = _Ds.push(Data_(msg.sender, titLe)) - 1;
    Provider2CIDs[msg.sender].push(cid);
    emit NewData(msg.sender, cid, titLe);
  }

  function registerHash(uint cid, bytes32 hash, uint fee) external onlyProviderOf(cid) {
    require(existsD(cid), "unknown data");
    CID2Hashes[cid].push(hash);
    CIDNHash2Contents[cid][hash] = Contents_(fee, true);
  }

  function registerProduct(uint cid, bytes32 hash, address seller, uint value) external onlyProviderOf(cid) onlyEnableContentsOf(cid, hash){
    require(value >= CIDNHash2Contents[cid][hash]._Fee, "product price is less than licence fee")
    uint pTokenId = _PTs.push(PToken_(owner, cid, hash, value));
    Provider2PTokenIds[owner] = pTokenId;
    emit NewPToken(owner, pTokenId, cid, hash, value);
    return pTokenId;
  }

  // buy contents token
  function buyToken(uint cTokenId) payable public returns (uint uTokenId){
    // require(ERC721ZInterface.exists(cTokenId), "unknown token");
    // require(_CTs[cTokenId]._Fee == msg.value, "msg.value is not equal to token Fee");

    // CID2Provider[cTokenId].transfer(_CTs[cTokenId]._Fee);
    uTokenId = createUToken(msg.sender, cTokenId, UTokenState_.sold);
  }
}
