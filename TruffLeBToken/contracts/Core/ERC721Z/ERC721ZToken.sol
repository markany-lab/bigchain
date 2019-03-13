pragma solidity ^0.4.24;

import "./../../Interfaces/ERC721Z.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "./ERC721ZTokenNFT.sol";

// import "openzeppelin-solidity/contracts/AddressUtils.sol";
// import "./../../Libraries/ObjectsLib.sol";


// Additional features over NFT token that is compatible with batch transfers
contract ERC721ZToken is ERC721Z, ERC721ZTokenNFT, Ownable {

    using ObjectLib for ObjectLib.Operations;
    using AddressUtils for address;

    bytes4 internal constant ERC721Z_RECEIVED = 0x660b3370;
    bytes4 internal constant ERC721Z_BATCH_RECEIVE_SIG = 0xe9e5be6a;

    event BatchTransfer(address from, address to, uint256[] tokenTypes, uint256[] amounts);
    address onlyContract = address(0);

    modifier isOwner() {
        require((msg.sender == owner), "msg.sender is neither _from nor operator");
        _;
    }

    modifier isOnlyContract() {
      require(onlyContract != address(0), "onlyContract is not set");
      require(msg.sender == onlyContract, "your contract is not permissioned to call this contract");
      _;
    }

    function implementsERC721Z() public pure returns (bool) {
        return true;
    }

    function setOnlyContract(address contractAddress) external isOwner {
      onlyContract = contractAddress;
    }

    function getOnlyContract() view external isOwner returns(address) {
      return onlyContract;
    }

    /**
     * @dev transfer objects from different tokenIds to specified address
     * @param _from The address to BatchTransfer objects from.
     * @param _to The address to batchTransfer objects to.
     * @param _tokenIds Array of tokenIds to update balance of
     * @param _amounts Array of amount of object per type to be transferred.
     * Note:  Arrays should be sorted so that all tokenIds in a same bin are adjacent (more efficient).
     */
    function _batchTransferFrom(address _from, address _to, uint256[] _tokenIds, uint256[] _amounts)
        internal
        isOnlyContract
    {
        // Requirements
        require(_tokenIds.length == _amounts.length, "Inconsistent array length between args");
        require(_to != address(0), "Invalid recipient");

        // Number of transfers to execute
        uint256 nTransfer = _tokenIds.length;

        for (uint256 i = 0; i < nTransfer; i++) {
            // If we're transferring an NFT we additionally should update the tokenOwner and emit the corresponding event
            if (tokenType[_tokenIds[i]] == NFT) {
                tokenOwner[_tokenIds[i]] = _to;
                emit Transfer(_from, _to, _tokenIds[i]);
            }

            // Update memory balance
            _updateTokenBalance(_from, _tokenIds[i], _amounts[i], ObjectLib.Operations.SUB);
            _updateTokenBalance(_to, _tokenIds[i], _amounts[i], ObjectLib.Operations.ADD);
        }

        // Emit batchTransfer event
        emit BatchTransfer(_from, _to, _tokenIds, _amounts);
    }

    function batchTransferFrom(address _from, address _to, uint256[] _tokenIds, uint256[] _amounts) public {
        // Batch Transfering
        _batchTransferFrom(_from, _to, _tokenIds, _amounts);
    }

    function transfer(address _to, uint256 _tokenId, uint256 _amount) public {
        _transferFrom(msg.sender, _to, _tokenId, _amount);
    }

    function transferFrom(address _from, address _to, uint256 _tokenId, uint256 _amount) public {
        _transferFrom(_from, _to, _tokenId, _amount);
    }

    function _transferFrom(address _from, address _to, uint256 _tokenId, uint256 _amount)
        internal
        isOnlyContract
    {
        require(tokenType[_tokenId] == FT);
        require(_to != address(0), "Invalid to address");
        if(!checkInfinity(_from, _tokenId)) {
          require(_amount <= balanceOf(_from, _tokenId), "Quantity greater than from balance");
          _updateTokenBalance(_from, _tokenId, _amount, ObjectLib.Operations.SUB);
        }

        _updateTokenBalance(_to, _tokenId, _amount, ObjectLib.Operations.ADD);
        emit TransferWithQuantity(_from, _to, _tokenId, _amount);
    }

    function burn(address _from, uint256 _tokenId, uint256 _amount) public {
      require(tokenType[_tokenId] == FT);
      if(!checkInfinity(_from, _tokenId)) {
        require(_amount <= balanceOf(_from, _tokenId), "Quantity greater than from balance");
        _updateTokenBalance(_from, _tokenId, _amount, ObjectLib.Operations.SUB);
      }
    }

    function _mint(uint256 _tokenId, address _to, uint256 _supply) public isOnlyContract {
        // If the token doesn't exist, add it to the tokens array
        if (!exists(_tokenId)) {
            tokenType[_tokenId] = FT;
            allTokens.push(_tokenId);
        } else {
            // if the token exists, it must be a FT
            require(tokenType[_tokenId] == FT, "Not a FT");
        }

        _updateTokenBalance(_to, _tokenId, _supply, ObjectLib.Operations.ADD);
        emit TransferWithQuantity(address(this), _to, _tokenId, _supply);
    }
}
