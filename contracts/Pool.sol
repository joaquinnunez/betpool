// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

contract Pool {
  address winner;

  // option: amount betted
  mapping(address => uint) public bets;

  uint public total;
  uint public fee;

  mapping(address => bool) public options;

  // option => bettor => amount
  // option 0 address: amount
  // option 1
  // option 2
  mapping(address => mapping(address => uint)) public bettors;

  // max total bets number
  // max size bet number
  // tokens address
  // balance after address amount
  // state closed, open, waiting
  // timestamp for states

  error NoWinnerYet();
  error WinnerAlreadySet();

  constructor(
    address[] memory _options,
    uint _fee
  ) {
    fee = _fee;
    for (uint i=0; i<_options.length; i++) {
      options[_options[i]] = true;
    }
  }

  function bet(address option) public payable {
     // require msg value to be enough
     // option must exists

     bets [option] += msg.value;
     bettors [option] [msg.sender] += msg.value;
     total += msg.value;

     // emit event
  }

  function setWinner (address _winner) public {
    // guard only authorized
    if(winner != address(0)) revert WinnerAlreadySet();

    winner = _winner;

    // emit event
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
    // must exist ( bettors [winner] [msg.sender] )

    uint bettorPayout = payout(winner, msg.sender);

    // revert on payout 0?

    payable(msg.sender).transfer(bettorPayout);

    // emit event
  }

  function claimHouse() public {
    //   must be house
    //   send amount = fee * total
  }

  function refund () public {
    //   must be house
  }

  function payout (address option, address bettorAddress) public view returns (uint) {
    // guard option
    // guard bettorAddress
    // guard optionTotal

    // option must exists

    uint optionTotal = bets [option];
    if (optionTotal == 0)
      return 0;

    uint toDistribute = total * (100 - fee) / 100;
    uint addressPercentage = (bettors [option] [bettorAddress] * 100 / optionTotal);
    return addressPercentage * toDistribute / 100;
  }
}
