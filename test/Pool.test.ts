import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { expect } from 'chai'
import { ethers } from 'hardhat'

const CONTRACT = "Pool"
const e01 = ethers.utils.parseEther('0.01')
const e02 = ethers.utils.parseEther('0.02')

describe("BetPool", function () {
  async function PoolOf3(fee: number) {
    const [owner,
        outcome1, outcome2, outcome3, outcome4,
        bettor1, bettor2, bettor3, bettor4,
    ] = await ethers.getSigners()
    const PoolConfContract = await ethers.getContractFactory('PoolConfiguration')
    const poolConf = await PoolConfContract.deploy(fee, e01)
    const BetPoolContract = await ethers.getContractFactory(CONTRACT)
    const outcomes = [outcome1, outcome2, outcome3].map((outcome)=>outcome.address)
    const betPool = await BetPoolContract.deploy(outcomes, poolConf.address)
    await betPool.deployed()

    return { betPool, owner,
        outcomes: [outcome1, outcome2, outcome3, outcome4],
        bettors: [bettor1, bettor2, bettor3, bettor4],
    }
  }

  async function PoolOf3NoFee() {
    return PoolOf3(0)
  }

  async function PoolOf3WithFee() {
    return PoolOf3(200)
  }

  it("Should create a pool with N outcomes", async function () {
    const { betPool, outcomes } = await loadFixture(PoolOf3NoFee)
    const [ outcome1, outcome2, outcome3, outcome4 ] = outcomes
    const isOutcome1 = await betPool.outcomes(outcome1.address)
    const isOutcome2 = await betPool.outcomes(outcome2.address)
    const isOutcome3 = await betPool.outcomes(outcome3.address)

    expect(isOutcome1).to.be.true
    expect(isOutcome2).to.be.true
    expect(isOutcome3).to.be.true

    const isOutcome4 = await betPool.outcomes(outcome4.address)
    expect(isOutcome4).to.be.false
  })

  it("Should allow addresses to bet N ETH to an outcome more than once and should add the value", async function () {
    const { betPool, outcomes, bettors } = await loadFixture(PoolOf3NoFee)
    const [ outcome1 ] = outcomes
    const [ bettor1 ] = bettors
    await betPool.connect(bettor1).bet(outcome1.address, {value: e01})

    const amountForOutcome = await betPool.bets(outcome1.address)
    expect(amountForOutcome).to.equal(e01)

    const amountBettor1 = await betPool.bettors(outcome1.address, bettor1.address)
    expect(amountBettor1).to.equal(e01)

    await betPool.connect(bettor1).bet(outcome1.address, {value: e01})

    const newAmountForOutcome = await betPool.bets(outcome1.address)
    expect(newAmountForOutcome).to.equal(e02)

    const newAmountBettor1 = await betPool.bettors(outcome1.address, bettor1.address)
    expect(newAmountBettor1).to.equal(e02)
  })

  it("Should allow different addresses to bet N ETH to an outcome", async function () {
    const { betPool, bettors, outcomes } = await loadFixture(PoolOf3NoFee)
    const [ outcome1 ] = outcomes
    const [ bettor1, bettor2 ] = bettors
    await betPool.connect(bettor1).bet(outcome1.address, {value: e01})
    await betPool.connect(bettor2).bet(outcome1.address, {value: e01})

    const amountForOutcome1 = await betPool.bets(outcome1.address)
    expect(amountForOutcome1).to.equal(e02)

    const amountBettor1 = await betPool.bettors(outcome1.address, bettor1.address)
    expect(amountBettor1).to.equal(e01)

    const amountBettor2 = await betPool.bettors(outcome1.address, bettor2.address)
    expect(amountBettor2).to.equal(e01)
  })

  it("Should compute to correct expected payout for the address", async function () {
    const { betPool, bettors, outcomes } = await loadFixture(PoolOf3NoFee)
    const [ outcome1 ] = outcomes
    const [ bettor1, bettor2 ] = bettors
    await betPool.connect(bettor1).bet(outcome1.address, {value: e01})
    await betPool.connect(bettor2).bet(outcome1.address, {value: e01})

    const amountForOutcome1 = await betPool.bets(outcome1.address)
    expect(amountForOutcome1).to.equal(e02)

    const amountBettor1 = await betPool.bettors(outcome1.address, bettor1.address)
    expect(amountBettor1).to.equal(e01)

    const amountBettor2 = await betPool.bettors(outcome1.address, bettor2.address)
    expect(amountBettor2).to.equal(e01)

    const percentage = await betPool.payout (outcome1.address, bettor1.address)
    expect(percentage).to.equal(e01)
  })

  it("Should allow the user to claim the payout", async function () {
    const { betPool, bettors, outcomes } = await loadFixture(PoolOf3NoFee)
    const [ bettor1, bettor2, bettor3 ] = bettors
    const [ outcome1, outcome2, outcome3 ] = outcomes
    await betPool.connect(bettor3).bet(outcome1.address, {value: e01})
    await betPool.connect(bettor1).bet(outcome1.address, {value: e01})
    await betPool.connect(bettor2).bet(outcome2.address, {value: e02})
    await betPool.connect(bettor2).bet(outcome3.address, {value: e02})
    const b1Balance = await bettor1.getBalance()

    await betPool.setWinner(outcome1.address)

    const claim = await betPool.connect(bettor1).claim()
    const claimReceipt = await claim.wait()
    const gasSpent = claimReceipt.gasUsed.mul(claimReceipt.effectiveGasPrice)
    expect(await bettor1.getBalance()).to.eq(ethers.utils.parseEther('0.03').add(b1Balance).sub(gasSpent))
  })

  it("Should compute the correct amount if there is a fee", async function () {
    const { betPool, bettors, outcomes } = await loadFixture(PoolOf3WithFee)
    const [ outcome1 ] = outcomes
    const [ bettor1, bettor2 ] = bettors
    await betPool.connect(bettor1).bet(outcome1.address, {value: e01})
    await betPool.connect(bettor2).bet(outcome1.address, {value: e01})

    const amountForOutcome1 = await betPool.bets(outcome1.address)
    expect(amountForOutcome1).to.equal(e02)

    const amountBettor1 = await betPool.bettors(outcome1.address, bettor1.address)
    expect(amountBettor1).to.equal(e01)

    const amountBettor2 = await betPool.bettors(outcome1.address, bettor2.address)
    expect(amountBettor2).to.equal(e01)

    const percentage = await betPool.payout (outcome1.address, bettor1.address)
    expect(percentage).to.equal(ethers.utils.parseEther('0.0098'))
  })

  it("Should allow the user to claim the payout, with fee", async function () {
    const { betPool, bettors, outcomes } = await loadFixture(PoolOf3WithFee)
    const [ bettor1, bettor2, bettor3 ] = bettors
    const [ outcome1, outcome2, outcome3 ] = outcomes
    await betPool.connect(bettor3).bet(outcome1.address, {value: e01})
    await betPool.connect(bettor1).bet(outcome1.address, {value: e01})
    await betPool.connect(bettor2).bet(outcome2.address, {value: e02})
    await betPool.connect(bettor2).bet(outcome3.address, {value: e02})
    const b1Balance = await bettor1.getBalance()

    await betPool.setWinner(outcome1.address)

    const claim = await betPool.connect(bettor1).claim()
    const claimReceipt = await claim.wait()
    const gasSpent = claimReceipt.gasUsed.mul(claimReceipt.effectiveGasPrice)
    expect(await bettor1.getBalance()).to.eq(ethers.utils.parseEther('0.0294').add(b1Balance).sub(gasSpent))
  })

  it("Should revert a claim when the winner is not set", async function () {
    async function claimNoWinner() {
      const { betPool, bettors, outcomes } = await loadFixture(PoolOf3NoFee)
      const [ bettor1, bettor2, bettor3 ] = bettors
      const [ outcome1, outcome2, outcome3 ] = outcomes
      await betPool.connect(bettor3).bet(outcome1.address, {value: e01})
      await betPool.connect(bettor1).bet(outcome1.address, {value: e01})
      await betPool.connect(bettor2).bet(outcome2.address, {value: e02})
      await betPool.connect(bettor2).bet(outcome3.address, {value: e02})

      await betPool.connect(bettor1).claim()
    }

    const PoolContract = await ethers.getContractFactory(CONTRACT)
    await expect(claimNoWinner()).to.be.revertedWithCustomError(PoolContract, 'NoWinnerYet')
  })

  it("Should revert setting the winner when is already set", async function () {
    async function SetWinnerOnlyOnce() {
      const { betPool, outcomes } = await loadFixture(PoolOf3NoFee)
      const [ outcome1, outcome2 ] = outcomes

      await betPool.setWinner(outcome1.address)
      await betPool.setWinner(outcome2.address)
    }

    const PoolContract = await ethers.getContractFactory(CONTRACT)
    await expect(SetWinnerOnlyOnce()).to.be.revertedWithCustomError(PoolContract, 'WinnerAlreadySet')
  })

  it("Should revert setting the winner if the provided winner is not an outcome", async function () {
    async function SetUnknownWinner() {
      const { betPool, outcomes } = await loadFixture(PoolOf3NoFee)
      const outcome4 = outcomes[3]

      await betPool.setWinner(outcome4.address)
    }

    const PoolContract = await ethers.getContractFactory(CONTRACT)
    await expect(SetUnknownWinner()).to.be.revertedWithCustomError(PoolContract, 'UnknownWinner')
  })

  it("Should revert betting if the provided outcome is not actually an outcome", async function () {
    async function BetForAnUnknownOutcome() {
      const { betPool, bettors, outcomes } = await loadFixture(PoolOf3NoFee)
      const [ bettor1 ] = bettors
      const outcome4 = outcomes[3]

      await betPool.connect(bettor1).bet(outcome4.address, {value: e01})
    }

    const PoolContract = await ethers.getContractFactory(CONTRACT)
    await expect(BetForAnUnknownOutcome()).to.be.revertedWithCustomError(PoolContract, 'UnknownOutcome')
  })

  it("Should allow only the owner to set the winner", async function () {
    async function BettorSettingWinner() {
      const { betPool, bettors, outcomes } = await loadFixture(PoolOf3NoFee)
      const [ bettor1 ] = bettors
      const [ outcome1 ] = outcomes
      await betPool.connect(bettor1).setWinner(outcome1.address)
    }

    await expect(BettorSettingWinner()).to.be.revertedWith('Ownable: caller is not the owner')
  })

  it("Should only allow to claim once", async function () {
    async function ClaimTwice() {
      const { betPool, bettors, outcomes } = await loadFixture(PoolOf3NoFee)
      const [ bettor1, bettor2 ] = bettors
      const [ outcome1, outcome2 ] = outcomes

      await betPool.connect(bettor1).bet(outcome1.address, {value: e01})
      await betPool.connect(bettor2).bet(outcome2.address, {value: e01})
      await betPool.setWinner(outcome1.address)
      await betPool.connect(bettor1).claim()
      await betPool.connect(bettor1).claim()
    }

    const PoolContract = await ethers.getContractFactory(CONTRACT)
    await expect(ClaimTwice()).to.be.revertedWithCustomError(PoolContract, 'AlreadyClaimed')
  })

  it("Should not allow to bet if the winner is already set", async function () {
    async function BetAfterEnd() {
      const { betPool, bettors, outcomes } = await loadFixture(PoolOf3NoFee)
      const [ bettor1 ] = bettors
      const [ outcome1 ] = outcomes

      await betPool.setWinner(outcome1.address)
      await betPool.connect(bettor1).bet(outcome1.address, {value: e01})
    }

    const PoolContract = await ethers.getContractFactory(CONTRACT)
    await expect(BetAfterEnd()).to.be.revertedWithCustomError(PoolContract, 'WinnerAlreadySet')
  })

  it("Should emit `WinnerSet` event", async function () {
    const { betPool, outcomes } = await loadFixture(PoolOf3NoFee)
    const [ outcome1 ] = outcomes

    await expect(betPool.setWinner(outcome1.address))
      .to.emit(betPool, 'WinnerSet')
      .withArgs(outcome1.address)
  })

  it("Should emit `Claim` event", async function () {
    const { betPool, bettors, outcomes } = await loadFixture(PoolOf3NoFee)
    const [ bettor1 ] = bettors
    const [ outcome1 ] = outcomes

    await betPool.connect(bettor1).bet(outcome1.address, {value: e01})
    await betPool.setWinner(outcome1.address)

    await expect(betPool.connect(bettor1).claim())
      .to.emit(betPool, 'Claim')
      .withArgs(bettor1.address)
  })

  it("Should emit `Outcome` event for each outcome", async function () {
    const [ outcome1, outcome2, outcome3 ] = await ethers.getSigners()
    const PoolConfContract = await ethers.getContractFactory('PoolConfiguration')
    const poolConf = await PoolConfContract.deploy(0, e01)
    const BetPoolContract = await ethers.getContractFactory(CONTRACT)
    const outcomes = [outcome1, outcome2, outcome3].map((outcome)=>outcome.address)
    const betPool = await BetPoolContract.deploy(outcomes, poolConf.address)

    await expect(betPool.deployTransaction)
      .to.emit(betPool, 'Outcome')
  })

  it("Should emit `Bet` event", async function () {
    const { betPool, bettors, outcomes } = await loadFixture(PoolOf3NoFee)
    const [ bettor1 ] = bettors
    const [ outcome1 ] = outcomes

    await expect(
      betPool
      .connect(bettor1)
      .bet(outcome1.address, {value: e01})
    )
      .to.emit(betPool, 'Bet')
      .withArgs(outcome1.address, bettor1.address, e01)
  })

  it("Should revert a claim if there is no payout", async function () {
    async function claimNoPayout() {
      const { betPool, bettors, outcomes } = await loadFixture(PoolOf3NoFee)
      const [ bettor1, bettor2] = bettors
      const [ outcome1, outcome2 ] = outcomes
      await betPool.connect(bettor1).bet(outcome1.address, {value: e01})
      await betPool.connect(bettor2).bet(outcome2.address, {value: e01})

      await betPool.setWinner(outcome1.address)
      await betPool.connect(bettor2).claim()
    }

    const PoolContract = await ethers.getContractFactory(CONTRACT)
    await expect(claimNoPayout()).to.be.revertedWithCustomError(PoolContract, 'NothingToClaim')
  })

  it("Should require outcomes different than the 0 address", async function () {
    const [ outcome1, outcome2 ] = await ethers.getSigners()
    const PoolConfContract = await ethers.getContractFactory('PoolConfiguration')
    const poolConf = await PoolConfContract.deploy(0, e01)
    const BetPoolContract = await ethers.getContractFactory(CONTRACT)
    const outcomes = [outcome1, outcome2].map((outcome)=>outcome.address)
    outcomes.push(ethers.constants.AddressZero)

    await expect(BetPoolContract.deploy(outcomes, poolConf.address)).to.be.revertedWith('Invalid Outcome')
  })
})
