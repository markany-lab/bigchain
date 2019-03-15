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
  function mintX(string titLe, uint cid, uint fee, string hash, uint256 suppLy) external {
    uint cTokenID = _CreateCToken(titLe, cid, fee, hash);
    ERC721ZInterface._mint(cTokenID, msg.sender, suppLy);
  }

  // increate the number of contents token
  function mintX_withTokenID(uint cTokenId, uint256 suppLy) external onlyContentProviderOf(cTokenId) {
    ERC721ZInterface._mint(cTokenId, msg.sender, suppLy);
  }

  // buy contents token
  function buyToken(uint cTokenId) payable public returns (uint uTokenId){
    require(ERC721ZInterface.exists(cTokenId), "Token ID has not been minted");
    require(_CTs[cTokenId]._Fee == msg.value, "msg.value is not equal to token Fee");

    CToken2ContentProvider[cTokenId].transfer(_CTs[cTokenId]._Fee);
    ERC721ZInterface.burn(CToken2ContentProvider[cTokenId], cTokenId, 1);
    uTokenId = _CreateUToken(msg.sender, cTokenId, UTokenState_.sold);
  }
}
