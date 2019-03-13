pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/introspection/SupportsInterfaceWithLookup.sol";
// import "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";
// import "openzeppelin-solidity/contracts/token/ERC721/ERC721Receiver.sol";
import "openzeppelin-solidity/contracts/AddressUtils.sol";

import "../../Libraries/ObjectsLib.sol";

// Packed NFT that has storage which is batch transfer compatible
// contract ERC721ZTokenNFT is ERC721, SupportsInterfaceWithLookup {
contract ERC721ZTokenNFT is SupportsInterfaceWithLookup {

    using ObjectLib for ObjectLib.Operations;
    using ObjectLib for uint256;
    using AddressUtils for address;

    event Transfer(
      address indexed _from,
      address indexed _to,
      uint256 indexed _tokenId
    );
    event Approval(
      address indexed _owner,
      address indexed _approved,
      uint256 indexed _tokenId
    );
    event ApprovalForAll(
      address indexed _owner,
      address indexed _operator,
      bool _approved
    );

    struct TokenInfo_ {
      uint16 _Amount;
      bool _IsInfinity;
    }

    // bytes4 internal constant InterfaceId_ERC721Enumerable = 0x780e9d63;
    bytes4 internal constant ERC721_RECEIVED = 0x150b7a02;
    bytes4 internal constant InterfaceId_ERC721Metadata = 0x5b5e139f;

    uint256[] internal allTokens;
    mapping(uint256 => address) internal tokenOwner;
    mapping(address => mapping(address => bool)) operators;
    mapping(uint256 => address) internal tokenApprovals;
    mapping(uint256 => uint256) tokenType;
    mapping(address => mapping(uint => TokenInfo_)) internal addressToTokenInfo;

    uint256 constant NFT = 1;
    uint256 constant FT = 2;

    constructor() public {
        // _registerInterface(InterfaceId_ERC721Enumerable);
        _registerInterface(InterfaceId_ERC721Metadata);
    }

    function name() external view returns (string) {
        return "ERC721ZTokenNFT";
    }

    function symbol() external view returns (string) {
        return "ERC721Z";
    }

    /**
     * @dev Returns whether the specified token exists
     * @param _tokenId uint256 ID of the token to query the existence of
     * @return whether the token exists
     */
    function exists(uint256 _tokenId) public view returns (bool) {
        return tokenType[_tokenId] != 0;
    }

    function implementsERC721() public pure returns (bool) {
        return true;
    }

    /**
     * @dev Gets the total amount of tokens stored by the contract
     * @return uint256 representing the total amount of tokens
     */
    function totalSupply() public view returns (uint256) {
        return allTokens.length;
    }

    /**
     * @dev Gets the token ID at a given index of all the tokens in this contract
     * Reverts if the index is greater or equal to the total number of tokens
     * @param _index uint256 representing the index to be accessed of the tokens list
     * @return uint256 token ID at the given index of the tokens list
     */
    function tokenByIndex(uint256 _index) public view returns (uint256) {
        require(_index < totalSupply());
        return allTokens[_index];
    }

    /**
     * @dev Gets the owner of a given NFT
     * @param _tokenId uint256 representing the unique token identifier
     * @return address the owner of the token
     */
    function ownerOf(uint256 _tokenId) public view returns (address) {
        require(tokenOwner[_tokenId] != address(0), "Coin does not exist");
        return tokenOwner[_tokenId];
    }

    /**
     * @dev return the _tokenId type' balance of _address
     * @param _owner Address to query balance of
     * @param _tokenId type to query balance of
     * @return Amount of objects of a given type ID
     */
    function balanceOf(address _owner, uint256 _tokenId) public view returns (uint256) {
      return addressToTokenInfo[_owner][_tokenId]._Amount;
    }

    function checkInfinity(address _address, uint256 _tokenId) public view returns (bool) {
      return addressToTokenInfo[_address][_tokenId]._IsInfinity;
    }

    function tokenURI(uint256 _tokenId) public view returns (string tokenUri) {
        require(exists(_tokenId), "Token doesn't exist");
        tokenUri = "https://rinkeby.loom.games/erc721/zmb/000000.json";

        bytes memory _uriBytes = bytes(tokenUri);
        _uriBytes[38] = byte(48+(_tokenId / 100000) % 10);
        _uriBytes[39] = byte(48+(_tokenId / 10000) % 10);
        _uriBytes[40] = byte(48+(_tokenId / 1000) % 10);
        _uriBytes[41] = byte(48+(_tokenId / 100) % 10);
        _uriBytes[42] = byte(48+(_tokenId / 10) % 10);
        _uriBytes[43] = byte(48+(_tokenId / 1) % 10);

        return tokenUri;
    }

    /**
     * @dev Will set _operator operator status to true or false
     * @param _operator Address to changes operator status.
     * @param _approved  _operator's new operator status (true or false)
     */
    function setApprovalForAll(address _operator, bool _approved) public {
        // Update operator status
        operators[msg.sender][_operator] = _approved;
        emit ApprovalForAll(msg.sender, _operator, _approved);
    }

    /**
     * @dev Approves another address to transfer the given token ID
     * The zero address indicates there is no approved address.
     * There can only be one approved address per token at a given time.
     * Can only be called by the token owner or an approved operator.
     * @param _to address to be approved for the given token ID
     * @param _tokenId uint256 ID of the token to be approved
     */
    function approve(address _to, uint256 _tokenId) public {
        address owner = ownerOf(_tokenId);
        require(_to != owner);
        require(msg.sender == owner || isApprovedForAll(owner, msg.sender));

        tokenApprovals[_tokenId] = _to;
        emit Approval(owner, _to, _tokenId);
    }

    function _mint(uint256 _tokenId, address _to) public {
        require(!exists(_tokenId), "Error: Tried to mint duplicate token id");
        _updateTokenBalance(_to, _tokenId, 1, ObjectLib.Operations.REPLACE);
        tokenOwner[_tokenId] = _to;
        tokenType[_tokenId] = NFT;
        allTokens.push(_tokenId);
        emit Transfer(address(this), _to, _tokenId);
    }

    function _updateTokenBalance(
        address _from,
        uint256 _tokenId,
        uint256 _amount,
        ObjectLib.Operations op
    )
        internal
    {
        if(checkInfinity(_from, _tokenId)) {
          return;
        }
        if(_amount == 0) {
          addressToTokenInfo[_from][_tokenId]._IsInfinity = true;
          addressToTokenInfo[_from][_tokenId]._Amount =
          ObjectLib.updateTokenBalance(addressToTokenInfo[_from][_tokenId]._Amount,
            0, ObjectLib.Operations.REPLACE);
        } else {
          addressToTokenInfo[_from][_tokenId]._Amount =
          ObjectLib.updateTokenBalance(addressToTokenInfo[_from][_tokenId]._Amount,
            _amount, op);
        }
    }

    /**
     * @dev Gets the approved address for a token ID, or zero if no address set
     * @param _tokenId uint256 ID of the token to query the approval of
     * @return address currently approved for the given token ID
     */
    function getApproved(uint256 _tokenId) public view returns (address) {
        return tokenApprovals[_tokenId];
    }

    /**
     * @dev Function that verifies whether _operator is an authorized operator of _tokenHolder.
     * @param _operator The address of the operator to query status of
     * @param _owner Address of the tokenHolder
     * @return A uint256 specifying the amount of tokens still available for the spender.
     */
    function isApprovedForAll(address _owner, address _operator) public view returns (bool isOperator) {
        return operators[_owner][_operator];
    }

    function isApprovedOrOwner(address _spender, address _owner, uint256 _tokenId)
        internal
        view
        returns (bool)
    {
        return (
            _spender == _owner ||
            getApproved(_tokenId) == _spender ||
            isApprovedForAll(_owner, _spender)
        );
    }
}
