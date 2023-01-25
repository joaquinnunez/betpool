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
   * Configuration
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
  mapping(address => bool) public options;

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
   * Only allow at least `minBetSize` bets.
   * TODO: Only accepts multiples of `minSizeBet`
   */
  uint public minBetSize;

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
  error UnknownOption();

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
    address[] memory _options,
    address poolConfiguration,
    uint _minBetSize
  ) {
    require(poolConfiguration != address(0), "Invalid configuration");
    configuration = poolConfiguration;

    minBetSize = _minBetSize;
    for (uint i=0; i<_options.length; i++) {
      require(_options[i] != address(0), "Invalid Outcome");

      options[_options[i]] = true;
      emit Outcome(_options[i]);
    }
  }

  function bet(address _option) public payable {
    // require msg value to be enough
    if(msg.value < minBetSize) revert NotEnough();

    // require outcome to exist
    if(!options[_option]) revert UnknownOption();

    // require winner not to be set
    if(winner != address(0)) revert WinnerAlreadySet();

    bets [_option] += msg.value;
    bettors [_option] [msg.sender] += msg.value;
    total += msg.value;

    emit Bet(_option, msg.sender, msg.value);
  }

  function setWinner (address _winner) public onlyOwner {
    if(winner != address(0)) revert WinnerAlreadySet();
    if(!options[_winner]) revert UnknownWinner();

    winner = _winner;

    emit WinnerSet(_winner);
  }

  /*
   * go thru all the bettors in the winning pool
   *  and compute the % using the total in option: amount hash
   *
   *  house as a %
   *  options might have a %
   *  and bettors for sure have a %
   *
   *   iterate over all of the above and save
   *   hash address: amount to withdraw
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

  function payout (address option, address bettorAddress) public view returns (uint) {
    uint optionTotal = bets [option];
    if (optionTotal == 0)
      return 0;

    uint bettorTotal = bettors [option] [bettorAddress];
    if (bettorTotal == 0)
      return 0;

    uint addressPercentage = (bettorTotal * 100 / optionTotal);
    return addressPercentage * toDistribute() / 100;
  }

  function toDistribute() public view returns (uint) {
    return total * (100 - poolFee()) / 100;
  }

  function poolFee() public view returns (uint) {
    return IPoolConfiguration(configuration).fee();
  }
}
