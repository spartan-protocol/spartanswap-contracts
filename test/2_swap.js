/*
################################################
Creates 3 tokens and stakes them
################################################
*/

const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');

var SPARTA = artifacts.require("./Sparta.sol");
var SROUTER = artifacts.require("./SRouter.sol");
var SPOOL = artifacts.require("./SPool.sol");
var MATH = artifacts.require("MathContract");
var TOKEN1 = artifacts.require("./Token1.sol");

var sparta; var token1;  var token2; var coreMath; var sRouter;
var spartanPools; var spartanPools1; var spartanPools2;
var acc0; var acc1; var acc2; var acc3;

contract('SPARTA', function (accounts) {
    constructor(accounts)
    upgrade()
    createPool()

    stakeETH(acc1, _.BN2Str(_.one * 10), _.dot1BN)

    // Single swap
    swapSPARTAToETH(acc0, _.BN2Str(_.one * 10))
    swapETHToSPARTA(acc0, _.BN2Str(_.one * 1))

    stakeTKN1(acc1, _.BN2Str(_.one * 10), _.BN2Str(_.one * 100))

    // // Double swap
    swapTKN1ToETH(acc0, _.BN2Str(_.one * 10))
    swapETHToTKN1(acc0, _.BN2Str(_.one * 1))

    stakeTKN2(acc1, _.BN2Str(_.one * 10), _.BN2Str(_.one * 100))

    // // // // Double swap back
    swapTKN2ToETH(acc0, _.BN2Str(_.one * 10))
    swapETHToTKN2(acc0, _.BN2Str(_.one * 1))

    unstakeETH(10000, acc0)
    unstakeTKN1(10000, acc1)
    unstakeTKN2(10000, acc1)

    checkROI()
})


//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
        sparta = await SPARTA.new()
        coreMath = await MATH.new()
        token1 = await TOKEN1.new();
        token2 = await TOKEN1.new();
        sRouter = await SROUTER.new(sparta.address, coreMath.address)

        console.log(`Acc0: ${acc0}`)
        console.log(`sRouter: ${sRouter.address}`)
        console.log(`spartan: ${sparta.address}`)
        console.log(`token1: ${token1.address}`)
        console.log(`coreMath: ${coreMath.address}`)

        let supplyT1 = await token1.totalSupply()
        await token1.transfer(acc1, _.getBN(_.BN2Int(supplyT1)/2))
        await token2.transfer(acc1, _.getBN(_.BN2Int(supplyT1)/2))
        await token1.approve(sRouter.address, supplyT1, { from: acc0 })
        await token1.approve(sRouter.address, supplyT1, { from: acc1 })
        await token2.approve(sRouter.address, supplyT1, { from: acc0 })
        await token2.approve(sRouter.address, supplyT1, { from: acc1 })
    });
}

async function upgrade() {

    it("DAO list token", async function() {
        await sparta.listTokenWithClaim(token1.address, _.BN2Str(500000 * _.one), _.BN2Str(_.one));
      });

      it("Should upgrade acc0", async function() {
      let balance = await token1.balanceOf(acc0)
      await token1.approve(sparta.address, balance, {from:acc0})
      await sparta.upgrade(token1.address, {from:acc0})
      expect(_.BN2Str(await sparta.totalSupply())).to.equal(_.BN2Str(500000 * _.one));
      expect(_.BN2Str(await token1.balanceOf(acc0))).to.equal('499500000000000000000000000');
      expect(_.BN2Str(await sparta.balanceOf(acc0))).to.equal(_.BN2Str(500000 * _.one));
      expect(await sparta.mapMemberToken_hasClaimed(acc0, token1.address)).to.equal(true);

      await sparta.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
      await sparta.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
      await sparta.approve(sRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
      await sparta.approve(sRouter.address, _.BN2Str(500000 * _.one), { from: acc1 })
      await sparta.approve(sRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })
    });
}

async function createPool() {
    it("It should deploy Eth Pool", async () => {
        var POOL = await sRouter.createPool.call(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        await sRouter.createPool(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        spartanPools = await SPOOL.at(POOL)
        console.log(`Pools: ${spartanPools.address}`)
        const spartanAddr = await spartanPools.SPARTA()
        assert.equal(spartanAddr, sparta.address, "address is correct")
        assert.equal(_.BN2Str(await sparta.balanceOf(spartanPools.address)), _.BN2Str(_.one * 10), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(_.dot1BN), 'ether balance')

        let supply = await sparta.totalSupply()
        await sparta.approve(spartanPools.address, supply, { from: acc0 })
        await sparta.approve(spartanPools.address, supply, { from: acc1 })
    })

    it("It should deploy TKN1 Pools", async () => {

        await token1.approve(sRouter.address, '-1', { from: acc0 })
        var POOL = await sRouter.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        await sRouter.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        spartanPools1 = await SPOOL.at(POOL)
        console.log(`Pools1: ${spartanPools1.address}`)
        const spartanAddr = await spartanPools1.SPARTA()
        assert.equal(spartanAddr, sparta.address, "address is correct")

        await sparta.approve(spartanPools1.address, '-1', { from: acc0 })
        await sparta.approve(spartanPools1.address, '-1', { from: acc1 })
        await token1.approve(spartanPools1.address, '-1', { from: acc0 })
        await token1.approve(spartanPools1.address, '-1', { from: acc1 })
    })
    it("It should deploy TKN2 Pools", async () => {

        await token2.approve(sRouter.address, '-1', { from: acc0 })
        var POOL = await sRouter.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token2.address)
        await sRouter.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token2.address)
        spartanPools2 = await SPOOL.at(POOL)
        console.log(`Pools2: ${spartanPools2.address}`)
        const spartanAddr = await spartanPools2.SPARTA()
        assert.equal(spartanAddr, sparta.address, "address is correct")

        await sparta.approve(spartanPools2.address, '-1', { from: acc0 })
        await sparta.approve(spartanPools2.address, '-1', { from: acc1 })
        await token2.approve(spartanPools2.address, '-1', { from: acc0 })
        await token2.approve(spartanPools2.address, '-1', { from: acc1 })
    })
}

async function stakeETH(acc, v, a) {

    it(`It should stake ETH from ${acc}`, async () => {

        var V = _.getBN((await spartanPools.poolData()).sparta)
        var A = _.getBN((await spartanPools.poolData()).token)
        poolUnits = _.getBN((await spartanPools.totalSupply()))
        console.log('start data', _.BN2Str(V), _.BN2Str(A), _.BN2Str(poolUnits))

        let units = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))
        console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(V.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
        
        let tx = await sRouter.stake(v, a, _.ETH, { from: acc, value: a })

        assert.equal(_.BN2Str((await spartanPools.poolData()).sparta), _.BN2Str(V.plus(v)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).token), _.BN2Str(A.plus(a)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).spartaStaked), _.BN2Str(V.plus(v)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).tokenStaked), _.BN2Str(A.plus(a)))
        assert.equal(_.BN2Str((await spartanPools.totalSupply())), _.BN2Str(units.plus(poolUnits)), 'poolUnits')
        assert.equal(_.BN2Str(await spartanPools.balanceOf(acc)), _.BN2Str(units), 'units')
        assert.equal(_.BN2Str(await sparta.balanceOf(spartanPools.address)), _.BN2Str(V.plus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(A.plus(a)), 'ether balance')

        let stakeData = (await spartanPools.getMemberData(acc))
        assert.equal(stakeData.sparta, v, 'spartan')
        assert.equal(stakeData.token, a, 'token')

        // assert.equal(_.BN2Str(await spartanPools.allowance(acc, spartanPools.address)), _.BN2Str(units), 'units')

        const tokenBal = _.BN2Token(await web3.eth.getBalance(spartanPools.address));
        const spartanBal = _.BN2Token(await sparta.balanceOf(spartanPools.address));
        console.log(`BALANCES: [ ${tokenBal} ETH | ${spartanBal} SPARTA ]`)
    })
}

async function stakeTKN1(acc, a, v) {
    it(`It should stake TKN1 from ${acc}`, async () => {
        await _stakeTKN(acc, a, v, token1, spartanPools1)
        await help.logPool(spartanPools1, token1.address, 'TKN1')
    })
}
async function stakeTKN2(acc, a, v) {
    it(`It should stake TKN2 from ${acc}`, async () => {
        await _stakeTKN(acc, a, v, token2, spartanPools2)
        await help.logPool(spartanPools2, token2.address, 'TKN2')
    })
}

async function _stakeTKN(acc, a, v, token, pools) {
    var V = _.getBN((await pools.poolData()).sparta)
    var A = _.getBN((await pools.poolData()).token)
    poolUnits = _.getBN((await pools.totalSupply()))
    console.log('start data', _.BN2Str(V), _.BN2Str(A), _.BN2Str(poolUnits))

    let units = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))
    console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(V.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
    
    let tx = await sRouter.stake(v, a, token.address, {from: acc})
    // console.log(tx.receipt.logs)
    assert.equal(_.BN2Str((await pools.poolData()).sparta), _.BN2Str(V.plus(v)))
    assert.equal(_.BN2Str((await pools.poolData()).token), _.BN2Str(A.plus(a)))
    assert.equal(_.BN2Str((await pools.poolData()).spartaStaked), _.BN2Str(V.plus(v)))
    assert.equal(_.BN2Str((await pools.poolData()).tokenStaked), _.BN2Str(A.plus(a)))
    assert.equal(_.BN2Str((await pools.totalSupply())), _.BN2Str(units.plus(poolUnits)), 'poolUnits')
    assert.equal(_.BN2Str(await pools.balanceOf(acc)), _.BN2Str(units), 'units')
    assert.equal(_.BN2Str(await sparta.balanceOf(pools.address)), _.BN2Str(V.plus(v)), 'spartan balance')
    assert.equal(_.BN2Str(await token.balanceOf(pools.address)), _.BN2Str(A.plus(a)), 'ether balance')

    let stakeData = (await pools.getMemberData(acc))
    assert.equal(stakeData.sparta, v, 'spartan')
    assert.equal(stakeData.token, a, 'token')
}


async function swapSPARTAToETH(acc, v) {

    it(`It should buy ETH with SPARTA from ${acc}`, async () => {

        const V = _.getBN((await spartanPools.poolData()).sparta)
        const A = _.getBN((await spartanPools.poolData()).token)
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let a = math.calcSwapOutput(v, V, A)
        let fee = math.calcSwapFee(v, V, A)
        // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
        
        let tx = await sRouter.buy(v, _.ETH)

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(v))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(a))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str((await spartanPools.poolData()).token), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).sparta), _.BN2Str(V.plus(v)))

        assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(A.minus(a)), 'ether balance')
        assert.equal(_.BN2Str(await sparta.balanceOf(spartanPools.address)), _.BN2Str(V.plus(v)), 'spartan balance')

        await help.logPool(spartanPools, _.ETH, 'ETH')
    })
}

async function swapETHToSPARTA(acc, a) {

    it(`It should sell ETH to SPARTA from ${acc}`, async () => {

        const V = _.getBN((await spartanPools.poolData()).sparta)
        const A = _.getBN((await spartanPools.poolData()).token)
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let v = math.calcSwapOutput(a, A, V)
        let fee = math.calcSwapFee(a, A, V)
        // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
        
        let tx = await sRouter.sell(a, _.ETH, { from: acc, value: a })

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(a))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(v))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str((await spartanPools.poolData()).token), _.BN2Str(A.plus(a)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).sparta), _.BN2Str(V.minus(v)))

        assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(A.plus(a)), 'ether balance')
        // assert.equal(_.BN2Str(await sparta.balanceOf(spartanPools.address)), _.BN2Str(V.minus(v)), 'spartan balance')

        await help.logPool(spartanPools, _.ETH, 'ETH')
    })
}

async function swapTKN1ToETH(acc, x) {
    it(`It should swap TKN1 to ETH from ${acc}`, async () => {
        await _swapTKNToETH(acc, x, token1, spartanPools1)
        await help.logPool(spartanPools1, token1.address, 'TKN1')
    })
}

async function swapTKN2ToETH(acc, x) {
    it(`It should swap TKN2 to ETH from ${acc}`, async () => {
        await _swapTKNToETH(acc, x, token2, spartanPools2)
        await help.logPool(spartanPools2, token2.address, 'TKN2')

    })
}

async function _swapTKNToETH(acc, x, token, pools) {

        const toToken = _.ETH
        const X = _.getBN((await pools.poolData()).token)
        const Y = _.getBN((await pools.poolData()).sparta)
        const V = _.getBN((await spartanPools.poolData()).sparta)
        const Z = _.getBN((await spartanPools.poolData()).token)
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let y = math.calcSwapOutput(x, X, Y)
        let feey = math.calcSwapFee(x, X, Y)
        let z = math.calcSwapOutput(y, V, Z)
        let feez = math.calcSwapFee(y, V, Z)
        let fee = math.calcValueIn(feey, V.plus(y), Z.minus(z)).plus(feez)
        // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
        
        let tx = await sRouter.swap(x, token.address, toToken)

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(x))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.transferAmount), _.BN2Str(y))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(z))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))
        // assert.equal(_.BN2Str(tx.receipt.logs[4].args.inputAmount), _.BN2Str(y))
        // assert.equal(_.BN2Str(tx.receipt.logs[4].args.transferAmount), _.BN2Str(0))
        // assert.equal(_.BN2Str(tx.receipt.logs[4].args.outputAmount), _.BN2Str(z))
        // assert.equal(_.BN2Str(tx.receipt.logs[4].args.fee), _.BN2Str(feez))

        assert.equal(_.BN2Str((await pools.poolData()).token), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str((await pools.poolData()).sparta), _.BN2Str(Y.minus(y)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).sparta), _.BN2Str(V.plus(y)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).token), _.BN2Str(Z.minus(z)))

        assert.equal(_.BN2Str(await token.balanceOf(pools.address)), _.BN2Str(X.plus(x)), 'token1 balance')
        assert.equal(_.BN2Str(await sparta.balanceOf(pools.address)), _.BN2Str(Y.minus(y)), 'spartan balance')
        assert.equal(_.BN2Str(await sparta.balanceOf(spartanPools.address)), _.BN2Str(V.plus(y)), 'spartan balance eth')
        assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(Z.minus(z)), 'ether balance')

        await help.logPool(pools, token.address, 'TKN1')
        await help.logPool(pools, _.ETH, 'ETH')
}

async function swapETHToTKN1(acc, x) {
    it(`It should sell ETH with TKN1 from ${acc}`, async () => {
        await _swapETHToTKN(acc, x, token1, spartanPools1)
        await help.logPool(spartanPools1, token1.address, 'TKN1')
    })
}

async function swapETHToTKN2(acc, x) {
    it(`It should sell ETH to TKN2 from ${acc}`, async () => {
        await _swapETHToTKN(acc, x, token1, spartanPools1)
        await help.logPool(spartanPools2, token2.address, 'TKN2')

    })
}

async function _swapETHToTKN(acc, x, token, pools) {

    const X = _.getBN((await spartanPools.poolData()).token)
    const Y = _.getBN((await spartanPools.poolData()).sparta)
    const V = _.getBN((await pools.poolData()).sparta)
    const Z = _.getBN((await pools.poolData()).token)
    // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

    let y = math.calcSwapOutput(x, X, Y)
    let feey = math.calcSwapFee(x, X, Y)
    let z = math.calcSwapOutput(y, V, Z)
    let feez = math.calcSwapFee(y, V, Z)
    let fee = math.calcValueIn(feey, V.plus(y), Z.minus(z)).plus(feez)
    // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
    
    let tx = await sRouter.swap(x, _.ETH, token.address, {from:acc, value: x})

    assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(x))
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.transferAmount), _.BN2Str(y))
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(z))
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

    assert.equal(_.BN2Str((await spartanPools.poolData()).token), _.BN2Str(X.plus(x)))
    assert.equal(_.BN2Str((await spartanPools.poolData()).sparta), _.BN2Str(Y.minus(y)))
    assert.equal(_.BN2Str((await pools.poolData()).sparta), _.BN2Str(V.plus(y)))
    assert.equal(_.BN2Str((await pools.poolData()).token), _.BN2Str(Z.minus(z)))

    assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(X.plus(x)), 'token1 balance')
    assert.equal(_.BN2Str(await sparta.balanceOf(spartanPools.address)), _.BN2Str(Y.minus(y)), 'spartan balance')
    assert.equal(_.BN2Str(await sparta.balanceOf(pools.address)), _.BN2Str(V.plus(y)), 'spartan balance eth')
    assert.equal(_.BN2Str(await token.balanceOf(pools.address)), _.BN2Str(Z.minus(z)), 'ether balance')

    await help.logPool(pools, token.address, 'TKN1')
    await help.logPool(spartanPools, _.ETH, 'ETH')
}



async function unstakeETH(bp, acc) {

    it(`It should unstake ETH for ${acc}`, async () => {
        let poolROI = await spartanPools.getPoolROI()
        console.log('poolROI-ETH', _.BN2Str(poolROI))
        let poolAge = await spartanPools.getPoolAge()
        console.log('poolAge-ETH', _.BN2Str(poolAge))
        let poolAPY = await spartanPools.getPoolAPY()
        console.log('poolAPY-ETH', _.BN2Str(poolAPY))
        let memberROI0 = await spartanPools.getMemberROI(acc0)
        console.log('memberROI0', _.BN2Str(memberROI0))
        let memberROI1 = await spartanPools.getMemberROI(acc1)
        console.log('memberROI1', _.BN2Str(memberROI1))

        var V = _.getBN((await spartanPools.poolData()).sparta)
        var A = _.getBN((await spartanPools.poolData()).token)

        let totalUnits = _.getBN((await spartanPools.totalSupply()))
        let stakerUnits = _.getBN(await spartanPools.balanceOf(acc))
        let share = (stakerUnits.times(bp)).div(10000)
        let v = _.floorBN((V.times(share)).div(totalUnits))
        let a = _.floorBN((A.times(share)).div(totalUnits))
        // let vs = (await spartanPools.poolData()).spartaStaked
        // let as = (await spartanPools.poolData()).tokenStaked
        // let vsShare = _.floorBN((V.times(share)).div(totalUnits))
        // let asShare = _.floorBN((A.times(share)).div(totalUnits))
        console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(v), _.BN2Str(a))
        
        let tx = await sRouter.unstake(bp, _.ETH, { from: acc})

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputSparta), _.BN2Str(v), 'outputSparta')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputToken), _.BN2Str(a), 'outputToken')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await spartanPools.totalSupply())), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str((await spartanPools.poolData()).sparta), _.BN2Str(V.minus(v)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).token), _.BN2Str(A.minus(a)))
        // assert.equal(_.BN2Str((await spartanPools.poolData()).spartaStaked), _.BN2Str(V.minus(v)))
        // assert.equal(_.BN2Str((await spartanPools.poolData()).tokenStaked), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(await sparta.balanceOf(spartanPools.address)), _.BN2Str(V.minus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakerUnits2 = _.getBN(await spartanPools.balanceOf(acc))
        assert.equal(_.BN2Str(stakerUnits2), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
    })
}

async function unstakeTKN1(bp, acc) {

    it(`It should unstake TKN1 for ${acc}`, async () => {
        let poolROI = await spartanPools1.getPoolROI()
        console.log('poolROI-TKN1', _.BN2Str(poolROI))
        let memberROI0 = await spartanPools1.getMemberROI(acc0)
        console.log('memberROI0', _.BN2Str(memberROI0))
        let memberROI1 = await spartanPools1.getMemberROI(acc1)
        console.log('memberROI1', _.BN2Str(memberROI1))

        await _unstakeTKN(bp, acc, spartanPools1, token1)
        await help.logPool(spartanPools1, token1.address, 'TKN1')

    })
}

async function unstakeTKN2(bp, acc) {

    it(`It should unstake TKN2 for ${acc}`, async () => {
        let poolROI = await spartanPools2.getPoolROI()
        console.log('poolROI-TKN2', _.BN2Str(poolROI))
        let memberROI0 = await spartanPools2.getMemberROI(acc0)
        console.log('memberROI0', _.BN2Str(memberROI0))
        let memberROI1 = await spartanPools2.getMemberROI(acc1)
        console.log('memberROI1', _.BN2Str(memberROI1))

        await _unstakeTKN(bp, acc, spartanPools2, token2)
        await help.logPool(spartanPools2, token2.address, 'TKN2')

    })
}

async function _unstakeTKN(bp, acc, pools, token) {

        var V = _.getBN((await pools.poolData()).sparta)
        var A = _.getBN((await pools.poolData()).token)

        let totalUnits = _.getBN((await pools.totalSupply()))
        let stakerUnits = _.getBN(await pools.balanceOf(acc))
        let share = (stakerUnits.times(bp)).div(10000)
        let v = _.floorBN((V.times(share)).div(totalUnits))
        let a = _.floorBN((A.times(share)).div(totalUnits))
        console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(v), _.BN2Str(a))
        
        let tx = await sRouter.unstake(bp, token.address, { from: acc})

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputSparta), _.BN2Str(v), 'outputSparta')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputToken), _.BN2Str(a), 'outputToken')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await pools.totalSupply())), _.BN2Str(totalUnits.minus(share)), 'poolUnits')

        assert.equal(_.BN2Str((await pools.poolData()).sparta), _.BN2Str(V.minus(v)))
        assert.equal(_.BN2Str((await pools.poolData()).token), _.BN2Str(A.minus(a)))
        // assert.equal(_.BN2Str((await pools.poolData()).spartaStaked), _.BN2Str(V.minus(v)))
        // assert.equal(_.BN2Str((await pools.poolData()).tokenStaked), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(await sparta.balanceOf(pools.address)), _.BN2Str(V.minus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await token.balanceOf(pools.address)), _.BN2Str(A.minus(a)), 'token balance')

        let stakerUnits2 = _.getBN(await pools.balanceOf(acc))
        assert.equal(_.BN2Str(stakerUnits2), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
}


async function logETH() {
    it("logs", async () => {
        await help.logPool(spartanPools, _.ETH, 'ETH')
    })
}
function logTKN1() {
    it("logs", async () => {
        await help.logPool(spartanPools, token1.address, 'TKN1')
    })
}function logTKN2() {
    it("logs", async () => {
        await help.logPool(spartanPools, token2.address, 'TKN2')
    })
}

function checkROI() {
    it("checks ROI", async () => {
        let poolROI = await spartanPools.getPoolROI()
        console.log('poolROI', _.BN2Str(poolROI))
        let memberROI0 = await spartanPools.getMemberROI(acc0)
        console.log('memberROI0', _.BN2Str(memberROI0))
        let memberROI1 = await spartanPools.getMemberROI(acc1)
        console.log('memberROI1', _.BN2Str(memberROI1))

        let tokenStaked = _.BN2Str((await spartanPools.poolData()).tokenStaked)
        console.log('tokenStaked', _.BN2Token(tokenStaked))
        let _tokenStakedInSparta = _.BN2Str((await spartanPools.calcValueInSparta(tokenStaked)))
        console.log('tokenStakedInSparta', _.BN2Token(_tokenStakedInSparta))

        console.log('getGlobalDetails', (await sRouter.getGlobalDetails()))
    })
}

