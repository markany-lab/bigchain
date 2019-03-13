pragma solidity ^0.4.24;

contract ERC721Z {
  function implementsERC721Z() public pure returns (bool);
  function ownerOf(uint256 _tokenId) public view returns (address _owner);
  function balanceOf(address _owner, uint256 _tokenId) public view returns (uint256);

  function transfer(address to, uint256 tokenId, uint256 quantity) public;
  function transferFrom(address from, address to, uint256 tokenId, uint256 quantity) public;

  // Fungible Safe Transfer From
  // function safeTransferFrom(address from, address to, uint256 tokenId, uint256 _amount) public;
  // function safeTransferFrom(address from, address to, uint256 tokenId, uint256 _amount, bytes data) public;

  // Batch Safe Transfer From
  // function safeBatchTransferFrom(address _from, address _to, uint256[] tokenIds, uint256[] _amounts, bytes _data) public;

  function name() external view returns (string);
  function symbol() external view returns (string);

  // Required Events
  event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
  event TransferWithQuantity(address indexed from, address indexed to, uint256 indexed tokenId, uint256 quantity);
  event ApprovalForAll(address indexed _owner, address indexed _operator, bool _approved);
  event BatchTransfer(address indexed from, address indexed to, uint256[] tokenTypes, uint256[] amounts);

  // Added Functions
  function _mint(uint256 _tokenId, address _to) public;
  function _mint(uint256 _tokenId, address _to, uint256 _supply) public;
  function exists(uint256 _tokenId) public view returns (bool);
  function checkInfinity(address _address, uint256 _tokenId) public view returns (bool);
  function totalSupply() public view returns (uint256);
  function burn(address _from, uint256 _tokenId, uint256 _amount) public;
}
