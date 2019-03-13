pragma solidity ^0.4.24;

import "./BFactory.sol";
// import "./Core/ERC721Z/ERC721ZToken.sol";
import "./Interfaces/ERC721Z.sol";

contract BToken is BFactory {

  ERC721Z ERC721ZInterface;
  uint minDeposit = 0;
  uint unitPrice = 0;

  event channelOpened(uint oTokenId, address orderer, uint uTokenId, uint cTokenId, uint deposit);
  event settleFinished(address[] contributors, uint[] portions);

  function name() external pure returns (string) {
    return "B";
  }

  function symbol() external pure returns (string) {
    return "BT";
  }

  // config
  function setConfig(uint deposit, uint price) external onlyOwner {
    minDeposit = deposit;
    unitPrice = price;
  }

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

  // off-chain APIs
  function channelOpen(uint uTokenId) payable public onlyUTokenOwnerOf(uTokenId) returns (uint oTokenId) {
    require(existsU(uTokenId), "Token ID has not been minted");
    require(minDeposit <= msg.value, "deposit is too little");
    require(_UTs[uTokenId]._State == UTokenState_.sold, "this user token is not available");

    oTokenId = _CreateOToken(uTokenId, msg.value);
    _UTs[uTokenId]._State = UTokenState_.in_progress;
    OToken2Deposit[oTokenId] = msg.value;
    emit channelOpened(oTokenId, msg.sender, uTokenId, _UTs[uTokenId]._CToken, msg.value);
  }

  function channelOff(uint oTokenId) public {
    require(existsO(oTokenId), "this off-chain is not exists");
    require(_OTs[oTokenId]._State == OTokenState_.open, "this off-chain is already offed");
    _OTs[oTokenId]._State = OTokenState_.off;
  }

  function settleChannel(uint oTokenId, address[] contributor, uint[] portion) onlyOwner external {
    require(_OTs[oTokenId]._State == OTokenState_.off, "channel is not offed yet");

    uint balanceForUser = OToken2Deposit[oTokenId];
    uint[] memory payForSender = new uint[](contributor.length);
    uint totalPay = 0;
    for(uint i = 0; i < contributor.length; i++) {
      payForSender[i] = (unitPrice * portion[i]) / 100;
      totalPay += payForSender[i];
      require(totalPay <= balanceForUser, "deposit is less than total payment");
    }

    for(i = 0; i < contributor.length; i++) {
      contributor[i].transfer(payForSender[i]);
      balanceForUser -= payForSender[i];
    }

    (_OTs[oTokenId]._Orderer).transfer(balanceForUser);
    _UTs[_OTs[oTokenId]._UTokenId]._State = UTokenState_.settled;
    OToken2Deposit[oTokenId] = 0;

    emit settleFinished(contributor, portion);
  }

  // nft mint
  function mint(string titLe, uint cid, uint fee, string hash) external {
    uint cTokenID = _CreateCToken(titLe, cid, fee, hash);
    ERC721ZInterface._mint(cTokenID, msg.sender);
  }
}
