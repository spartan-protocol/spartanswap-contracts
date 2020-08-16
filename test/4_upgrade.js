/*
################################################
Upgrades
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


var spartan; var token1;  var token2; var coreMath; var vFactory;  var vFactory2;
var spartanPools; var spartanPools1; var spartanPools2;
var spartan2Pools; var spartan2Pools1; var spartan2Pools2;
var acc0; var acc1; var acc2; var acc3;

contract('SPARTA', function (accounts) {
    constructor(accounts)
    deployPools()
    stakeETH(acc1, _.BN2Str(_.one * 5), _.BN2Str(_.one * 50))
    logETH()

    stakeTKN1(acc1, _.BN2Str(_.one * 10), _.BN2Str(_.one * 100))
    logTKN1()

    // stakeSendETH2(acc0, _.BN2Str(_.one * 5), 0, false)
    // logETH2()
    // stakeETH2(acc0, _.BN2Str(0), _.BN2Str(_.one * 50), false)
    // logETH2()

    upgradeETH(acc1)
    // logETH2()
    // upgradeTKN(acc0)
    // logTKN1()
    // logTKN2()

    // unstakeETH(10000, acc0)
    // logETH2()
    // unstakeTKN1(10000, acc0)
    // logTKN2()
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
        vFactory2 = await VFACTORY.new(spartan.address, coreMath.address)

        console.log(`Acc0: ${acc0}`)
        console.log(`vFactory: ${vFactory.address}`)
        console.log(`vFactory2: ${vFactory2.address}`)
        console.log(`spartan: ${spartan.address}`)
        console.log(`token1: ${token1.address}`)
        console.log(`coreMath: ${coreMath.address}`)

        let supply = await spartan.totalSupply()
        await spartan.approve(vFactory.address, supply, { from: acc0 })
        await spartan.approve(vFactory2.address, supply, { from: acc0 })
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
    it("It should deploy Eth2 Pool", async () => {
        var POOL2 = await vFactory2.deployPool.call(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        await vFactory2.deployPool(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        spartan2Pools = await VPOOL.at(POOL2)
        console.log(`Pools: ${spartan2Pools.address}`)
        const spartanAddr2 = await spartan2Pools.SPARTAER()
        assert.equal(spartanAddr2, spartan.address, "address is correct")

        let supply = await spartan.totalSupply()
        await spartan.approve(spartan2Pools.address, supply, { from: acc0 })
        await spartan.approve(spartan2Pools.address, supply, { from: acc1 })
        await spartan.addExcluded(spartan2Pools.address, { from: acc1 })
    })

    it("It should deploy TKN1 Pools2", async () => {

        await token1.approve(vFactory2.address, '-1', { from: acc0 })
        var POOL = await vFactory2.deployPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        await vFactory2.deployPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        spartan2Pools1 = await VPOOL.at(POOL)
        console.log(`Pools1: ${spartan2Pools1.address}`)
        const spartanAddr = await spartan2Pools1.SPARTAER()
        assert.equal(spartanAddr, spartan.address, "address is correct")

        await spartan.approve(spartan2Pools1.address, '-1', { from: acc0 })
        await spartan.approve(spartan2Pools1.address, '-1', { from: acc1 })
        await token1.approve(spartan2Pools1.address, '-1', { from: acc0 })
        await token1.approve(spartan2Pools1.address, '-1', { from: acc1 })
        await spartan.addExcluded(spartan2Pools1.address, { from: acc1 })
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

async function stakeSendETH2(acc, a, v, first) {

    it(`It should stake ETH from ${acc}`, async () => {
        // console.log(`testing for ${acc}, ${v}, ${a}, ${first}`)

        const addr = _.ETH
        var V; var A;
        if(first){
            V = _.getBN(0); 
            A = _.getBN(0);
            stakerCount = 0;
            poolUnits = 0;
        } else {
            V = _.getBN((await spartanPools2.poolData(addr)).spartan)
            A = _.getBN((await spartanPools2.poolData(addr)).asset)
            stakerCount = 0 //_.BN2Str((await spartanPools2.poolData(addr)).stakerCount)
            poolUnits = _.getBN((await spartanPools2.poolData(addr)).poolUnits)
        }
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let units = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))
        // console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(V.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
        
        let receipt = await web3.eth.sendTransaction({ from: acc, to: spartanPools2.address, value:a})

        assert.equal((await spartanPools2.arrayPools(0)), addr, 'pools')
        assert.equal(_.BN2Str((await spartanPools2.poolCount())), 1, 'poolCount')
        assert.equal((await spartanPools2.mapPoolStakers(addr, stakerCount)), acc, 'stakers')

        assert.equal(_.BN2Str((await spartanPools2.poolData(addr)).spartan), V.plus(v))
        assert.equal(_.BN2Str((await spartanPools2.poolData(addr)).asset), A.plus(a))
        assert.equal(_.BN2Str((await spartanPools2.poolData(addr)).spartanStaked), V.plus(v))
        assert.equal(_.BN2Str((await spartanPools2.poolData(addr)).assetStaked), A.plus(a))
        assert.equal(_.BN2Str((await spartanPools2.poolData(addr)).stakerCount), +stakerCount + 1, 'stakerCount')
        assert.equal(_.BN2Str((await spartanPools2.poolData(addr)).poolUnits), units.plus(poolUnits), 'poolUnits')

        assert.equal(_.BN2Str(await spartan.balanceOf(spartanPools2.address)), _.BN2Str(V.plus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools2.address)), _.BN2Str(A.plus(a)), 'ether balance')
    })
}

async function upgradeETH(acc) {

    it(`It should upgrade ETH`, async () => {

        V = _.getBN((await spartan2Pools.poolData()).spartan)
        A = _.getBN((await spartan2Pools.poolData()).asset)
        v = _.getBN(await spartanPools.getStakerShareSparta(acc))
        a = _.getBN(await spartanPools.getStakerShareAsset(acc))
        poolUnits = _.getBN((await spartan2Pools.totalSupply()))
        console.log(_.BN2Str(v), _.BN2Str(V), _.BN2Str(a), _.BN2Str(A))

        let units = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))

        let tx = await spartanPools.upgrade(spartan2Pools.address, {from:acc})
        // console.log(tx.receipt.logs)

        assert.equal(_.BN2Str((await spartan2Pools.poolData()).spartan), V.plus(v))
        assert.equal(_.BN2Str((await spartan2Pools.poolData()).asset), _.BN2Str(A.plus(a)))
        assert.equal(_.BN2Str((await spartan2Pools.poolData()).spartanStaked), V.plus(v))
        assert.equal(_.BN2Str((await spartan2Pools.poolData()).assetStaked), A.plus(a))
        assert.equal(_.BN2Str((await spartan2Pools.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')

        assert.equal(_.BN2Str(await spartan.balanceOf(spartan2Pools.address)), _.BN2Str(V.plus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(spartan2Pools.address)), _.BN2Str(A.plus(a)), 'ether balance')
    })
}

async function upgradeTKN(acc) {

    it(`It should upgrade TKN1`, async () => {

    V = _.getBN((await spartan2Pools.poolData()).spartan)
    A = _.getBN((await spartan2Pools.poolData()).asset)
    v = _.getBN(await spartanPools.getStakerShareSparta(acc))
    a = _.getBN(await spartanPools.getStakerShareAsset(acc))
    poolUnits = _.getBN((await spartan2Pools1.totalSupply()))
    console.log(_.BN2Str(v), _.BN2Str(V), _.BN2Str(a), _.BN2Str(A))

    let units = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))

    let tx = await spartanPools.upgrade(spartan2Pools.address, {from:acc})
    // console.log(tx.receipt.logs)

    assert.equal(_.BN2Str((await spartan2Pools.poolData()).spartan), V.plus(v))
    assert.equal(_.BN2Str((await spartan2Pools.poolData()).asset), _.BN2Str(A.plus(a)))
    assert.equal(_.BN2Str((await spartan2Pools.poolData()).spartanStaked), V.plus(v))
    assert.equal(_.BN2Str((await spartan2Pools.poolData()).assetStaked), A.plus(a))
    assert.equal(_.BN2Str((await spartan2Pools.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')

    assert.equal(_.BN2Str(await spartan.balanceOf(spartan2Pools.address)), _.BN2Str(V.plus(v)), 'spartan balance')
    assert.equal(_.BN2Str(await web3.eth.getBalance(spartan2Pools.address)), _.BN2Str(A.plus(a)), 'ether balance')
})
}

async function unstakeETH(bp, acc) {

    it(`It should unstake ETH for ${acc}`, async () => {
        const addr = _.ETH
        let spartanPools = spartanPools2
        var V = _.getBN((await spartanPools.poolData(addr)).spartan)
        var A = _.getBN((await spartanPools.poolData(addr)).asset)

        // let stakers = _.BN2Str((await spartanPools.poolData(addr)).stakerCount)
        let totalUnits = _.getBN((await spartanPools.poolData(addr)).poolUnits)
        let stakeData = (await spartanPools.getMemberStakeData(acc, addr))
        let stakerUnits = _.getBN(stakeData.stakeUnits)
        let share = (stakerUnits.times(bp)).div(10000)
        let v = (V.times(share)).div(totalUnits)
        let a = (A.times(share)).div(totalUnits)
        console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(v), _.BN2Str(a))
        
        // assert.equal(stakeData.spartan, _.BN2Str(v), 'spartan')
        // assert.equal(stakeData.asset, _.BN2Str(a), 'asset')
        
        let tx = await spartanPools.unstake(bp, addr, { from: acc})

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputSparta), _.BN2Str(v), 'outputSparta')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAsset), _.BN2Str(a), 'outputAsset')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await spartanPools.poolData(addr)).poolUnits), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str((await spartanPools.poolData(addr)).spartan), V.minus(v))
        assert.equal(_.BN2Str((await spartanPools.poolData(addr)).asset), A.minus(a))
        assert.equal(_.BN2Str((await spartanPools.poolData(addr)).spartanStaked), V.minus(v))
        assert.equal(_.BN2Str((await spartanPools.poolData(addr)).assetStaked), _.BN2Str(A.minus(a)))
        // assert.equal(_.BN2Str(await spartan.balanceOf(spartanPools.address)), _.BN2Str(V.minus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(A.minus(a)), 'ether balance')
        // assert.equal(_.BN2Str(await spartan.balanceOf(spartanPools.address)), _.BN2Str(V.minus(v)), 'spartan balance')
        // assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakeData2 = (await spartanPools.getMemberStakeData(acc, addr))
        // assert.equal(stakeData.spartan, v, 'spartan')
        // assert.equal(stakeData.asset, a, 'asset')
        assert.equal(_.BN2Str(stakeData2.stakeUnits), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
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

        var V = _.getBN((await spartanPools2.poolData(addr)).spartan)
        var A = _.getBN((await spartanPools2.poolData(addr)).asset)

        // let stakers = _.BN2Str((await spartanPools.poolData(addr)).stakerCount)
        let totalUnits = _.getBN((await spartanPools2.poolData(addr)).poolUnits)
        let stakeData = (await spartanPools2.getMemberStakeData(acc, addr))
        let stakerUnits = _.getBN(stakeData.stakeUnits)
        let share = (stakerUnits.times(bp)).div(10000)
        let v = (V.times(share)).div(totalUnits)
        let a = (A.times(share)).div(totalUnits)
        console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(v), _.BN2Str(a))
        
        // assert.equal(stakeData.spartan, _.BN2Str(v), 'spartan')
        // assert.equal(stakeData.asset, _.BN2Str(a), 'asset')
        
        let tx = await spartanPools2.unstake(bp, addr, { from: acc})

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputSparta), _.floorBN(v), 'outputSparta')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAsset), _.BN2Str(a), 'outputAsset')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await spartanPools2.poolData(addr)).poolUnits), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str((await spartanPools2.poolData(addr)).spartan), _.BN2Str(V.minus(v)))
        assert.equal(_.BN2Str((await spartanPools2.poolData(addr)).asset), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str((await spartanPools2.poolData(addr)).spartanStaked), _.BN2Str(V.minus(v)))
        assert.equal(_.BN2Str((await spartanPools2.poolData(addr)).assetStaked), _.BN2Str(A.minus(a)))
        // assert.equal(_.BN2Str(await spartan.balanceOf(spartanPools.address)), _.BN2Str(V.minus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools2.address)), _.BN2Str(A.minus(a)), 'ether balance')
        // assert.equal(_.BN2Str(await spartan.balanceOf(spartanPools.address)), _.BN2Str(V.minus(v)), 'spartan balance')
        // assert.equal(_.BN2Str(await web3.eth.getBalance(spartanPools.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakeData2 = (await spartanPools2.getMemberStakeData(acc, addr))
        // assert.equal(stakeData.spartan, v, 'spartan')
        // assert.equal(stakeData.asset, a, 'asset')
        assert.equal(_.BN2Str(stakeData2.stakeUnits), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
}


function logETH() {
    it("logs", async () => {
        await help.logPool(spartanPools, _.ETH, 'ETH')
    })
}
function logETH2() {
    it("logs", async () => {
        await help.logPool(spartanPools2, _.ETH, 'ETH')
    })
}

function logTKN1() {
    it("logs", async () => {
        await help.logPool(spartanPools, token1.address, 'TKN1')
    })
}
function logTKN2() {
    it("logs", async () => {
        await help.logPool(spartanPools2, token1.address, 'TKN1')
    })
}



