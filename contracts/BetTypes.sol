// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "./model/Pool.sol";

library BetTypes {
  function win(Pool storage pool, address outcome) public view returns (bool) {
    return pool.result[0] == outcome;
  }

  function place(Pool storage pool, address outcome) public view returns (bool) {
    return pool.result[0] == outcome || pool.result[1] == outcome;
  }

  function show(Pool storage pool, address outcome) public view returns (bool) {
    return pool.result[0] == outcome || pool.result[1] == outcome || pool.result[2] == outcome;
  }

  function exacta(Pool storage pool, address outcome1, address outcome2) public view returns (bool) {
    return pool.result[0] == outcome1 && pool.result[1] == outcome2;
  }

  function trifecta(Pool storage pool, address outcome1, address outcome2, address outcome3) public view returns (bool) {
    return pool.result[0] == outcome1 && pool.result[1] == outcome2 && pool.result[2] == outcome3;
  }

  function superfecta(Pool storage pool, address outcome1, address outcome2, address outcome3, address outcome4) public view returns (bool) {
    return pool.result[0] == outcome1 && pool.result[1] == outcome2 && pool.result[2] == outcome3 && pool.result[3] == outcome4;
  }

  /* OPTION */
  function compare(Pool storage pool, address[] calldata outcomes) private view returns (bool) {
    for (uint i; i < outcomes.length; i++) {
      address outcome = pool.result [i];
      address selectedOutcome = outcomes [i];
      if (outcome != selectedOutcome)
        return false;
    }
    return false;
  }

  function exacta2(Pool storage pool, address[] calldata outcomes) public view returns (bool) {
    return compare(pool, outcomes[:2]);
  }

  function trifecta2(Pool storage pool, address[] calldata outcomes) public view returns (bool) {
    return compare(pool, outcomes[:3]);
  }

  function superfecta2(Pool storage pool, address[] calldata outcomes) public view returns (bool) {
    return compare(pool, outcomes[:4]);
  }
}
