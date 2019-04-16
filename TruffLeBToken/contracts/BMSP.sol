pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";

contract BMSP is Ownable, Pausable{

  struct _RequestForm {
    address requester;
    uint8 role;
  }

  mapping(uint => _RequestForm) private Requests;
  mapping(address => uint8) internal Roles;

  uint private nextIndex = 0;
  uint private requestLength = 0;
  uint8 public P = 1;             // packager
  uint8 public CP = 2;            // contents provider
  uint8 public SP = 4;            // storage provider
  uint8 public D = 8;             // distributor

  modifier onlyRoleOf(address target, uint8 role) {
    require(target != address(0));
    require(verifyRole(target, role));
    _;
  }

  function requestEnroll(uint8 role) public whenNotPaused() {
    require(role < 16);
    Requests[requestLength] = _RequestForm(msg.sender, role);
    requestLength++;
  }

  function getNextIndex() view public onlyOwner returns (uint) {
    return nextIndex;
  }

  function getRequestLength() view public onlyOwner returns (uint) {
    return requestLength;
  }

  function getRequestDetails(uint requestId) view public onlyOwner whenNotPaused() returns (address requester, uint8 role) {
    return (Requests[requestId].requester, uint8(Requests[requestId].role));
  }

  function approveRole(bool[] approve) public onlyOwner whenNotPaused() {
    require(nextIndex + approve.length <= requestLength);
    for(uint i = 0; i < approve.length; i++) {
      if(approve[i] == true) {
         Roles[Requests[nextIndex + i].requester] |= Requests[nextIndex + i].role;
      }
    }
    nextIndex += approve.length;
  }

  function revokeRole(address target, uint8 role) public onlyOwner {
    uint8 targetRole = Roles[target];
    require(targetRole & role != 0);
    Roles[target] = targetRole & (0xf ^ role);
  }

  function verifyRole(address target, uint8 role) view public returns (bool) {
    require(target != address(0));
    return Roles[target] & role != 0;
  }

  function cleanupRequest() public onlyOwner {
    pause();
    for(uint i = 0; i < nextIndex; i++) {
      delete Requests[i];
    }
    requestLength -= nextIndex;
    nextIndex = 0;
    unpause();
  }
}
