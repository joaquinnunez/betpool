import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { expect } from 'chai'
import { ethers } from 'hardhat'

const CONTRACT = "PoolConfiguration"
const e01 = ethers.utils.parseEther('0.01')

describe("PoolConfiguration", function () {
  async function PoolConf() {
    const [owner] = await ethers.getSigners()

    const TokenContract = await ethers.getContractFactory('Token')
    const Token = await TokenContract.deploy()

    const fee = 100
    const PoolConfContract = await ethers.getContractFactory(CONTRACT)
    const poolConf = await PoolConfContract.deploy(fee, e01, Token.address)

    return { poolConf, owner, Token }
  }

  it("Should return min bet size", async function () {
    const { poolConf } = await loadFixture(PoolConf)

    const minBetSize = await poolConf.minBetSize()
    expect(minBetSize).to.equal(e01)
  })

  it("Should return fee", async function () {
    const { poolConf } = await loadFixture(PoolConf)

    const fee = await poolConf.fee()
    expect(fee).to.equal(100)
  })

  it("should return the token address", async function () {
    const { poolConf, Token } = await loadFixture(PoolConf)

    const tokenAddress = await poolConf.tokenAddress()
    expect(tokenAddress).to.equal(Token.address)
  })
})
