// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";

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
  event WinnerSet (
    address outcome
  );

  /**
   * The actual outcome
   */
  address public winner;

  /**
   * outcome: amount betted
   */
  mapping(address => uint) public bets;

  /**
   * Keep track of the total value betted
   */
  uint public total;

  /**
   * Might use a different data structure to support N type of fees
   */
  uint public fee;

  /**
   * Keep track of outcomes
   */
  mapping(address => bool) public options;

  /**
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
   *
   */
  uint public minBetSize;

  /**
   *
   */
  error NoWinnerYet();

  /**
   *
   */
  error WinnerAlreadySet();

  /**
   *
   */
  error UnknownWinner();

  /**
   *
   */
  error UnknownOption();

  /**
   *
   */
  error NotEnough();

  /**
   *
   */
  error AlreadyClaimed();

  constructor(
    address[] memory _options,
    uint _fee,
    uint _minBetSize
  ) {
    fee = _fee;
    minBetSize = _minBetSize;
    for (uint i=0; i<_options.length; i++) {
      // require options not to be 0x00
      options[_options[i]] = true;
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
    // emit event
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

    claims[msg.sender] = true;

    payable(msg.sender).transfer(bettorPayout);

    // emit event
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
    return fee;
  }
}
