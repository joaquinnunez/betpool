import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { expect } from 'chai'
import { ethers } from 'hardhat'

const CONTRACT = "Token"
const MAX_SUPPLY = '1000000000000'
const DECIMALS = 6

describe("Token", function () {
  async function TokenTKN() {
    const [owner] = await ethers.getSigners()
    const TokenContract = await ethers.getContractFactory(CONTRACT)
    const Token = await TokenContract.deploy()
    return { Token, owner }
  }

  it("Should mint 1 million (1 000 000) TKN  tokens", async function () {
    const { Token } = await loadFixture(TokenTKN)
    const totalSupply = await Token.totalSupply()

    expect(totalSupply).to.equal(MAX_SUPPLY)
  })

  it("Should send the tokens to the sender", async function () {
    const { Token, owner } = await loadFixture(TokenTKN)
    const balanceOfOwner = await Token.balanceOf(owner.address)

    expect(balanceOfOwner).to.equal(MAX_SUPPLY)
  })

  it("Should use 6 decimals", async function () {
    const { Token } = await loadFixture(TokenTKN)
    const decimals = await Token.decimals()

    expect(decimals).to.equal(DECIMALS)
  })
})
