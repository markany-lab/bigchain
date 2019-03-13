pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./ValidatorManagerContract.sol";

contract Gateway is ValidatorManagerContract {

  using SafeMath for uint256;

  mapping (address => uint256) _Ether;
  event ETHReceived(address from, uint256 amount);

  enum TokenKind {
    ETH
  }

  /**
   * Event to log the withdrawal of a token from the Gateway.
   * @param owner Address of the entity that made the withdrawal.
   * @param kind The type of token withdrawn (ETH).
   * @param contractAddress Address of token contract the token belong to.
   * @param value for ETH this is the amount.
   */
  event TokenWithdrawn(address indexed owner, TokenKind kind, address contractAddress, uint256 value);

  constructor (address[] _validators, uint8 _threshold_num, uint8 _threshold_denom)
    public ValidatorManagerContract(_validators, _threshold_num, _threshold_denom) {
  }

  // Deposit functions
  function depositETH() private {
    _Ether[msg.sender] = _Ether[msg.sender].add(msg.value);
  }

  // Withdrawal functions
  function withdrawETH(uint256 amount, bytes sig)
    //TODO: 체크필요!!!
    //external
    //isVerifiedByValidator(amount, address(this), sig)
  {
    _Ether[msg.sender] = _Ether[msg.sender].sub(amount);
    msg.sender.transfer(amount); // ensure it's not reentrant
    emit TokenWithdrawn(msg.sender, TokenKind.ETH, address(0), amount);
  }

  function () external payable {
    depositETH();
    emit ETHReceived(msg.sender, msg.value);
  }

  // Returns all the ETH you own
  function getETH(address owner) external view returns (uint256) {
    return _Ether[owner];
  }
}
