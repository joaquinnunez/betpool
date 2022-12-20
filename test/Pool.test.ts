import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Contract, Signer } from 'ethers'

const CONTRACT = "Pool"

describe("BetPool", function () {
  async function PoolOf3(fee: number) {
    const [owner,
        option1, option2, option3, option4,
        bettor1, bettor2, bettor3, bettor4,
    ] = await ethers.getSigners()
    const BetPoolContract = await ethers.getContractFactory(CONTRACT)
    const options = [option1, option2, option3].map((option)=>option.address)
    const betPool = await BetPoolContract.deploy(options, fee)
    await betPool.deployed()

    return { betPool, owner,
        options: [option1, option2, option3, option4],
        bettors: [bettor1, bettor2, bettor3],
    }
  }

  async function PoolOf3NoFee() {
    return PoolOf3(0)
  }

  async function PoolOf3WithFee() {
    return PoolOf3(2)
  }

  it("Should create a pool with N options", async function () {
    const { betPool, options } = await loadFixture(PoolOf3NoFee)
    const [ option1, option2, option3, option4 ] = options
    const isOption1 = await betPool.options(option1.address)
    const isOption2 = await betPool.options(option2.address)
    const isOption3 = await betPool.options(option3.address)

    expect(isOption1).to.be.true
    expect(isOption2).to.be.true
    expect(isOption3).to.be.true

    const isOption4 = await betPool.options(option4.address)
    expect(isOption4).to.be.false
  })

  it("Should allow addresses to bet N ETH to an option more than once and should add the value", async function () {
    const { betPool, options, bettors } = await loadFixture(PoolOf3NoFee)
    const [ option1 ] = options
    const [ bettor1 ] = bettors
    const x = await betPool.connect(bettor1).bet(option1.address, {value: 1})

    const amountForOption = await betPool.bets(option1.address)
    expect(amountForOption).to.equal(1)

    const amountBettor1 = await betPool.bettors(option1.address, bettor1.address)
    expect(amountBettor1).to.equal(1)

    const x1 = await betPool.connect(bettor1).bet(option1.address, {value: 1})

    const newAmountForOption = await betPool.bets(option1.address)
    expect(newAmountForOption).to.equal(2)

    const newAmountBettor1 = await betPool.bettors(option1.address, bettor1.address)
    expect(newAmountBettor1).to.equal(2)
  })

  it("Should allow different addresses to bet N ETH to an option", async function () {
    const { betPool, bettors, options } = await loadFixture(PoolOf3NoFee)
    const [ option1 ] = options
    const [ bettor1, bettor2 ] = bettors
    const x = await betPool.connect(bettor1).bet(option1.address, {value: 1})
    const x1 = await betPool.connect(bettor2).bet(option1.address, {value: 1})

    const amountForOption1 = await betPool.bets(option1.address)
    expect(amountForOption1).to.equal(2)

    const amountBettor1 = await betPool.bettors(option1.address, bettor1.address)
    expect(amountBettor1).to.equal(1)

    const amountBettor2 = await betPool.bettors(option1.address, bettor2.address)
    expect(amountBettor2).to.equal(1)
  })

  it("Should compute to correct expected payout for the address", async function () {
    const { betPool, bettors, options } = await loadFixture(PoolOf3NoFee)
    const [ option1 ] = options
    const [ bettor1, bettor2 ] = bettors
    const x = await betPool.connect(bettor1).bet(option1.address, {value: 1000})
    const x1 = await betPool.connect(bettor2).bet(option1.address, {value: 1000})

    const amountForOption1 = await betPool.bets(option1.address)
    expect(amountForOption1).to.equal(2000)

    const amountBettor1 = await betPool.bettors(option1.address, bettor1.address)
    expect(amountBettor1).to.equal(1000)

    const amountBettor2 = await betPool.bettors(option1.address, bettor2.address)
    expect(amountBettor2).to.equal(1000)

    const percentage = await betPool.payout (option1.address, bettor1.address)
    expect(percentage).to.equal(1000)
  })

  it("Should allow the user to claim the payout", async function () {
    const { betPool, bettors, options } = await loadFixture(PoolOf3NoFee)
    const [ bettor1, bettor2, bettor3 ] = bettors
    const [ option1, option2, option3 ] = options
    const b0 = await betPool.connect(bettor3).bet(option1.address, {value: ethers.utils.parseEther('0.01')})
    const b1 = await betPool.connect(bettor1).bet(option1.address, {value: ethers.utils.parseEther('0.01')})
    const b2 = await betPool.connect(bettor2).bet(option2.address, {value: ethers.utils.parseEther('0.02')})
    const b3 = await betPool.connect(bettor2).bet(option3.address, {value: ethers.utils.parseEther('0.02')})
    const b1Balance = await bettor1.getBalance()

    await betPool.setWinner(option1.address)

    const claim = await betPool.connect(bettor1).claim()
    const claimReceipt = await claim.wait()
    const gasSpent = claimReceipt.gasUsed.mul(claimReceipt.effectiveGasPrice)
    expect(await bettor1.getBalance()).to.eq(ethers.utils.parseEther('0.03').add(b1Balance).sub(gasSpent))
  })

  it("Should compute the correct amount if there is a fee", async function () {
    const { betPool, bettors, options } = await loadFixture(PoolOf3WithFee)
    const [ option1 ] = options
    const [ bettor1, bettor2 ] = bettors
    const x = await betPool.connect(bettor1).bet(option1.address, {value: 1000})
    const x1 = await betPool.connect(bettor2).bet(option1.address, {value: 1000})

    const amountForOption1 = await betPool.bets(option1.address)
    expect(amountForOption1).to.equal(2000)

    const amountBettor1 = await betPool.bettors(option1.address, bettor1.address)
    expect(amountBettor1).to.equal(1000)

    const amountBettor2 = await betPool.bettors(option1.address, bettor2.address)
    expect(amountBettor2).to.equal(1000)

    const percentage = await betPool.payout (option1.address, bettor1.address)
    expect(percentage).to.equal(980)
  })

  it("Should allow the user to claim the payout, with fee", async function () {
    const { betPool, bettors, options } = await loadFixture(PoolOf3WithFee)
    const [ bettor1, bettor2, bettor3 ] = bettors
    const [ option1, option2, option3 ] = options
    const b0 = await betPool.connect(bettor3).bet(option1.address, {value: ethers.utils.parseEther('0.01')})
    const b1 = await betPool.connect(bettor1).bet(option1.address, {value: ethers.utils.parseEther('0.01')})
    const b2 = await betPool.connect(bettor2).bet(option2.address, {value: ethers.utils.parseEther('0.02')})
    const b3 = await betPool.connect(bettor2).bet(option3.address, {value: ethers.utils.parseEther('0.02')})
    const b1Balance = await bettor1.getBalance()

    await betPool.setWinner(option1.address)

    const claim = await betPool.connect(bettor1).claim()
    const claimReceipt = await claim.wait()
    const gasSpent = claimReceipt.gasUsed.mul(claimReceipt.effectiveGasPrice)
    expect(await bettor1.getBalance()).to.eq(ethers.utils.parseEther('0.0294').add(b1Balance).sub(gasSpent))
  })

  it("Should revert a claim when the winner is not set", async function () {
    async function claimNoWinner() {
      await loadFixture(PoolOf3NoFee)
      const { betPool, bettors, options } = await loadFixture(PoolOf3NoFee)
      const [ bettor1, bettor2, bettor3 ] = bettors
      const [ option1, option2, option3 ] = options
      const b0 = await betPool.connect(bettor3).bet(option1.address, {value: ethers.utils.parseEther('0.01')})
      const b1 = await betPool.connect(bettor1).bet(option1.address, {value: ethers.utils.parseEther('0.01')})
      const b2 = await betPool.connect(bettor2).bet(option2.address, {value: ethers.utils.parseEther('0.02')})
      const b3 = await betPool.connect(bettor2).bet(option3.address, {value: ethers.utils.parseEther('0.02')})

      const claim = await betPool.connect(bettor1).claim()
    }

    const PoolContract = await ethers.getContractFactory(CONTRACT)
    await expect(claimNoWinner()).to.be.revertedWithCustomError(PoolContract, 'NoWinnerYet');
  })

  it("Should revert setting the winner when is already set", async function () {
    async function SetWinnerOnlyOnce() {
      await loadFixture(PoolOf3NoFee)
      const { betPool, bettors, options } = await loadFixture(PoolOf3NoFee)
      const [ option1, option2 ] = options

      await betPool.setWinner(option1.address)
      await betPool.setWinner(option2.address)
    }

    const PoolContract = await ethers.getContractFactory(CONTRACT)
    await expect(SetWinnerOnlyOnce()).to.be.revertedWithCustomError(PoolContract, 'WinnerAlreadySet');
  })
})
