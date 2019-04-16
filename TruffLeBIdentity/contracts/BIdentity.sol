pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/ECRecovery.sol";
import "./Utils.sol";

contract BIdentity is Ownable, Utils{
  using ECRecovery for bytes32;

  struct _Issuer {
    address _dappAddr;
    address _ethAddr;
  }
  struct _Signature {
    bytes _signature;
    address _signer;
  }

  struct _Approval {
    bytes _convertedAddress;
    _Signature _signature;
  }

  mapping(bytes32 => _Issuer) public issuers;
  mapping(bytes => mapping(bytes32 => _Signature)) private signatures;
  mapping(uint => _Approval) public approvals;

  event NewIssuer(address issuer);
  event RequestAdd(uint requestKey);

  modifier onlyIssuer() {
    require(msg.sender != address(0), "invalid address");
    require(issuers[keccak256(abi.encodePacked(msg.sender))]._dappAddr == msg.sender, "not issuer");
    _;
  }

  modifier onlySigner(bytes convertedAddress, bytes32 dataHash) {
    require(msg.sender != address(0), "invalid address");
    require(signatures[convertedAddress][getDataKey(convertedAddress, dataHash)]._signer == issuers[keccak256(abi.encodePacked(msg.sender))]._ethAddr, "not signer");
    _;
  }

  function enrollIssuer(address dappIssuer, address ethIssuer) public onlyOwner {
      issuers[keccak256(abi.encodePacked(dappIssuer))] = _Issuer(dappIssuer, ethIssuer);
      emit NewIssuer(ethIssuer);
  }

  function requestAdd(bytes convertedAddress, bytes32 dataHash, bytes signature) public onlyIssuer {
    require(dataHash.recover(signature) == issuers[keccak256(abi.encodePacked(msg.sender))]._ethAddr, "msg.sender is not issuer");
    uint requestKey = uint(keccak256(abi.encodePacked(convertedAddress, dataHash, signature)));
    approvals[requestKey] = _Approval(convertedAddress, _Signature(signature, msg.sender));
    emit RequestAdd(requestKey);
  }

  function approveAdd(bytes32 dataHash, uint requestKey, bool isApprove) public {
    bytes memory convertedAddress = getAddressKey();
    require(keccak256(abi.encodePacked(approvals[requestKey]._convertedAddress)) == keccak256(abi.encodePacked(convertedAddress)), "not identity owner");
    if(isApprove) {
      signatures[convertedAddress][getDataKey(convertedAddress, dataHash)] = approvals[requestKey]._signature;
    }
    delete approvals[requestKey];
  }

  function getSignature(bytes convertedAddress, bytes32 dataHash) view public returns (bytes signature, address signer) {
    _Signature memory sig = signatures[convertedAddress][getDataKey(convertedAddress, dataHash)];
    return (sig._signature, sig._signer);
  }

  function revokeBySigner(bytes convertedAddress, bytes32 dataHash) public onlySigner(convertedAddress, dataHash) {
    delete signatures[convertedAddress][getDataKey(convertedAddress, dataHash)];
  }

  function revokeByOwner(bytes32 dataHash) public {
    bytes memory convertedAddress = getAddressKey();
    delete signatures[convertedAddress][getDataKey(convertedAddress, dataHash)];
  }
}
