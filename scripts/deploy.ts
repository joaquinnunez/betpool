import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners()
  const outcomes = signers.slice(1, 5)
  const PoolConfContract = await ethers.getContractFactory('PoolConfiguration')
  const poolConf = await PoolConfContract.deploy(100, ethers.utils.parseEther('1.0'))
  const Pool = await ethers.getContractFactory('Pool');
  const pool = await Pool.deploy(outcomes.map(o=>o.address), poolConf.address);

  await pool.deployed();
  console.log(pool.address)
  console.log('Done.');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
