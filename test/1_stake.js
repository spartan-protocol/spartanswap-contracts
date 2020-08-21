/*
################################################
Stakes and unstakes ETH
################################################
*/

const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');

var SPARTA = artifacts.require("./SpartaMinted.sol");
var SROUTER = artifacts.require("./SRouter.sol");
var SPOOL = artifacts.require("./SPool.sol");
var UTILS = artifacts.require("./Utils.sol");
var TOKEN1 = artifacts.require("./Token1.sol");

var sparta; var spartanPools;  var utils; var token1; var token2;
var sPool; var sRouter;
var acc0; var acc1; var acc2; var acc3;

contract('SPT', function (accounts) {

    constructor(accounts)
    createPool()
    logStaker(acc0)
    stakeFail()

    stakeETH(acc1, _.BN2Str(_.one * 10), _.dot1BN)
    logETH()
    logStaker(acc1)
    checkDetails()

    unstakeETH(10000, acc1)
    logETH()
    logStaker(acc1)
    checkDetails()
    unstakeETH(10000, acc0)
    logETH()
    logStaker(acc0)
    checkDetails()

    stakeETH(acc0, _.BN2Str(_.one * 10), _.dot1BN)
    stakeETH(acc1, _.BN2Str(_.one * 10), _.dot1BN)
    logETH()
    checkDetails()
    unstakeFailStart()

    unstakeAsym(5000, acc1, false)
    logETH()
    checkDetails()
    unstakeExactAsym(10000, acc1, true)
    logETH()
    checkDetails()


    unstakeFailExactAsym(10000, acc0, true)
    unstakeETH(5000, acc0)
    logETH()
    checkDetails()
    unstakeETH(10000, acc0)
    logETH()
    checkDetails()

    unstakeFailEnd(acc0)

})


//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
        sparta = await SPARTA.new()
        utils = await UTILS.new()
        token1 = await TOKEN1.new();
        token2 = await TOKEN1.new();
        sRouter = await SROUTER.new(sparta.address, utils.address)

        console.log(`Acc0: ${acc0}`)
        console.log(`sparta: ${sparta.address}`)
        console.log(`token1: ${token1.address}`)
        console.log(`utils: ${utils.address}`)
        console.log(`sRouter: ${sRouter.address}`)

        await utils.setRouter(sRouter.address)
        console.log(await utils.ROUTER())

        let supply = await token1.totalSupply()
        await sparta.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await sparta.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await sparta.approve(sRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await sparta.approve(sRouter.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await sparta.approve(sRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await token1.transfer(acc1, _.getBN(_.BN2Int(supply)/2))
        await token2.transfer(acc1, _.getBN(_.BN2Int(supply)/2))
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
}


async function stakeFail() {
    it("It should revert with no ETH value", async () => {
        var tx1 = await truffleAssert.reverts(sRouter.stake(_.BN2Str(_.one * 100), _.BN2Str(_.one), _.ETH));
    })
}

async function stakeETH(acc, v, a) {

    it(`It should stake ETH from ${acc}`, async () => {
        let token = _.ETH
        let poolData = await utils.getPoolData(token);
        var S = _.getBN(poolData.baseAmt)
        var A = _.getBN(poolData.tokenAmt)
        poolUnits = _.getBN((await spartanPools.totalSupply()))
        console.log('start data', _.BN2Str(S), _.BN2Str(A), _.BN2Str(poolUnits))

        let units = math.calcStakeUnits(a, A.plus(a), v, S.plus(v))
        console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(S.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
        
        let tx = await sRouter.stake(v, a, token, { from: acc, value: a })
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str(poolData.baseAmt), _.BN2Str(S.plus(v)))
        assert.equal(_.BN2Str(poolData.tokenAmt), _.BN2Str(A.plus(a)))
        assert.equal(_.BN2Str(poolData.baseAmtStaked), _.BN2Str(S.plus(v)))
        assert.equal(_.BN2Str(poolData.tokenAmtStaked), _.BN2Str(A.plus(a)))
        assert.equal(_.BN2Str((await spartanPools.totalSupply())), _.BN2Str(units.plus(poolUnits)), 'poolUnits')
        assert.equal(_.BN2Str(await spartanPools.balanceOf(acc)), _.BN2Str(units), 'units')
        assert.equal(_.BN2Str(await sparta.balanceOf(spartanPools.address)), _.BN2Str(S.plus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(A.plus(a)), 'ether balance')

        let memberData = (await utils.getMemberData(token, acc))
        assert.equal(memberData.baseAmtStaked, v, 'baseAmt')
        assert.equal(memberData.tokenAmtStaked, a, 'tokenAmt')

        const tokenBal = _.BN2Token(await web3.eth.getBalance(spartanPools.address));
        const spartanBal = _.BN2Token(await sparta.balanceOf(spartanPools.address));
        console.log(`BALANCES: [ ${tokenBal} ETH | ${spartanBal} SPT ]`)
    })
}



async function unstakeETH(bp, acc) {

    it(`It should unstake ETH for ${acc}`, async () => {
        let token = _.ETH
        let poolData = await utils.getPoolData(token);
        var S = _.getBN(poolData.baseAmt)
        var A = _.getBN(poolData.tokenAmt)

        let totalUnits = _.getBN((await spartanPools.totalSupply()))
        let stakerUnits = _.getBN(await spartanPools.balanceOf(acc))
        let share = (stakerUnits.times(bp)).div(10000)
        let v = _.floorBN((S.times(share)).div(totalUnits))
        let a = _.floorBN((A.times(share)).div(totalUnits))
        let memberData = (await utils.getMemberData(token, acc))
        let baseAmt = _.getBN(memberData.baseAmtStaked)
        let tokenAmt = _.getBN(memberData.tokenAmtStaked)
        let vs = _.floorBN((baseAmt.times(bp)).div(10000))
        let aa = _.floorBN((tokenAmt.times(bp)).div(10000))
        console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(v), _.BN2Str(a))
        
        let tx = await sRouter.unstake(bp, token, { from: acc})
        poolData = await utils.getPoolData(token);
        // console.log(tx.receipt.logs)
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputBase), _.BN2Str(_.floorBN(v)), 'outputSpartan')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputToken), _.BN2Str(_.floorBN(a)), 'outputToken')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await spartanPools.totalSupply())), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str(poolData.baseAmt), _.BN2Int(S.minus(v)))
        assert.equal(_.BN2Str(poolData.tokenAmt), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(poolData.baseAmtStaked), _.BN2Int(S.minus(v)))
        assert.equal(_.BN2Str(poolData.tokenAmtStaked), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(await sparta.balanceOf(spartanPools.address)), _.BN2Int(S.minus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let memberData2 = (await utils.getMemberData(token, acc))
        assert.equal(_.BN2Str((memberData2.baseAmtStaked)), _.BN2Str(baseAmt.minus(vs)), '0')
        assert.equal(_.BN2Str((memberData2.tokenAmtStaked)), _.BN2Str(tokenAmt.minus(aa)), '0')
        assert.equal(_.BN2Str(await spartanPools.balanceOf(acc)), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
    })
}

async function unstakeAsym(bp, acc, toSeth) {

    it(`It should assym unstake from ${acc}`, async () => {
        let token = _.ETH
        let poolData = await utils.getPoolData(token);
        var S = _.getBN(poolData.baseAmt)
        var A = _.getBN(poolData.tokenAmt)
        // console.log(poolData)
        let totalUnits = _.getBN((await spartanPools.totalSupply()))
        let stakerUnits = _.getBN(await spartanPools.balanceOf(acc))
        let share = (stakerUnits.times(bp)).div(10000)

        // console.log(_.BN2Str(share), _.BN2Str(totalUnits), _.BN2Str(S), bp, toSeth)

        let a; let s;
        if(toSeth){
            s = math.calcAsymmetricShare(share, totalUnits, S)
            a = 0
        } else {
            s = 0
            a = math.calcAsymmetricShare(share, totalUnits, A)
        }

        let tx = await sRouter.unstakeAsymmetric(bp, toSeth, _.ETH, { from: acc})
        poolData = await utils.getPoolData(token);
        // console.log(poolData)
        // console.log(tx.receipt.logs)
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputBase), _.BN2Str(s), 'outputSpartan')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputToken), _.BN2Str(a), 'outputToken')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await spartanPools.totalSupply())), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str(poolData.baseAmt), _.BN2Str(S.minus(s)))
        assert.equal(_.BN2Str(poolData.tokenAmt), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(poolData.baseAmtStaked), _.BN2Str(S.minus(s)))
        assert.equal(_.BN2Str(poolData.tokenAmtStaked), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(await sparta.balanceOf(spartanPools.address)), _.BN2Str(S.minus(s)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakerUnits2 = _.getBN(await spartanPools.balanceOf(acc))
        assert.equal(_.BN2Str(stakerUnits2), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
    })
}

async function unstakeExactAsym(bp, acc, toSeth) {

    it(`It should assym unstake from ${acc}`, async () => {
        let token = _.ETH
        let poolData = await utils.getPoolData(token);
        var S = _.getBN(poolData.baseAmt)
        var A = _.getBN(poolData.tokenAmt)

        let totalUnits = _.getBN((await spartanPools.totalSupply()))
        let stakerUnits = _.getBN(await spartanPools.balanceOf(acc))
        let share = (stakerUnits.times(bp)).div(10000)

        let a; let v;
        if(toSeth){
            a = 0
            v = math.calcAsymmetricShare(share, totalUnits, S)
        } else {
            a = math.calcAsymmetricShare(share, totalUnits, A)
            v = 0
        }

        let tx = await sRouter.unstakeExactAsymmetric(share, toSeth, _.ETH, { from: acc})
        poolData = await utils.getPoolData(token);

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputBase), _.BN2Str(v), 'outputSpartan')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputToken), _.BN2Str(a), 'outputToken')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await spartanPools.totalSupply())), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str(poolData.baseAmt), S.minus(v))
        assert.equal(_.BN2Str(poolData.tokenAmt), A.minus(a))
        assert.equal(_.BN2Str(poolData.baseAmtStaked), _.BN2Str(S.minus(v)))
        assert.equal(_.BN2Str(poolData.tokenAmtStaked), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(await sparta.balanceOf(spartanPools.address)), _.BN2Str(S.minus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakerUnits2 = _.getBN(await spartanPools.balanceOf(acc))
        assert.equal(_.BN2Str(stakerUnits2), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
    })
}

async function unstakeFailExactAsym(bp, acc, toSeth) {

    it(`It should assym unstake from ${acc}`, async () => {
        let stakerUnits = _.getBN(await spartanPools.balanceOf(acc))
        let share = (stakerUnits.times(bp)).div(10000)

        await truffleAssert.reverts(sRouter.unstakeExactAsymmetric(share, toSeth, _.ETH, { from: acc}))
    })
}

async function unstakeFailStart() {

    it("It should revert if unstaking 0 BP", async () => {
        await truffleAssert.reverts(sRouter.unstake(0, _.ETH));
    })

    it("It should revert if unstaking 10001 BP", async () => {
        await truffleAssert.reverts(sRouter.unstake('10001', _.ETH));
    })

    it("It should revert if unstaking higher units", async () => {
        let units = _.getBN(await spartanPools.balanceOf(acc0))
        let unitsMore = units.plus(1)
        await truffleAssert.reverts(sRouter.unstakeExact(_.BN2Str(unitsMore), _.ETH));
    })
}

async function unstakeFailEnd(acc) {

    it("It should revert if unstaking unstaked member", async () => {
        await truffleAssert.reverts(sRouter.unstake(0, _.ETH, {from: acc}));
    })
    it("It should revert if unstaking assym", async () => {
        await truffleAssert.reverts(sRouter.unstake(0, _.ETH, {from: acc}));
    })
}

function logETH() {
    it("logs", async () => {
        await help.logPool(utils, _.ETH ,"ETH")
    })
}

function logTKN1() {
    it("logs", async () => {
        await help.logPool(utils, token1.address, 'TKN1')
    })
}function logTKN2() {
    it("logs", async () => {
        await help.logPool(utils, token2.address, 'TKN2')
    })
}

function logStaker(acc) {
    it("logs", async () => {
        await help.logStaker(utils, acc, _.ETH)
    })
}

function checkDetails() {
    it("checks details", async () => {
        console.log('getTokenDetails', (await utils.getTokenDetails(_.ETH)))
        console.log('getGlobalDetails', (await utils.getGlobalDetails()))
        console.log('getPoolData', (await utils.getPoolData(_.ETH)))
    })
}