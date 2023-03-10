// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

struct Pool {
  /**
   * Configuration contract address should implement `IPoolConfiguration` interface
   */
  address configuration;

  /**
   * Keep track of outcomes
   */
  mapping(address => bool) isOutcome;
  
  /**
   *
   * OPEN, BETTING_CLOSED, SETTLED, ABORTED
   */
  uint8 status;

  /**
   * Keep track of the amount betted for a specific outcome, the total for that outcome.
   * Like, `outcome: amount betted`
   */
  mapping(address => uint) bets;

  /**
   * Keep track of the amount betted to an outcome, by a bettor.
   * outcome => bettor => amount
   * outcome 0 address: amount
   * outcome 1
   * outcome 2
   */
  mapping(address => mapping(address => uint)) bettors;

  /**
   * Keep track of the total value betted
   */
  uint handle;

  /**
   * The result of the event
   */
  address[] result;

  /**
   * Keep track of user's claims.
   */
  mapping(address => bool) claims;
}
