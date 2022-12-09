// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

contract Pool {
  address winner;

  // option: amount betted
  mapping(address => uint) public bets;

  uint public total;

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
  // fee


  constructor(
    address[] memory _options
  ) {
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
    // guard winner exists

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
    // there must be a winner
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

    // total 2000
    // bettors [option] [bettorAddress] // 1000
    // optionTotal // 2000
    // (1000/2000) * 2000
    return (bettors [option] [bettorAddress] * 100 / optionTotal) * total / 100;
  }
}
