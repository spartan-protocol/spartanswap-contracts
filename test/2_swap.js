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

var SPARTAER = artifacts.require("Sparta");
var VFACTORY = artifacts.require("./VFactory.sol");
var VPOOL = artifacts.require("./VPool.sol");
var TOKEN1 = artifacts.require("Token1");
var TOKEN2 = artifacts.require("Token2");
var MATH = artifacts.require("MathContract");

var spartan; var token1;  var token2; var coreMath; var vFactory;
var spartanPools; var spartanPools1; var spartanPools2;
var acc0; var acc1; var acc2; var acc3;

contract('SPARTA', function (accounts) {
    constructor(accounts)
    deployPools()

    stakeETH(acc1, _.BN2Str(_.one * 10), _.dot1BN)

    // Single swap
    swapSPARTAToETH(acc0, _.BN2Str(_.one * 10))
    swapETHToSPARTA(acc0, _.BN2Str(_.one * 1))

    stakeTKN1(acc1, _.BN2Str(_.one * 10), _.BN2Str(_.one * 100))

    // // Double swap
    swapTKN1ToETH(acc0, _.BN2Str(_.one * 10))
    swapETHToTKN1(acc0, _.BN2Str(_.one * 1))

    stakeTKN2(acc1, _.BN2Str(_.one * 10), _.BN2Str(_.one * 100))

    // // // Double swap back
    swapTKN2ToETH(acc0, _.BN2Str(_.one * 10))
    swapETHToTKN2(acc0, _.BN2Str(_.one * 1))

    unstakeETH(10000, acc0)
    unstakeTKN1(10000, acc1)
    unstakeTKN2(10000, acc1)
})


//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
        spartan = await SPARTAER.new()
        coreMath = await MATH.new()
        token1 = await TOKEN1.new();
        token2 = await TOKEN1.new();
        vFactory = await VFACTORY.new(spartan.address, coreMath.address)

        console.log(`Acc0: ${acc0}`)
        console.log(`vFactory: ${vFactory.address}`)
        console.log(`spartan: ${spartan.address}`)
        console.log(`token1: ${token1.address}`)
        console.log(`coreMath: ${coreMath.address}`)

        let supply = await spartan.totalSupply()
        await spartan.approve(vFactory.address, supply, { from: acc0 })
        await spartan.transfer(acc1, _.getBN(_.BN2Int(supply)/2))
        let supplyT1 = await token1.totalSupply()
        await token1.transfer(acc1, _.getBN(_.BN2Int(supplyT1)/2))
        await token2.transfer(acc1, _.getBN(_.BN2Int(supplyT1)/2))
        await token1.approve(vFactory.address, supply, { from: acc0 })
        await token1.approve(vFactory.address, supply, { from: acc1 })
        await token2.approve(vFactory.address, supply, { from: acc0 })
        await token2.approve(vFactory.address, supply, { from: acc1 })
    });
}

async function deployPools() {
    it("It should deploy Eth Pool", async () => {
        var POOL = await vFactory.deployPool.call(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        await vFactory.deployPool(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        spartanPools = await VPOOL.at(POOL)
        console.log(`Pools: ${spartanPools.address}`)
        const spartanAddr = await spartanPools.SPARTAER()
        assert.equal(spartanAddr, spartan.address, "address is correct")

        let supply = await spartan.totalSupply()
        await spartan.approve(spartanPools.address, supply, { from: acc0 })
        await spartan.approve(spartanPools.address, supply, { from: acc1 })
        await spartan.addExcluded(spartanPools.address, { from: acc1 })
    })

    it("It should deploy TKN1 Pools", async () => {

        await token1.approve(vFactory.address, '-1', { from: acc0 })
        var POOL = await vFactory.deployPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        await vFactory.deployPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        spartanPools1 = await VPOOL.at(POOL)
        console.log(`Pools1: ${spartanPools1.address}`)
        const spartanAddr = await spartanPools1.SPARTAER()
        assert.equal(spartanAddr, spartan.address, "address is correct")

        await spartan.approve(spartanPools1.address, '-1', { from: acc0 })
        await spartan.approve(spartanPools1.address, '-1', { from: acc1 })
        await token1.approve(spartanPools1.address, '-1', { from: acc0 })
        await token1.approve(spartanPools1.address, '-1', { from: acc1 })
        await spartan.addExcluded(spartanPools1.address, { from: acc1 })
    })
    it("It should deploy TKN2 Pools", async () => {

        await token2.approve(vFactory.address, '-1', { from: acc0 })
        var POOL = await vFactory.deployPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token2.address)
        await vFactory.deployPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token2.address)
        spartanPools2 = await VPOOL.at(POOL)
        console.log(`Pools2: ${spartanPools2.address}`)
        const spartanAddr = await spartanPools2.SPARTAER()
        assert.equal(spartanAddr, spartan.address, "address is correct")

        await spartan.approve(spartanPools2.address, '-1', { from: acc0 })
        await spartan.approve(spartanPools2.address, '-1', { from: acc1 })
        await token2.approve(spartanPools2.address, '-1', { from: acc0 })
        await token2.approve(spartanPools2.address, '-1', { from: acc1 })
        await spartan.addExcluded(spartanPools2.address, { from: acc1 })
    })
}

async function stakeETH(acc, v, a) {

    it(`It should stake ETH from ${acc}`, async () => {

        var V = _.getBN((await spartanPools.poolData()).spartan)
        var A = _.getBN((await spartanPools.poolData()).asset)
        poolUnits = _.getBN((await spartanPools.totalSupply()))
        console.log('start data', _.BN2Str(V), _.BN2Str(A), _.BN2Str(poolUnits))

        let units = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))
        console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(V.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
        
        let tx = await spartanPools.stake(v, a, { from: acc, value: a })

        assert.equal(_.BN2Str((await spartanPools.poolData()).spartan), _.BN2Str(V.plus(v)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).asset), _.BN2Str(A.plus(a)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).spartanStaked), _.BN2Str(V.plus(v)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).assetStaked), _.BN2Str(A.plus(a)))
        assert.equal(_.BN2Str((await spartanPools.totalSupply())), _.BN2Str(units.plus(poolUnits)), 'poolUnits')
        assert.equal(_.BN2Str(await spartanPools.balanceOf(acc)), _.BN2Str(units), 'units')
        assert.equal(_.BN2Str(await spartan.balanceOf(spartanPools.address)), _.BN2Str(V.plus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(A.plus(a)), 'ether balance')

        let stakeData = (await spartanPools.getMemberData(acc))
        assert.equal(stakeData.spartan, v, 'spartan')
        assert.equal(stakeData.asset, a, 'asset')

        // assert.equal(_.BN2Str(await spartanPools.allowance(acc, spartanPools.address)), _.BN2Str(units), 'units')

        const assetBal = _.BN2Asset(await web3.eth.getBalance(spartanPools.address));
        const spartanBal = _.BN2Asset(await spartan.balanceOf(spartanPools.address));
        console.log(`BALANCES: [ ${assetBal} ETH | ${spartanBal} SPARTA ]`)
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
    var V = _.getBN((await pools.poolData()).spartan)
    var A = _.getBN((await pools.poolData()).asset)
    poolUnits = _.getBN((await pools.totalSupply()))
    console.log('start data', _.BN2Str(V), _.BN2Str(A), _.BN2Str(poolUnits))

    let units = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))
    console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(V.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
    
    let tx = await pools.stake(v, a, {from: acc})
    // console.log(tx.receipt.logs)
    assert.equal(_.BN2Str((await pools.poolData()).spartan), _.BN2Str(V.plus(v)))
    assert.equal(_.BN2Str((await pools.poolData()).asset), _.BN2Str(A.plus(a)))
    assert.equal(_.BN2Str((await pools.poolData()).spartanStaked), _.BN2Str(V.plus(v)))
    assert.equal(_.BN2Str((await pools.poolData()).assetStaked), _.BN2Str(A.plus(a)))
    assert.equal(_.BN2Str((await pools.totalSupply())), _.BN2Str(units.plus(poolUnits)), 'poolUnits')
    assert.equal(_.BN2Str(await pools.balanceOf(acc)), _.BN2Str(units), 'units')
    assert.equal(_.BN2Str(await spartan.balanceOf(pools.address)), _.BN2Str(V.plus(v)), 'spartan balance')
    assert.equal(_.BN2Str(await token.balanceOf(pools.address)), _.BN2Str(A.plus(a)), 'ether balance')

    let stakeData = (await pools.getMemberData(acc))
    assert.equal(stakeData.spartan, v, 'spartan')
    assert.equal(stakeData.asset, a, 'asset')
}


async function swapSPARTAToETH(acc, v) {

    it(`It should buy ETH with SPARTA from ${acc}`, async () => {

        const V = _.getBN((await spartanPools.poolData()).spartan)
        const A = _.getBN((await spartanPools.poolData()).asset)
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let a = math.calcSwapOutput(v, V, A)
        let fee = math.calcSwapFee(v, V, A)
        // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
        
        let tx = await spartanPools.buy(v)

        assert.equal(_.BN2Str(tx.receipt.logs[1].args.inputAmount), _.BN2Str(v))
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputAmount), _.BN2Str(a))
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str((await spartanPools.poolData()).asset), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).spartan), _.BN2Str(V.plus(v)))

        assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(A.minus(a)), 'ether balance')
        assert.equal(_.BN2Str(await spartan.balanceOf(spartanPools.address)), _.BN2Str(V.plus(v)), 'spartan balance')

        await help.logPool(spartanPools, _.ETH, 'ETH')
    })
}

async function swapETHToSPARTA(acc, a) {

    it(`It should sell ETH to SPARTA from ${acc}`, async () => {

        await spartan.addExcluded(spartanPools.address, { from: acc1 })

        const V = _.getBN((await spartanPools.poolData()).spartan)
        const A = _.getBN((await spartanPools.poolData()).asset)
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let v = math.calcSwapOutput(a, A, V)
        let fee = math.calcSwapFee(a, A, V)
        // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
        
        let tx = await spartanPools.sell(a, { from: acc, value: a })

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(a))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(v))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str((await spartanPools.poolData()).asset), _.BN2Str(A.plus(a)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).spartan), _.BN2Str(V.minus(v)))

        assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(A.plus(a)), 'ether balance')
        // assert.equal(_.BN2Str(await spartan.balanceOf(spartanPools.address)), _.BN2Str(V.minus(v)), 'spartan balance')

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

        const toAsset = _.ETH
        const X = _.getBN((await pools.poolData()).asset)
        const Y = _.getBN((await pools.poolData()).spartan)
        const V = _.getBN((await spartanPools.poolData()).spartan)
        const Z = _.getBN((await spartanPools.poolData()).asset)
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let y = math.calcSwapOutput(x, X, Y)
        let feey = math.calcSwapFee(x, X, Y)
        let z = math.calcSwapOutput(y, V, Z)
        let feez = math.calcSwapFee(y, V, Z)
        let fee = math.calcValueIn(feey, V.plus(y), Z.minus(z)).plus(feez)
        // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
        
        let tx = await pools.swap(x, toAsset)
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.inputAmount), _.BN2Str(x))
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.transferAmount), _.BN2Str(0))
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputAmount), _.BN2Str(y))
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.fee), _.BN2Str(feey))
        assert.equal(_.BN2Str(tx.receipt.logs[4].args.inputAmount), _.BN2Str(y))
        assert.equal(_.BN2Str(tx.receipt.logs[4].args.transferAmount), _.BN2Str(0))
        assert.equal(_.BN2Str(tx.receipt.logs[4].args.outputAmount), _.BN2Str(z))
        assert.equal(_.BN2Str(tx.receipt.logs[4].args.fee), _.BN2Str(feez))

        assert.equal(_.BN2Str((await pools.poolData()).asset), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str((await pools.poolData()).spartan), _.BN2Str(Y.minus(y)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).spartan), _.BN2Str(V.plus(y)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).asset), _.BN2Str(Z.minus(z)))

        assert.equal(_.BN2Str(await token.balanceOf(pools.address)), _.BN2Str(X.plus(x)), 'token1 balance')
        assert.equal(_.BN2Str(await spartan.balanceOf(pools.address)), _.BN2Str(Y.minus(y)), 'spartan balance')
        assert.equal(_.BN2Str(await spartan.balanceOf(spartanPools.address)), _.BN2Str(V.plus(y)), 'spartan balance eth')
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

    const X = _.getBN((await spartanPools.poolData()).asset)
    const Y = _.getBN((await spartanPools.poolData()).spartan)
    const V = _.getBN((await pools.poolData()).spartan)
    const Z = _.getBN((await pools.poolData()).asset)
    // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

    let y = math.calcSwapOutput(x, X, Y)
    let feey = math.calcSwapFee(x, X, Y)
    let z = math.calcSwapOutput(y, V, Z)
    let feez = math.calcSwapFee(y, V, Z)
    let fee = math.calcValueIn(feey, V.plus(y), Z.minus(z)).plus(feez)
    // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
    
    let tx = await spartanPools.swap(x, token.address, {from:acc, value: x})

    assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(x))
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.transferAmount), _.BN2Str(0))
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(y))
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(feey))
    assert.equal(_.BN2Str(tx.receipt.logs[3].args.inputAmount), _.BN2Str(y))
    assert.equal(_.BN2Str(tx.receipt.logs[3].args.transferAmount), _.BN2Str(0))
    assert.equal(_.BN2Str(tx.receipt.logs[3].args.outputAmount), _.BN2Str(z))
    assert.equal(_.BN2Str(tx.receipt.logs[3].args.fee), _.BN2Str(feez))

    assert.equal(_.BN2Str((await spartanPools.poolData()).asset), _.BN2Str(X.plus(x)))
    assert.equal(_.BN2Str((await spartanPools.poolData()).spartan), _.BN2Str(Y.minus(y)))
    assert.equal(_.BN2Str((await pools.poolData()).spartan), _.BN2Str(V.plus(y)))
    assert.equal(_.BN2Str((await pools.poolData()).asset), _.BN2Str(Z.minus(z)))

    assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(X.plus(x)), 'token1 balance')
    assert.equal(_.BN2Str(await spartan.balanceOf(spartanPools.address)), _.BN2Str(Y.minus(y)), 'spartan balance')
    assert.equal(_.BN2Str(await spartan.balanceOf(pools.address)), _.BN2Str(V.plus(y)), 'spartan balance eth')
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

        var V = _.getBN((await spartanPools.poolData()).spartan)
        var A = _.getBN((await spartanPools.poolData()).asset)

        let totalUnits = _.getBN((await spartanPools.totalSupply()))
        let stakerUnits = _.getBN(await spartanPools.balanceOf(acc))
        let share = (stakerUnits.times(bp)).div(10000)
        let v = _.floorBN((V.times(share)).div(totalUnits))
        let a = _.floorBN((A.times(share)).div(totalUnits))
        // let vs = (await spartanPools.poolData()).spartanStaked
        // let as = (await spartanPools.poolData()).assetStaked
        // let vsShare = _.floorBN((V.times(share)).div(totalUnits))
        // let asShare = _.floorBN((A.times(share)).div(totalUnits))
        console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(v), _.BN2Str(a))
        
        let tx = await spartanPools.unstake(bp, { from: acc})

        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputSparta), _.BN2Str(v), 'outputSparta')
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputAsset), _.BN2Str(a), 'outputAsset')
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await spartanPools.totalSupply())), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str((await spartanPools.poolData()).spartan), _.BN2Str(V.minus(v)))
        assert.equal(_.BN2Str((await spartanPools.poolData()).asset), _.BN2Str(A.minus(a)))
        // assert.equal(_.BN2Str((await spartanPools.poolData()).spartanStaked), _.BN2Str(V.minus(v)))
        // assert.equal(_.BN2Str((await spartanPools.poolData()).assetStaked), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(await spartan.balanceOf(spartanPools.address)), _.BN2Str(V.minus(v)), 'spartan balance')
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

        var V = _.getBN((await pools.poolData()).spartan)
        var A = _.getBN((await pools.poolData()).asset)

        let totalUnits = _.getBN((await pools.totalSupply()))
        let stakerUnits = _.getBN(await pools.balanceOf(acc))
        let share = (stakerUnits.times(bp)).div(10000)
        let v = _.floorBN((V.times(share)).div(totalUnits))
        let a = _.floorBN((A.times(share)).div(totalUnits))
        console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(v), _.BN2Str(a))
        
        let tx = await pools.unstake(bp, { from: acc})

        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputSparta), _.BN2Str(v), 'outputSparta')
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputAsset), _.BN2Str(a), 'outputAsset')
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await pools.totalSupply())), _.BN2Str(totalUnits.minus(share)), 'poolUnits')

        assert.equal(_.BN2Str((await pools.poolData()).spartan), _.BN2Str(V.minus(v)))
        assert.equal(_.BN2Str((await pools.poolData()).asset), _.BN2Str(A.minus(a)))
        // assert.equal(_.BN2Str((await pools.poolData()).spartanStaked), _.BN2Str(V.minus(v)))
        // assert.equal(_.BN2Str((await pools.poolData()).assetStaked), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(await spartan.balanceOf(pools.address)), _.BN2Str(V.minus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await token.balanceOf(pools.address)), _.BN2Str(A.minus(a)), 'asset balance')

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
        let poolROI = await spartanPools.getPoolROI(_.ETH)
        console.log('poolROI', _.BN2Str(poolROI))
        let memberROI0 = await spartanPools.getMemberROI(acc0, _.ETH)
        console.log('memberROI0', _.BN2Str(memberROI0))
        let memberROI1 = await spartanPools.getMemberROI(acc1, _.ETH)
        console.log('memberROI1', _.BN2Str(memberROI1))

        let assetStaked = _.BN2Str((await spartanPools.poolData(_.ETH)).assetStaked)
        console.log('assetStaked', _.BN2Asset(assetStaked))
        let _assetStakedInSparta = _.BN2Str((await spartanPools.calcValueInSparta(assetStaked, _.ETH)))
        console.log('assetStakedInSparta', _.BN2Asset(_assetStakedInSparta))
    })
}

