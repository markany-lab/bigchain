pragma solidity ^0.4.24;

import "./EllipticCurve.sol";

contract Utils is EllipticCurve {
  function getAddressKey() view public returns (bytes key) {
    return multipleGeneratorByScalar(uint(msg.sender));
  }

  function getDataKey(bytes convertedAddress, bytes32 dataHash) pure public returns (bytes32 key) {
    return keccak256(abi.encodePacked(convertedAddress, dataHash));
  }
}
