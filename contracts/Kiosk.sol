// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./model/Pool.sol";
import "./IPoolConfiguration.sol";
import "hardhat/console.sol";

/**
 * Handle pools.
 *
 * - Create new pools
 * - Receive bets
 * - Recevie claims
 */

contract Kiosk is Ownable {
  /**
   * Emitted for every outcome on pool creation.
   * Used to retrieve the possible outcomes.
   */
  event Outcome (
    // add pool id
    address outcome
  );

  /**
   * Emitted every time a bet is added to a pool.
   * Allows to update the payout
   */
  event Bet (
    // add pool id
    address outcome,
    address bettor,
    uint amount
  );

  /**
   * To be changed soon. But now is used to update the UI.
   */
  event ResultSet (
    // add pool id
    // TODO: replace with result
    address[] outcomes
  );

  /**
   * Emmited every time a claim is successful.
   */
  event Claim (
    // add pool id
    address bettor
  );

  /**
   * Keep track of user's claims.
   */
  mapping(string => Pool) public pools;
  // TODO: string or bytes 

  /**
   * Don't allow to claim if the outcome is not set yet.
   * TODO: Use states.
   */
  error NoResultYet();

  /**
   * Don't allow to bet if the outcome is already set.
   * Don't allow to reset the outcome
   */
  error ResultAlreadySet();

  /**
   * Winner must be an existing outcome.
   */
  error UnknownOutcome();

  /**
   * Expect at least `minBetSize` to bet.
   */
  error NotEnough();

  /**
   * Used when the user tries to claim for than once.
   */
  error AlreadyClaimed();

  /**
   * Used when someone tries to claim a non existing payout.
   */
  error NothingToClaim();

  constructor() {}

  function createPool(
    string calldata id,
    address[] calldata _outcomes,
    address configuration
  ) public onlyOwner {
    require(configuration != address(0), "Invalid configuration");
    // TODO: require pool to not exist

    pools[id].configuration = configuration;

    for (uint i=0; i<_outcomes.length; i++) {
      require(_outcomes[i] != address(0), "Invalid Outcome");

      pools[id].isOutcome[_outcomes[i]] = true;
      emit Outcome(_outcomes[i]);
    }
  }

  function bet(string calldata id, address _outcome) public payable {
    Pool storage pool = pools[id];
    // TODO: require pool must exists

    // require msg value to be enough
    uint poolMinBetSize = IPoolConfiguration(pool.configuration).minBetSize();
    if(msg.value < poolMinBetSize) revert NotEnough();

    // require outcome to exist
    if(!pool.isOutcome[_outcome]) revert UnknownOutcome();

    // require result not to be set
    if(pool.result.length != 0) revert ResultAlreadySet();

    pool.bets [_outcome] += msg.value;
    pool.bettors [_outcome] [msg.sender] += msg.value;
    pool.handle += msg.value;

    emit Bet(_outcome, msg.sender, msg.value);
  }

  function setResult (string calldata id, address[] calldata _result) public onlyOwner {
    Pool storage pool = pools[id];
    // TODO: require pool must exists

    if(pool.result.length != 0) revert ResultAlreadySet();


    for (uint i=0; i<_result.length; i++) {
      require(_result[i] != address(0), "Invalid Outcome");
      if(!pool.isOutcome[_result[i]]) revert UnknownOutcome();
    }

    pool.result = _result;

    emit ResultSet(_result);
  }

  /*
   * Compute the % of an address for the winning outcome
   * And send it to the user
   */
  function claim(string calldata id) public {
    Pool storage pool = pools[id];
    // TODO: require pool must exists

    if(pool.result.length == 0) revert NoResultYet();

    if(pool.claims[msg.sender]) revert AlreadyClaimed();

    uint bettorPayout = payout(id, pool.result[0], msg.sender);

    if(bettorPayout == 0) revert NothingToClaim();

    pool.claims[msg.sender] = true;

    payable(msg.sender).transfer(bettorPayout);

    emit Claim(msg.sender); // TODO: add id
  }

  function collect() public {
    // must be house
    // send amount = fee * total
  }

  function refund () public {
    // must be house
  }

  function payout (string calldata id, address outcome, address bettorAddress) public view returns (uint) {
    Pool storage pool = pools[id];
    // TODO: require pool must exists

    uint outcomeTotal = pool.bets [outcome];
    if (outcomeTotal == 0)
      return 0;

    uint bettorTotal = pool.bettors [outcome] [bettorAddress];
    if (bettorTotal == 0)
      return 0;

    uint poolFee = IPoolConfiguration(pool.configuration).fee();
    uint toDistribute = pool.handle * (10_000 - poolFee) / 10_000;
    uint addressPercentage = (bettorTotal * 10_000 / outcomeTotal);
    return addressPercentage * toDistribute / 10_000;
  }

  function isOutcome(string calldata id, address outcome) public view returns (bool) {
    return pools[id].isOutcome[outcome];
  }

  function bets(string calldata id, address outcome) public view returns (uint) {
    return pools[id].bets[outcome];
  }

  function bettors(string calldata id, address outcome, address bettorAddress) public view returns (uint) {
    return pools[id].bettors[outcome][bettorAddress];
  }
}

// placing judge
// tote board
