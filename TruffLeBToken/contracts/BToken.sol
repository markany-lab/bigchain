pragma solidity ^0.4.24;

import "./BFactory.sol";
// import "./Core/ERC721Z/ERC721ZToken.sol";
import "./Interfaces/ERC721Z.sol";

contract BToken is BFactory {

  ERC721Z ERC721ZInterface;

  // ERC721ZInterface tools
  function setERC721ZInterface(address contractAddress) public{
    ERC721ZInterface = ERC721Z(contractAddress);
  }

  function balanceOf(address owner, uint256 cTokenId) public view returns (uint256) {
    return ERC721ZInterface.balanceOf(owner, cTokenId);
  }

  function exists(uint256 _tokenId) public view returns (bool) {
    return ERC721ZInterface.exists(_tokenId);
  }

  function ownerOf(uint256 _tokenId) public view returns (address _owner) {
    return ERC721ZInterface.ownerOf(_tokenId);
  }

  function totalSupply() public view returns (uint256) {
    return ERC721ZInterface.totalSupply();
  }

  // register contents
  function registerData(string titLe) public returns (uint cid) {
    cid = _CIDs.push(Data_(titLe)) - 1;
    CID2Provider[cid] = msg.sender;
    Provider2CID[msg.sender].push(cid);
    emit NewData(msg.sender, cid, titLe);
  }

  // increate the number of contents token
  function mintX_withTokenID(uint cTokenId, uint256 suppLy) external onlyProviderOfCTokenID(cTokenId) {
    ERC721ZInterface._mint(cTokenId, msg.sender, suppLy);
  }

  function registerHash(uint cid, bytes32 hash, uint fee, uint supply) external onlyProviderOfCID(cid) {
    require(existsD(cid), "unknown data");
    uint cTokenId = _CreateCToken(cid, hash, fee, supply);
    ERC721ZInterface._mint(cTokenId, msg.sender, supply);
  }

  function enrollDistributor(address distributor) external onlyOwner {
    Distributors[keccak256(abi.encode(distributor))] = distributor;
  }

  function distContract(uint cTokenId, address distributor, uint cost, bool exclusivity, uint timeout) external onlyProviderOfCTokenID(cTokenId) onlyDistributorOf(distributor) {
    if(exclusivity) {
      for(uint i = 0; i < CTokenID2DistCon[cTokenId].length; i++) {
        require(!CTokenID2DistCon[cTokenId][i]._Exclusivity, "exclusive distribution contract already exists");
      }
    }
    CTokenID2DistCon[cTokenId].push(DistCon_(distributor, cost, exclusivity, timeout));
    AuthorizedUsers[cTokenId][distributor] = true;
    emit NewDistCon(msg.sender, distributor, cTokenId, cost, exclusivity, timeout);
  }

  function getDistContracts(uint cTokenId) view public onlyAuthorizedOf(cTokenId) returns (uint count){
    count = CTokenID2DistCon[cTokenId].length;
  }

  function getDistConDetails(uint cTokenId, uint index) view external onlyAuthorizedOf(cTokenId) returns (address distributor, uint cost, bool exclusivity, uint timeout) {
      return (
        CTokenID2DistCon[cTokenId][index]._Distributor,
        CTokenID2DistCon[cTokenId][index]._Cost,
        CTokenID2DistCon[cTokenId][index]._Exclusivity,
        CTokenID2DistCon[cTokenId][index]._Timeout
      );
  }

  // buy contents token
  function buyToken(uint cTokenId) payable public returns (uint uTokenId){
    require(ERC721ZInterface.exists(cTokenId), "unknown token");
    require(_CTs[cTokenId]._Fee == msg.value, "msg.value is not equal to token Fee");

    CID2Provider[cTokenId].transfer(_CTs[cTokenId]._Fee);
    ERC721ZInterface.burn(CID2Provider[cTokenId], cTokenId, 1);
    uTokenId = _CreateUToken(msg.sender, cTokenId, UTokenState_.sold);
  }
}
