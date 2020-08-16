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

var SPARTAN = artifacts.require("./Spartan.sol");
var SFACTORY = artifacts.require("./SFactory.sol");
var SPool = artifacts.require("./SPool.sol");
var MATH = artifacts.require("MathContract");
var TOKEN1 = artifacts.require("./Token1.sol");

var spartan; var spartanPools;  var coreMath; var token1; var token2;
var sPool; var sFactory;
var acc0; var acc1; var acc2; var acc3;

contract('SPT', function (accounts) {

    constructor(accounts)
    deployPool()
    logStaker(acc0)
    stakeFail()

    stakeETH(acc1, _.BN2Str(_.one * 10), _.dot1BN)
    logETH()
    logStaker(acc1)
    unstakeETH(10000, acc1)
    logETH()
    logStaker(acc1)
    unstakeETH(10000, acc0)
    logETH()
    logStaker(acc0)

    stakeETH(acc0, _.BN2Str(_.one * 10), _.dot1BN)
    stakeETH(acc1, _.BN2Str(_.one * 10), _.dot1BN)
    logETH()
    unstakeFailStart()

    unstakeAsym(5000, acc1, false)
    logETH()
    unstakeExactAsym(10000, acc1, true)
    logETH()


    unstakeFailExactAsym(10000, acc0, true)
    unstakeETH(5000, acc0)
    logETH()
    unstakeETH(10000, acc0)
    logETH()

    unstakeFailEnd(acc0)

    // stakeToken1(_.BN2Str(_.one * 10), _.BN2Str(_.one * 10))
    // logT1()
    //stakeWithAsset

    // stakeTKN1(acc0, _.BN2Str(_.one * 10), _.BN2Str(_.one * 100), true, 2)
    // logTKN1()
    // stakeTKN2(acc0, _.BN2Str(_.one * 10), _.BN2Str(_.one * 100), true, 3)
    // logTKN2()

    // unstakeTKN1(10000, acc0)
    // logTKN1()
    // unstakeTKN2(10000, acc0)
    // logTKN2()


})


//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
        spartan = await SPARTAN.new()
        coreMath = await MATH.new()
        token1 = await TOKEN1.new();
        token2 = await TOKEN1.new();
        sFactory = await SFACTORY.new(spartan.address, coreMath.address)

        console.log(`Acc0: ${acc0}`)
        console.log(`sFactory: ${sFactory.address}`)
        console.log(`spartan: ${spartan.address}`)
        console.log(`token1: ${token1.address}`)
        console.log(`coreMath: ${coreMath.address}`)

        let supply = await spartan.totalSupply()
        await spartan.approve(sFactory.address, supply, { from: acc0 })
        await spartan.transfer(acc1, _.getBN(_.BN2Int(supply)/2))
        let supplyT1 = await token1.totalSupply()
        await token1.transfer(acc1, _.getBN(_.BN2Int(supplyT1)/2))
        await token2.transfer(acc1, _.getBN(_.BN2Int(supplyT1)/2))
    });
}

async function deployPool() {
    it("It should deploy Eth Pool", async () => {
        var POOL = await sFactory.deployPool.call(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        await sFactory.deployPool(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        spartanPools = await SPool.at(POOL)
        console.log(`Pools: ${spartanPools.address}`)
        const spartanAddr = await spartanPools.SPARTAN()
        assert.equal(spartanAddr, spartan.address, "address is correct")

        let supply = await spartan.totalSupply()
        await spartan.approve(spartanPools.address, supply, { from: acc0 })
        await spartan.approve(spartanPools.address, supply, { from: acc1 })
    })
}


async function stakeFail() {
    it("It should revert with no ETH value", async () => {
        var tx1 = await truffleAssert.reverts(spartanPools.stake(_.BN2Str(_.one * 100), _.BN2Str(_.one)));
    })
}

async function stakeETH(acc, v, a) {

    it(`It should stake ETH from ${acc}`, async () => {

        var S = _.getBN((await spartanPools.poolData()).spartan)
        var A = _.getBN((await spartanPools.poolData()).asset)
        poolUnits = _.getBN((await spartanPools.totalSupply()))
        console.log('start data', _.BN2Str(S), _.BN2Str(A), _.BN2Str(poolUnits))

        let units = math.calcStakeUnits(a, A.plus(a), v, S.plus(v))
        console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(S.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
        
        let tx = await spartanPools.stake(v, a, { from: acc, value: a })

        assert.equal(_.BN2Str((await spartanPools.poolData()).spartan), _.BN2Str(S.plus(v)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).asset), _.BN2Str(A.plus(a)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).spartanStaked), _.BN2Str(S.plus(v)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).assetStaked), _.BN2Str(A.plus(a)))
        assert.equal(_.BN2Str((await spartanPools.totalSupply())), _.BN2Str(units.plus(poolUnits)), 'poolUnits')
        assert.equal(_.BN2Str(await spartanPools.balanceOf(acc)), _.BN2Str(units), 'units')
        assert.equal(_.BN2Str(await spartan.balanceOf(spartanPools.address)), _.BN2Str(S.plus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(A.plus(a)), 'ether balance')

        let stakeData = (await spartanPools.getMemberData(acc))
        assert.equal(stakeData.spartan, v, 'spartan')
        assert.equal(stakeData.asset, a, 'asset')

        // assert.equal(_.BN2Str(await spartanPools.allowance(acc, spartanPools.address)), _.BN2Str(units), 'units')

        const assetBal = _.BN2Asset(await web3.eth.getBalance(spartanPools.address));
        const spartanBal = _.BN2Asset(await spartan.balanceOf(spartanPools.address));
        console.log(`BALANCES: [ ${assetBal} ETH | ${spartanBal} SPT ]`)
    })
}

async function stakeTKN1(acc, a, v, first, count) {
    it(`It should stake TKN1 from ${acc}`, async () => {
        _stakeTKN(acc, a, v, token1.address, first, count)
    })
}
async function stakeTKN2(acc, a, v, first, count) {
    it(`It should stake TKN2 from ${acc}`, async () => {
        _stakeTKN(acc, a, v, token2.address, first, count)
    })
}

async function _stakeTKN(acc, a, v, addr, first, count) {
    var S; var A;

        console.log('addr', addr)
        console.log(`SPT: ${_.BN2Str(await spartan.balanceOf(spartanPools.address))}`)
        console.log(`TKN1: ${_.BN2Str(await token1.balanceOf(spartanPools.address))}`)
        console.log(`ETH: ${_.BN2Str(await web3.eth.getBalance(spartanPools.address))}`)
        if(first){
            S = _.getBN(0); 
            A = _.getBN(0);
            stakerCount = 0;
            poolUnits = 0;
        } else {
            S = _.getBN((await spartanPools.poolData()).spartan)
            A = _.getBN((await spartanPools.poolData()).asset)
            stakerCount = _.BN2Str((await spartanPools.poolData()).stakerCount)
            poolUnits = _.getBN((await spartanPools.poolData()).poolUnits)
        }
        // console.log('start data', _.BN2Str(S), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let units = math.calcStakeUnits(a, A.plus(a), v, S.plus(v))
        // console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(S.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
        
        let tx = await spartanPools.stake(v, a, { from: acc})

        // assert.equal(_.BN2Str((await spartanPools.poolData()).spartan), S.plus(v))
        assert.equal(_.BN2Str((await spartanPools.poolData()).asset), A.plus(a))
        // assert.equal(_.BN2Str((await spartanPools.poolData()).spartanStaked), S.plus(v))
        assert.equal(_.BN2Str((await spartanPools.poolData()).assetStaked), A.plus(a))
        // assert.equal(_.BN2Str((await spartanPools.poolData()).stakerCount), +stakerCount + 1, 'stakerCount')
        // assert.equal(_.BN2Str((await spartanPools.poolData()).poolUnits), units.plus(poolUnits), 'poolUnits')

        // assert.equal(_.BN2Str(await spartan.balanceOf(spartanPools.address)), _.BN2Str(S.plus(v)), 'spartan balance')
        // assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(A.plus(a)), 'ether balance')

        console.log(`SPT: ${_.BN2Str(await spartan.balanceOf(spartanPools.address))}`)
        console.log(`TKN1: ${_.BN2Str(await token1.balanceOf(spartanPools.address))}`)
        console.log(`ETH: ${_.BN2Str(await web3.eth.getBalance(spartanPools.address))}`)
}

async function unstakeETH(bp, acc) {

    it(`It should unstake ETH for ${acc}`, async () => {
        var S = _.getBN((await spartanPools.poolData()).spartan)
        var A = _.getBN((await spartanPools.poolData()).asset)

        let totalUnits = _.getBN((await spartanPools.totalSupply()))
        let stakeData = (await spartanPools.getMemberData(acc))
        let stakerUnits = _.getBN(await spartanPools.balanceOf(acc))
        let share = (stakerUnits.times(bp)).div(10000)
        let v = _.floorBN((S.times(share)).div(totalUnits))
        let a = _.floorBN((A.times(share)).div(totalUnits))
        console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(v), _.BN2Str(a))
        
        let tx = await spartanPools.unstake(bp, { from: acc})
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputSpartan), _.BN2Str(_.floorBN(v)), 'outputSpartan')
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputAsset), _.BN2Str(_.floorBN(a)), 'outputAsset')
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await spartanPools.totalSupply())), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str((await spartanPools.poolData()).spartan), _.BN2Int(S.minus(v)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).asset), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).spartanStaked), _.BN2Int(S.minus(v)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).assetStaked), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(await spartan.balanceOf(spartanPools.address)), _.BN2Int(S.minus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakeData2 = (await spartanPools.getMemberData(acc))
        // assert.equal(stakeData2.spartan, v, '0')
        // assert.equal(stakeData2.asset, a, '0')
        assert.equal(_.BN2Str(await spartanPools.balanceOf(acc)), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
    })
}

async function unstakeAsym(bp, acc, toSeth) {

    it(`It should assym unstake from ${acc}`, async () => {
        var S = _.getBN((await spartanPools.poolData()).spartan)
        var A = _.getBN((await spartanPools.poolData()).asset)

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

        let tx = await spartanPools.unstakeAsymmetric(bp, toSeth, { from: acc})

        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputSpartan), _.BN2Str(v), 'outputSpartan')
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputAsset), _.BN2Str(a), 'outputAsset')
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await spartanPools.totalSupply())), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str((await spartanPools.poolData()).spartan), S.minus(v))
        assert.equal(_.BN2Str((await spartanPools.poolData()).asset), A.minus(a))
        assert.equal(_.BN2Str((await spartanPools.poolData()).spartanStaked), _.BN2Str(S.minus(v)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).assetStaked), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(await spartan.balanceOf(spartanPools.address)), _.BN2Str(S.minus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakerUnits2 = _.getBN(await spartanPools.balanceOf(acc))
        assert.equal(_.BN2Str(stakerUnits2), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
    })
}

async function unstakeExactAsym(bp, acc, toSeth) {

    it(`It should assym unstake from ${acc}`, async () => {
        var S = _.getBN((await spartanPools.poolData()).spartan)
        var A = _.getBN((await spartanPools.poolData()).asset)

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

        let tx = await spartanPools.unstakeExactAsymmetric(share, toSeth, { from: acc})

        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputSpartan), _.BN2Str(v), 'outputSpartan')
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputAsset), _.BN2Str(a), 'outputAsset')
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await spartanPools.totalSupply())), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str((await spartanPools.poolData()).spartan), S.minus(v))
        assert.equal(_.BN2Str((await spartanPools.poolData()).asset), A.minus(a))
        assert.equal(_.BN2Str((await spartanPools.poolData()).spartanStaked), _.BN2Str(S.minus(v)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).assetStaked), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(await spartan.balanceOf(spartanPools.address)), _.BN2Str(S.minus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakerUnits2 = _.getBN(await spartanPools.balanceOf(acc))
        assert.equal(_.BN2Str(stakerUnits2), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
    })
}

async function unstakeFailExactAsym(bp, acc, toSeth) {

    it(`It should assym unstake from ${acc}`, async () => {
        let stakerUnits = _.getBN(await spartanPools.balanceOf(acc))
        let share = (stakerUnits.times(bp)).div(10000)

        await truffleAssert.reverts(spartanPools.unstakeExactAsymmetric(share, toSeth, { from: acc}))
    })
}

async function unstakeFailStart() {

    it("It should revert if unstaking 0 BP", async () => {
        await truffleAssert.reverts(spartanPools.unstake(0));
    })

    it("It should revert if unstaking 10001 BP", async () => {
        await truffleAssert.reverts(spartanPools.unstake('10001'));
    })

    it("It should revert if unstaking higher units", async () => {
        let units = _.getBN(await spartanPools.balanceOf(acc0))
        let unitsMore = units.plus(1)
        await truffleAssert.reverts(spartanPools.unstakeExact(_.BN2Str(unitsMore)));
    })
}

async function unstakeFailEnd(acc) {

    it("It should revert if unstaking unstaked member", async () => {
        await truffleAssert.reverts(spartanPools.unstake(0, {from: acc}));
    })
    it("It should revert if unstaking assym", async () => {
        await truffleAssert.reverts(spartanPools.unstake(0, {from: acc}));
    })
}

async function unstakeTKN1(bp, acc) {

    it(`It should unstake TKN1 for ${acc}`, async () => {
        _unstakeTKN(bp, acc, token1.address)
    })
}

async function unstakeTKN2(bp, acc) {

    it(`It should unstake TKN2 for ${acc}`, async () => {
        _unstakeTKN(bp, acc, token2.address)
    })
}

async function _unstakeTKN(bp, acc, addr) {

        var S = _.getBN((await spartanPools.poolData()).spartan)
        var A = _.getBN((await spartanPools.poolData()).asset)

        // let stakers = _.BN2Str((await spartanPools.poolData()).stakerCount)
        let totalUnits = _.getBN((await spartanPools.poolData()).poolUnits)
        let stakeData = (await spartanPools.getMemberData(acc))
        let stakerUnits = _.getBN(stakeData.stakeUnits)
        let share = (stakerUnits.times(bp)).div(10000)
        let v = (S.times(share)).div(totalUnits)
        let a = (A.times(share)).div(totalUnits)
        console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(v), _.BN2Str(a))
        
        // assert.equal(stakeData.spartan, _.BN2Str(v), 'spartan')
        // assert.equal(stakeData.asset, _.BN2Str(a), 'asset')
        
        let tx = await spartanPools.unstake(bp, { from: acc})

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputSpartan), _.floorBN(v), 'outputSpartan')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAsset), _.BN2Str(a), 'outputAsset')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await spartanPools.poolData()).poolUnits), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str((await spartanPools.poolData()).spartan), _.BN2Str(S.minus(v)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).asset), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).spartanStaked), _.BN2Str(S.minus(v)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).assetStaked), _.BN2Str(A.minus(a)))
        // assert.equal(_.BN2Str(await spartan.balanceOf(spartanPools.address)), _.BN2Str(S.minus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(A.minus(a)), 'ether balance')
        // assert.equal(_.BN2Str(await spartan.balanceOf(spartanPools.address)), _.BN2Str(S.minus(v)), 'spartan balance')
        // assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakeData2 = (await spartanPools.getMemberData(acc))
        // assert.equal(stakeData.spartan, v, 'spartan')
        // assert.equal(stakeData.asset, a, 'asset')
        assert.equal(_.BN2Str(stakeData2.stakeUnits), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
}

function logETH() {
    it("logs", async () => {
        await help.logPool(spartanPools, _.ETH ,"ETH")
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

function logStaker(acc) {
    it("logs", async () => {
        await help.logStaker(spartanPools, acc, _.ETH)
    })
}