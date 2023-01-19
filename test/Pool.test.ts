import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Contract, Signer } from 'ethers'

const CONTRACT = "Pool"
const e01 = ethers.utils.parseEther('0.01')
const e02 = ethers.utils.parseEther('0.02')

describe("BetPool", function () {
  async function PoolOf3(fee: number) {
    const [owner,
        option1, option2, option3, option4,
        bettor1, bettor2, bettor3, bettor4,
    ] = await ethers.getSigners()
    const BetPoolContract = await ethers.getContractFactory(CONTRACT)
    const options = [option1, option2, option3].map((option)=>option.address)
    const minBetSize = ethers.utils.parseEther('0.01')
    const betPool = await BetPoolContract.deploy(options, fee, minBetSize)
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
    const x = await betPool.connect(bettor1).bet(option1.address, {value: e01})

    const amountForOption = await betPool.bets(option1.address)
    expect(amountForOption).to.equal(e01)

    const amountBettor1 = await betPool.bettors(option1.address, bettor1.address)
    expect(amountBettor1).to.equal(e01)

    const x1 = await betPool.connect(bettor1).bet(option1.address, {value: e01})

    const newAmountForOption = await betPool.bets(option1.address)
    expect(newAmountForOption).to.equal(e02)

    const newAmountBettor1 = await betPool.bettors(option1.address, bettor1.address)
    expect(newAmountBettor1).to.equal(e02)
  })

  it("Should allow different addresses to bet N ETH to an option", async function () {
    const { betPool, bettors, options } = await loadFixture(PoolOf3NoFee)
    const [ option1 ] = options
    const [ bettor1, bettor2 ] = bettors
    const x = await betPool.connect(bettor1).bet(option1.address, {value: e01})
    const x1 = await betPool.connect(bettor2).bet(option1.address, {value: e01})

    const amountForOption1 = await betPool.bets(option1.address)
    expect(amountForOption1).to.equal(e02)

    const amountBettor1 = await betPool.bettors(option1.address, bettor1.address)
    expect(amountBettor1).to.equal(e01)

    const amountBettor2 = await betPool.bettors(option1.address, bettor2.address)
    expect(amountBettor2).to.equal(e01)
  })

  it("Should compute to correct expected payout for the address", async function () {
    const { betPool, bettors, options } = await loadFixture(PoolOf3NoFee)
    const [ option1 ] = options
    const [ bettor1, bettor2 ] = bettors
    const x = await betPool.connect(bettor1).bet(option1.address, {value: e01})
    const x1 = await betPool.connect(bettor2).bet(option1.address, {value: e01})

    const amountForOption1 = await betPool.bets(option1.address)
    expect(amountForOption1).to.equal(e02)

    const amountBettor1 = await betPool.bettors(option1.address, bettor1.address)
    expect(amountBettor1).to.equal(e01)

    const amountBettor2 = await betPool.bettors(option1.address, bettor2.address)
    expect(amountBettor2).to.equal(e01)

    const percentage = await betPool.payout (option1.address, bettor1.address)
    expect(percentage).to.equal(e01)
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
    const x = await betPool.connect(bettor1).bet(option1.address, {value: e01})
    const x1 = await betPool.connect(bettor2).bet(option1.address, {value: e01})

    const amountForOption1 = await betPool.bets(option1.address)
    expect(amountForOption1).to.equal(e02)

    const amountBettor1 = await betPool.bettors(option1.address, bettor1.address)
    expect(amountBettor1).to.equal(e01)

    const amountBettor2 = await betPool.bettors(option1.address, bettor2.address)
    expect(amountBettor2).to.equal(e01)

    const percentage = await betPool.payout (option1.address, bettor1.address)
    expect(percentage).to.equal(ethers.utils.parseEther('0.0098'))
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
    await expect(claimNoWinner()).to.be.revertedWithCustomError(PoolContract, 'NoWinnerYet')
  })

  it("Should revert setting the winner when is already set", async function () {
    async function SetWinnerOnlyOnce() {
      const { betPool, bettors, options } = await loadFixture(PoolOf3NoFee)
      const [ option1, option2 ] = options

      await betPool.setWinner(option1.address)
      await betPool.setWinner(option2.address)
    }

    const PoolContract = await ethers.getContractFactory(CONTRACT)
    await expect(SetWinnerOnlyOnce()).to.be.revertedWithCustomError(PoolContract, 'WinnerAlreadySet')
  })

  it("Should revert setting the winner if the provided winner is not an option", async function () {
    async function SetUnknownWinner() {
      const { betPool, bettors, options } = await loadFixture(PoolOf3NoFee)
      const [ option1, option2, option3, option4 ] = options

      await betPool.setWinner(option4.address)
    }

    const PoolContract = await ethers.getContractFactory(CONTRACT)
    await expect(SetUnknownWinner()).to.be.revertedWithCustomError(PoolContract, 'UnknownWinner')
  })

  it("Should revert betting if the provided option not actually an option", async function () {
    async function BetForAnUnknownOption() {
      const { betPool, bettors, options } = await loadFixture(PoolOf3NoFee)
      const [ bettor1 ] = bettors
      const [ option1, option2, option3, option4 ] = options

      const b1 = await betPool.connect(bettor1).bet(option4.address, {value: ethers.utils.parseEther('0.01')})
    }

    const PoolContract = await ethers.getContractFactory(CONTRACT)
    await expect(BetForAnUnknownOption()).to.be.revertedWithCustomError(PoolContract, 'UnknownOption')
  })

  it("Should allow only the owner to set the winner", async function () {
    async function BettorSettingWinner() {
      const { betPool, bettors, options } = await loadFixture(PoolOf3NoFee)
      const [ bettor1 ] = bettors
      const [ option1 ] = options
      await betPool.connect(bettor1).setWinner(option1.address)
    }

    const PoolContract = await ethers.getContractFactory(CONTRACT)
    await expect(BettorSettingWinner()).to.be.revertedWith('Ownable: caller is not the owner')
  })

  it("Should only allow to claim once", async function () {
    async function ClaimTwice() {
      const { betPool, bettors, options } = await loadFixture(PoolOf3NoFee)
      const [ bettor1, bettor2 ] = bettors
      const [ option1, option2 ] = options

      await betPool.connect(bettor1).bet(option1.address, {value: e01})
      await betPool.connect(bettor2).bet(option2.address, {value: e01})
      await betPool.setWinner(option1.address)
      await betPool.connect(bettor1).claim()
      await betPool.connect(bettor1).claim()
    }

    const PoolContract = await ethers.getContractFactory(CONTRACT)
    await expect(ClaimTwice()).to.be.revertedWithCustomError(PoolContract, 'AlreadyClaimed')
  })

  it("Should not allow to bet if the winner is already set", async function () {
    async function BetAfterEnd() {
      const { betPool, bettors, options } = await loadFixture(PoolOf3NoFee)
      const [ bettor1 ] = bettors
      const [ option1 ] = options

      await betPool.setWinner(option1.address)
      await betPool.connect(bettor1).bet(option1.address, {value: e01})
    }

    const PoolContract = await ethers.getContractFactory(CONTRACT)
    await expect(BetAfterEnd()).to.be.revertedWithCustomError(PoolContract, 'WinnerAlreadySet')
  })

  it("Should emit `WinnerSet` event", async function () {
    const { betPool, bettors, options } = await loadFixture(PoolOf3NoFee)
    const [ option1 ] = options

    await expect(betPool.setWinner(option1.address))
      .to.emit(betPool, 'WinnerSet')
      .withArgs(option1.address)
  })
})
