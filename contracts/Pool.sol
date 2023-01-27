// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IPoolConfiguration.sol";

/**
 * TODO: Add states. closed, open, waiting.
 * TODO: Events timestamp (used with states?)
 * TODO: Use ERC20 instead of ether
 *
 */

contract Pool is Ownable {
  /**
   * Emitted for every outcome on pool creation.
   * Used to retrieve the possible outcomes.
   */
  event Outcome (
    address outcome
  );

  /**
   * Emitted every time a bet is added to the pool.
   * Allows to update the payout
   */
  event Bet (
    address outcome,
    address bettor,
    uint amount
  );

  /**
   * To be changed soon. But now is used to update the UI.
   */
  event WinnerSet (
    address outcome
  );

  /**
   * Emmited every time a claim is successful.
   */
  event Claim (
    address bettor
  );

  /**
   * Configuration contract address should implement `IPoolConfiguration` interface
   */
  address public configuration;

  /**
   * The actual outcome.
   * TODO: change name/strategy for this.
   */
  address public winner;

  /**
   * Keep track of the amount betted for a specific outcome, the total for that outcome.
   * Like, `outcome: amount betted`
   */
  mapping(address => uint) public bets;

  /**
   * Keep track of the total value betted
   */
  uint public total;

  /**
   * Keep track of outcomes
   */
  mapping(address => bool) public outcomes;

  /**
   * Keep track of the amount betted to an outcome, by a bettor.
   * outcome => bettor => amount
   * outcome 0 address: amount
   * outcome 1
   * outcome 2
   */
  mapping(address => mapping(address => uint)) public bettors;

  /**
   * Keep track of user's claims.
   */
  mapping(address => bool) public claims;

  /**
   * Don't allow to claim if the outcome is not set yet.
   * TODO: Use states.
   */
  error NoWinnerYet();

  /**
   * Don't allow to bet if the outcome is already set.
   * Don't allow to reset the outcome
   */
  error WinnerAlreadySet();

  /**
   *
   */
  error UnknownWinner();

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

  constructor(
    address[] memory _outcomes,
    address poolConfiguration
  ) {
    require(poolConfiguration != address(0), "Invalid configuration");
    configuration = poolConfiguration;

    for (uint i=0; i<_outcomes.length; i++) {
      require(_outcomes[i] != address(0), "Invalid Outcome");

      outcomes[_outcomes[i]] = true;
      emit Outcome(_outcomes[i]);
    }
  }

  function bet(address _outcome) public payable {
    // require msg value to be enough
    if(msg.value < poolMinBetSize()) revert NotEnough();

    // require outcome to exist
    if(!outcomes[_outcome]) revert UnknownOutcome();

    // require winner not to be set
    if(winner != address(0)) revert WinnerAlreadySet();

    bets [_outcome] += msg.value;
    bettors [_outcome] [msg.sender] += msg.value;
    total += msg.value;

    emit Bet(_outcome, msg.sender, msg.value);
  }

  function setWinner (address _winner) public onlyOwner {
    if(winner != address(0)) revert WinnerAlreadySet();
    if(!outcomes[_winner]) revert UnknownWinner();

    winner = _winner;

    emit WinnerSet(_winner);
  }

  /*
   * Compute the % of an address for the winning outcome
   * And send it to the user
   */
  function claim() public {
    if(winner == address(0)) revert NoWinnerYet();

    if(claims[msg.sender]) revert AlreadyClaimed();

    uint bettorPayout = payout(winner, msg.sender);

    if(bettorPayout == 0) revert NothingToClaim();

    claims[msg.sender] = true;

    payable(msg.sender).transfer(bettorPayout);

    emit Claim(msg.sender);
  }

  function claimHouse() public {
    // must be house
    // send amount = fee * total
  }

  function refund () public {
    // must be house
  }

  function payout (address outcome, address bettorAddress) public view returns (uint) {
    uint outcomeTotal = bets [outcome];
    if (outcomeTotal == 0)
      return 0;

    uint bettorTotal = bettors [outcome] [bettorAddress];
    if (bettorTotal == 0)
      return 0;

    uint addressPercentage = (bettorTotal * 10_000 / outcomeTotal);
    return addressPercentage * toDistribute() / 10_000;
  }

  function toDistribute() public view returns (uint) {
    return total * (10_000 - poolFee()) / 10_000;
  }

  function poolFee() public view returns (uint) {
    return IPoolConfiguration(configuration).fee();
  }

  function poolMinBetSize() public view returns (uint) {
    return IPoolConfiguration(configuration).minBetSize();
  }
}
