// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IPoolConfiguration.sol";

/**
 * TODO: Check bet size to be multiple of `minBetSize`
 * TODO: Add states. closed, open, waiting
 * TODO: Events timestamp (used with states?)
 * TODO: Use ERC20 instead of ether
 * TODO: Move fee out to another contract, to make it reusable
 * TODO: Move conf out to another contract, to make it reusable `minBetSize`, `tokenAddress` and below.
 *
 * [?] max total bets number
 * [?] max size bet number
 *
 */

contract PoolConfiguration is Ownable, IPoolConfiguration {
  /**
   * Fee to discount to bettors for the service (in bps)
   */
  uint public fee;

  constructor(
    uint _fee
  ) {
    fee = _fee;
  }
}
