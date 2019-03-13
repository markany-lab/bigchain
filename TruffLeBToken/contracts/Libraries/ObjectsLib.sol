pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";


library ObjectLib {

  using SafeMath for uint256;
  enum Operations { ADD, SUB, REPLACE }
  // Constants regarding bin or chunk sizes for balance packing
  uint256 constant TYPES_BITS_SIZE   = 16;                    // Max size of each object

  /**
  * @dev update the balance of a type provided in _binBalances
  * @param _binBalances Uint256 containing the balances of objects
  * @param _amount Value to update the type balance
  * @param _operation Which operation to conduct :
  *     Operations.REPLACE : Replace type balance with _amount
  *     Operations.ADD     : ADD _amount to type balance
  *     Operations.SUB     : Substract _amount from type balance
  */
  function updateTokenBalance(
    uint16 _binBalances,
    uint256 _amount,
    Operations _operation) internal pure returns (uint16)
  {
    uint256 newBinBalance;
    if (_operation == Operations.ADD) {
        uint256 objectBalance = uint256(_binBalances);
        newBinBalance = objectBalance.add(uint256(_amount));
    } else if (_operation == Operations.SUB) {
        objectBalance = uint256(_binBalances);
        newBinBalance = objectBalance.sub(uint256(_amount));
    } else if (_operation == Operations.REPLACE) {
        newBinBalance = uint256(_amount);
    } else {
      revert("Invalid operation"); // Bad operation
    }
    require(newBinBalance < 2**TYPES_BITS_SIZE, "Amount to write in bin is too large");
    return uint16(newBinBalance);
  }
}
