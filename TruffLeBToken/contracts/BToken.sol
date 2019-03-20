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
    cid = _Ds.push(Data_(titLe)) - 1;
    CID2Provider[cid] = msg.sender;
    Provider2CID[msg.sender].push(cid);
    emit NewData(msg.sender, cid, titLe);
  }

  function registerHash(uint cid, bytes32 hash, uint fee) external onlyProviderOf(cid) {
    require(existsD(cid), "unknown data");
    CID2Hashes[cid].push(hash);
    CIDNHash2Contents[cid][hash] = Contents_(fee);
  }

  function registerProduct(uint cid, bytes32 hash, address seller, uint value) external onlyProviderOf(cid) {

  }

  // buy contents token
  function buyToken(uint cTokenId) payable public returns (uint uTokenId){
    // require(ERC721ZInterface.exists(cTokenId), "unknown token");
    // require(_CTs[cTokenId]._Fee == msg.value, "msg.value is not equal to token Fee");

    // CID2Provider[cTokenId].transfer(_CTs[cTokenId]._Fee);
    uTokenId = _CreateUToken(msg.sender, cTokenId, UTokenState_.sold);
  }
}
