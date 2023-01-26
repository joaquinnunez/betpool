// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

interface IPoolConfiguration {
  function fee() external view returns (uint);
  function minBetSize() external view returns (uint);
}
