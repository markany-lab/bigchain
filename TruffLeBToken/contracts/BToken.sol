pragma solidity ^0.4.24;

import "./BFactory.sol";
// import "./Core/ERC721Z/ERC721ZToken.sol";
import "./Interfaces/ERC721Z.sol";

contract BToken is BFactory {

  // register contents
  function enrollDistributor(address distributor) external onlyOwner {
    require(Distributors[keccak256(abi.encode(distributor))] != distributor, "already enrolled distributor");
    Distributors[keccak256(abi.encode(distributor))] = distributor;
  }

  function enrollSearchProvider(address searchProvider) external onlyOwner {
    require(SearchProviders[keccak256(abi.encode(searchProvider))] != searchProvider, "already enrolled search provider");
    SearchProviders[keccak256(abi.encode(searchProvider))] = searchProvider;
  }

  function registerData(string titLe) external {
    uint cid = _Ds.push(Data_(msg.sender, titLe)) - 1;
    Provider2CIDs[msg.sender].push(cid);
    emit NewData(msg.sender, cid, titLe);
  }

  function registerHash(uint cid, bytes32 hash, uint fee) external onlyProviderOf(cid) {
    require(existsD(cid), "unknown data");
    require(!Hash2Contents[hash]._Enable, 'hash already exists');
    Hash2Contents[hash] = Contents_(cid, fee, true);
    CID2Hashes[cid].push(hash);
    emit NewHash(cid, hash, fee);
  }

  function registerProduct(bytes32 hash, address seller, uint value) external onlyProviderOf(Hash2Contents[hash]._Cid) onlyEnableContentsOf(hash){
    require(value >= Hash2Contents[hash]._Fee, "product price is less than licence fee");
    uint pTokenId = _PTs.push(PToken_(seller, hash, value)) - 1;
    Owner2PTokenIds[seller].push(pTokenId);
    emit NewPToken(seller, pTokenId, hash, value);
  }

  function getContractsTotalCost(uint pTokenId) view internal returns(uint totalCost) {
    totalCost = 0;
    for(uint i = 0; i < PTokenId2DistConIds[pTokenId].length; i++) {
      totalCost += _DCs[PTokenId2DistConIds[pTokenId][i]]._Cost;
    }
    for(i = 0; i < PTokenId2SearchConIds[pTokenId].length; i++) {
      totalCost += _SCs[PTokenId2SearchConIds[pTokenId][i]]._Cost;
    }
  }

  function distContract(uint pTokenId, address distributor, uint cost) external onlyPTokenOwnerOf(pTokenId) onlyDistributorOf(distributor) {
    require(existsP(pTokenId), "unknown pTokenId");
    uint totalCost = getContractsTotalCost(pTokenId);
    require(totalCost <= _PTs[pTokenId]._Price, "total cost is bigger than product price");
    uint dcIndex = _DCs.push(DistCon_(distributor, pTokenId, cost)) - 1;
    PTokenId2DistConIds[pTokenId].push(dcIndex);
    Owner2DistConIds[distributor].push(dcIndex);
    emit NewDistContract(distributor, dcIndex, pTokenId, cost);
  }

  function searchContract(uint pTokenId, address searchProvider, uint cost) external onlyPTokenOwnerOf(pTokenId) onlySearchProviderOf(searchProvider) {
    require(existsP(pTokenId), "unknown pTokenId");
    uint totalCost = getContractsTotalCost(pTokenId);
    require(totalCost <= _PTs[pTokenId]._Price, "total cost is bigger than product price");
    uint scIndex = _SCs.push(SearchCon_(searchProvider, pTokenId, cost)) - 1;
    PTokenId2SearchConIds[pTokenId].push(scIndex);
    Owner2SearchConIds[searchProvider].push(scIndex);
    emit NewSearchContract(searchProvider, pTokenId, cost);
  }

  function buyToken(uint pTokenId) payable external {
    require(existsP(pTokenId), "unknown pTokenId");
    require(_PTs[pTokenId]._Price <= msg.value, "msg.value is less than product price");
    uint totalCost = _PTs[pTokenId]._Price;
    msg.sender.transfer(msg.value - totalCost);
    for(uint i = 0; i < PTokenId2DistConIds[pTokenId].length; i++) {
      _DCs[PTokenId2DistConIds[pTokenId][i]]._Distributor.transfer(_DCs[PTokenId2DistConIds[pTokenId][i]]._Cost);
      totalCost -= _DCs[PTokenId2DistConIds[pTokenId][i]]._Cost;
    }
    for(i = 0; i < PTokenId2SearchConIds[pTokenId].length; i++) {
      _SCs[PTokenId2SearchConIds[pTokenId][i]]._SearchProvider.transfer(_SCs[PTokenId2SearchConIds[pTokenId][i]]._Cost);
      totalCost -= _SCs[PTokenId2SearchConIds[pTokenId][i]]._Cost;
    }
    _PTs[pTokenId]._Owner.transfer(totalCost);
    createUToken(msg.sender, pTokenId, UTokenState_.sold);
  }
}
