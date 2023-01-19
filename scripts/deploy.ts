import { ethers } from "hardhat";

async function main() {
  const [owner, ...outcomes] = await ethers.getSigners()
  const Pool = await ethers.getContractFactory('Pool');
  const pool = await Pool.deploy(outcomes.slice(0, 5).map(o=>o.address), 1, ethers.utils.parseEther('1.0'));

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
