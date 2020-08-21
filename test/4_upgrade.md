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

var SPARTA = artifacts.require("./Sparta.sol");
var SROUTER = artifacts.require("./SRouter.sol");
var SPOOL = artifacts.require("./SPool.sol");
var MATH = artifacts.require("MathContract");
var TOKEN1 = artifacts.require("./Token1.sol");


var spartan; var token1;  var token2; var coreMath; var sRouter;  var sRouter2;
var sPool1ETH; var sPool1Tkn1;
var sPool2ETH; var sPool2Tkn1;
var acc0; var acc1; var acc2; var acc3;

contract('SPARTA', function (accounts) {
    constructor(accounts)
    upgrade()
    createPool1()
    createPool2()
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
        sparta = await SPARTA.new()
        coreMath = await MATH.new()
        token1 = await TOKEN1.new();
        token2 = await TOKEN1.new();
        sRouter = await SROUTER.new(sparta.address, coreMath.address)
        sRouter2 = await SROUTER.new(sparta.address, coreMath.address)

        console.log(`Acc0: ${acc0}`)
        console.log(`sparta: ${sparta.address}`)
        console.log(`token1: ${token1.address}`)
        console.log(`coreMath: ${coreMath.address}`)
        console.log(`sRouter: ${sRouter.address}`)

        let supplyT1 = await token1.totalSupply()
        await token1.transfer(acc1, _.getBN(_.BN2Int(supplyT1)/2))
        await token1.approve(sRouter.address, supplyT1, { from: acc0 })
        await token1.approve(sRouter.address, supplyT1, { from: acc1 })
        await token1.approve(sRouter2.address, supplyT1, { from: acc0 })
        await token1.approve(sRouter2.address, supplyT1, { from: acc1 })
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
      await sparta.approve(sRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
      await sparta.approve(sRouter.address, _.BN2Str(500000 * _.one), { from: acc1 })
      await sparta.approve(sRouter2.address, _.BN2Str(500000 * _.one), { from: acc0 })
      await sparta.approve(sRouter2.address, _.BN2Str(500000 * _.one), { from: acc1 })
    });
}

async function createPool1() {
    it("It should deploy Eth Pool", async () => {
        var POOL = await sRouter.createPool.call(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        await sRouter.createPool(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        sPool1ETH = await SPOOL.at(POOL)
        console.log(`Pools: ${sPool1ETH.address}`)
        const spartanAddr = await sPool1ETH.SPARTA()
        assert.equal(spartanAddr, sparta.address, "address is correct")
        assert.equal(_.BN2Str(await sparta.balanceOf(sPool1ETH.address)), _.BN2Str(_.one * 10), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(sPool1ETH.address)), _.BN2Str(_.dot1BN), 'ether balance')

        let supply = await sparta.totalSupply()
        await sparta.approve(sPool1ETH.address, supply, { from: acc0 })
        await sparta.approve(sPool1ETH.address, supply, { from: acc1 })
    })

    it("It should deploy TKN1 Pools", async () => {

        await token1.approve(sRouter.address, '-1', { from: acc0 })
        var POOL = await sRouter.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        await sRouter.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        sPool1Tkn1 = await SPOOL.at(POOL)
        console.log(`Pools1: ${sPool1Tkn1.address}`)
        const spartanAddr = await sPool1Tkn1.SPARTA()
        assert.equal(spartanAddr, sparta.address, "address is correct")

        await sparta.approve(sPool1Tkn1.address, '-1', { from: acc0 })
        await sparta.approve(sPool1Tkn1.address, '-1', { from: acc1 })
        await token1.approve(sPool1Tkn1.address, '-1', { from: acc0 })
        await token1.approve(sPool1Tkn1.address, '-1', { from: acc1 })
    })
}

async function createPool2() {
    it("It should deploy Eth Pool", async () => {
        var POOL = await sRouter2.createPool.call(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        await sRouter2.createPool(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        sPool2ETH = await SPOOL.at(POOL)
        console.log(`Pools: ${sPool2ETH.address}`)
        const spartanAddr = await sPool2ETH.SPARTA()
        assert.equal(spartanAddr, sparta.address, "address is correct")
        assert.equal(_.BN2Str(await sparta.balanceOf(sPool1ETH.address)), _.BN2Str(_.one * 10), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(sPool1ETH.address)), _.BN2Str(_.dot1BN), 'ether balance')

        let supply = await sparta.totalSupply()
        await sparta.approve(sPool2ETH.address, supply, { from: acc0 })
        await sparta.approve(sPool2ETH.address, supply, { from: acc1 })
    })

    it("It should deploy TKN1 Pools", async () => {

        await token1.approve(sRouter2.address, '-1', { from: acc0 })
        var POOL = await sRouter2.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        await sRouter2.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        sPool2Tkn1 = await SPOOL.at(POOL)
        console.log(`Pools1: ${sPool2Tkn1.address}`)
        const spartanAddr = await sPool2Tkn1.SPARTA()
        assert.equal(spartanAddr, sparta.address, "address is correct")

        await sparta.approve(sPool2Tkn1.address, '-1', { from: acc0 })
        await sparta.approve(sPool2Tkn1.address, '-1', { from: acc1 })
        await token1.approve(sPool2Tkn1.address, '-1', { from: acc0 })
        await token1.approve(sPool2Tkn1.address, '-1', { from: acc1 })
    })
}


async function stakeETH(acc, v, a) {

    it(`It should stake ETH from ${acc}`, async () => {

        var S = _.getBN((await sPool1ETH.poolData()).baseAmt)
        var A = _.getBN((await sPool1ETH.poolData()).tokenAmt)
        poolUnits = _.getBN((await sPool1ETH.totalSupply()))
        console.log('start data', _.BN2Str(S), _.BN2Str(A), _.BN2Str(poolUnits))

        let units = math.calcStakeUnits(a, A.plus(a), v, S.plus(v))
        console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(S.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
        
        let tx = await sRouter.stake(v, a, _.ETH, { from: acc, value: a })

        // assert.equal(_.BN2Str((await sPool1ETH.poolData()).baseAmt), _.BN2Str(S.plus(v)))
        // assert.equal(_.BN2Str((await sPool1ETH.poolData()).tokenAmt), _.BN2Str(A.plus(a)))
        // assert.equal(_.BN2Str((await sPool1ETH.poolData()).spartaStaked), _.BN2Str(S.plus(v)))
        // assert.equal(_.BN2Str((await sPool1ETH.poolData()).tokenStaked), _.BN2Str(A.plus(a)))
        // assert.equal(_.BN2Str((await sPool1ETH.totalSupply())), _.BN2Str(units.plus(poolUnits)), 'poolUnits')
        // assert.equal(_.BN2Str(await sPool1ETH.balanceOf(acc)), _.BN2Str(units), 'units')
        // assert.equal(_.BN2Str(await sparta.balanceOf(sPool1ETH.address)), _.BN2Str(S.plus(v)), 'spartan balance')
        // assert.equal(_.BN2Str(await web3.eth.getBalance(sPool1ETH.address)), _.BN2Str(A.plus(a)), 'ether balance')

        let stakeData = (await sPool1ETH.getMemberData(acc))
        assert.equal(stakeData.baseAmt, v, 'spartan')
        assert.equal(stakeData.tokenAmt, a, 'token')

        // assert.equal(_.BN2Str(await sPool1ETH.allowance(acc, sPool1ETH.address)), _.BN2Str(units), 'units')

        const tokenBal = _.BN2Token(await web3.eth.getBalance(sPool1ETH.address));
        const spartanBal = _.BN2Token(await sparta.balanceOf(sPool1ETH.address));
        console.log(`BALANCES: [ ${tokenBal} ETH | ${spartanBal} SPT ]`)
    })
}

async function stakeTKN1(acc, a, v) {
    it(`It should stake TKN1 from ${acc}`, async () => {
        await _stakeTKN(acc, a, v, token1, sPool1Tkn1)
        await help.logPool(sPool1Tkn1, token1.address, 'TKN1')
    })
}


async function _stakeTKN(acc, a, v, token, pools) {
    var V = _.getBN((await pools.poolData()).baseAmt)
    var A = _.getBN((await pools.poolData()).tokenAmt)
    poolUnits = _.getBN((await pools.totalSupply()))
    console.log('start data', _.BN2Str(V), _.BN2Str(A), _.BN2Str(poolUnits))

    let units = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))
    console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(V.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
    
    let tx = await sRouter.stake(v, a, token.address, {from: acc})
    // console.log(tx.receipt.logs)
    // assert.equal(_.BN2Str((await pools.poolData()).baseAmt), _.BN2Str(V.plus(v)))
    // assert.equal(_.BN2Str((await pools.poolData()).tokenAmt), _.BN2Str(A.plus(a)))
    // assert.equal(_.BN2Str((await pools.poolData()).spartaStaked), _.BN2Str(V.plus(v)))
    // assert.equal(_.BN2Str((await pools.poolData()).tokenStaked), _.BN2Str(A.plus(a)))
    // assert.equal(_.BN2Str((await pools.totalSupply())), _.BN2Str(units.plus(poolUnits)), 'poolUnits')
    // assert.equal(_.BN2Str(await pools.balanceOf(acc)), _.BN2Str(units), 'units')
    // assert.equal(_.BN2Str(await sparta.balanceOf(pools.address)), _.BN2Str(V.plus(v)), 'spartan balance')
    // assert.equal(_.BN2Str(await token.balanceOf(pools.address)), _.BN2Str(A.plus(a)), 'ether balance')

    let stakeData = (await pools.getMemberData(acc))
    assert.equal(stakeData.baseAmt, v, 'spartan')
    assert.equal(stakeData.tokenAmt, a, 'token')
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
            V = _.getBN((await sPool1ETH2.poolData(addr)).baseAmt)
            A = _.getBN((await sPool1ETH2.poolData(addr)).tokenAmt)
            stakerCount = 0 //_.BN2Str((await sPool1ETH2.poolData(addr)).stakerCount)
            poolUnits = _.getBN((await sPool1ETH2.poolData(addr)).poolUnits)
        }
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let units = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))
        // console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(V.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
        
        let receipt = await web3.eth.sendTransaction({ from: acc, to: sPool1ETH2.address, value:a})

        assert.equal((await sPool1ETH2.arrayPools(0)), addr, 'pools')
        assert.equal(_.BN2Str((await sPool1ETH2.poolCount())), 1, 'poolCount')
        assert.equal((await sPool1ETH2.mapPoolStakers(addr, stakerCount)), acc, 'stakers')

        assert.equal(_.BN2Str((await sPool1ETH2.poolData(addr)).baseAmt), V.plus(v))
        assert.equal(_.BN2Str((await sPool1ETH2.poolData(addr)).tokenAmt), A.plus(a))
        assert.equal(_.BN2Str((await sPool1ETH2.poolData(addr)).spartaStaked), V.plus(v))
        assert.equal(_.BN2Str((await sPool1ETH2.poolData(addr)).tokenStaked), A.plus(a))
        assert.equal(_.BN2Str((await sPool1ETH2.poolData(addr)).stakerCount), +stakerCount + 1, 'stakerCount')
        assert.equal(_.BN2Str((await sPool1ETH2.poolData(addr)).poolUnits), units.plus(poolUnits), 'poolUnits')

        assert.equal(_.BN2Str(await sparta.balanceOf(sPool1ETH2.address)), _.BN2Str(V.plus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(sPool1ETH2.address)), _.BN2Str(A.plus(a)), 'ether balance')
    })
}

async function upgradeETH(acc) {

    it(`It should upgrade ETH`, async () => {

        V = _.getBN((await sPool2ETH.poolData()).baseAmt)
        A = _.getBN((await sPool2ETH.poolData()).tokenAmt)
        v = _.getBN(await sPool1ETH.getStakerShareSparta(acc))
        a = _.getBN(await sPool1ETH.getStakerShareToken(acc))
        poolUnits = _.getBN((await sPool2ETH.totalSupply()))
        console.log(_.BN2Str(v), _.BN2Str(V), _.BN2Str(a), _.BN2Str(A))

        let units = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))

        let tx = await sRouter.upgrade(sRouter2.address, _.ETH, {from:acc})
        // console.log(tx.receipt.logs)

        assert.equal(_.BN2Str((await sPool2ETH.poolData()).baseAmt), V.plus(v))
        assert.equal(_.BN2Str((await sPool2ETH.poolData()).tokenAmt), _.BN2Str(A.plus(a)))
        assert.equal(_.BN2Str((await sPool2ETH.poolData()).spartaStaked), V.plus(v))
        assert.equal(_.BN2Str((await sPool2ETH.poolData()).tokenStaked), A.plus(a))
        assert.equal(_.BN2Str((await sPool2ETH.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')

        assert.equal(_.BN2Str(await sparta.balanceOf(sPool2ETH.address)), _.BN2Str(V.plus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(sPool2ETH.address)), _.BN2Str(A.plus(a)), 'ether balance')
    })
}

async function upgradeTKN(acc) {

    it(`It should upgrade TKN1`, async () => {

    V = _.getBN((await spartan2Pools.poolData()).baseAmt)
    A = _.getBN((await spartan2Pools.poolData()).tokenAmt)
    v = _.getBN(await sPool1ETH.getStakerShareSparta(acc))
    a = _.getBN(await sPool1ETH.getStakerShareToken(acc))
    poolUnits = _.getBN((await spartan2Pools1.totalSupply()))
    console.log(_.BN2Str(v), _.BN2Str(V), _.BN2Str(a), _.BN2Str(A))

    let units = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))

    let tx = await sRouter.upgrade(sRouter2.address, token1.address, {from:acc})
    // console.log(tx.receipt.logs)

    assert.equal(_.BN2Str((await spartan2Pools.poolData()).baseAmt), V.plus(v))
    assert.equal(_.BN2Str((await spartan2Pools.poolData()).tokenAmt), _.BN2Str(A.plus(a)))
    assert.equal(_.BN2Str((await spartan2Pools.poolData()).spartaStaked), V.plus(v))
    assert.equal(_.BN2Str((await spartan2Pools.poolData()).tokenStaked), A.plus(a))
    assert.equal(_.BN2Str((await spartan2Pools.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')

    assert.equal(_.BN2Str(await sparta.balanceOf(spartan2Pools.address)), _.BN2Str(V.plus(v)), 'spartan balance')
    assert.equal(_.BN2Str(await web3.eth.getBalance(spartan2Pools.address)), _.BN2Str(A.plus(a)), 'ether balance')
})
}

async function unstakeETH(bp, acc) {

    it(`It should unstake ETH for ${acc}`, async () => {
        const addr = _.ETH
        let sPool1ETH = sPool1ETH2
        var V = _.getBN((await sPool1ETH.poolData(addr)).baseAmt)
        var A = _.getBN((await sPool1ETH.poolData(addr)).tokenAmt)

        // let stakers = _.BN2Str((await sPool1ETH.poolData(addr)).stakerCount)
        let totalUnits = _.getBN((await sPool1ETH.poolData(addr)).poolUnits)
        let stakeData = (await sPool1ETH.getMemberStakeData(acc, addr))
        let stakerUnits = _.getBN(stakeData.stakeUnits)
        let share = (stakerUnits.times(bp)).div(10000)
        let v = (V.times(share)).div(totalUnits)
        let a = (A.times(share)).div(totalUnits)
        console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(v), _.BN2Str(a))
        
        // assert.equal(stakeData.baseAmt, _.BN2Str(v), 'spartan')
        // assert.equal(stakeData.tokenAmt, _.BN2Str(a), 'token')
        
        let tx = await sPool1ETH.unstake(bp, addr, { from: acc})

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputBase), _.BN2Str(v), 'outputBase')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputToken), _.BN2Str(a), 'outputToken')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await sPool1ETH.poolData(addr)).poolUnits), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str((await sPool1ETH.poolData(addr)).baseAmt), V.minus(v))
        assert.equal(_.BN2Str((await sPool1ETH.poolData(addr)).tokenAmt), A.minus(a))
        assert.equal(_.BN2Str((await sPool1ETH.poolData(addr)).spartaStaked), V.minus(v))
        assert.equal(_.BN2Str((await sPool1ETH.poolData(addr)).tokenStaked), _.BN2Str(A.minus(a)))
        // assert.equal(_.BN2Str(await sparta.balanceOf(sPool1ETH.address)), _.BN2Str(V.minus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(sPool1ETH.address)), _.BN2Str(A.minus(a)), 'ether balance')
        // assert.equal(_.BN2Str(await sparta.balanceOf(sPool1ETH.address)), _.BN2Str(V.minus(v)), 'spartan balance')
        // assert.equal(_.BN2Str(await web3.eth.getBalance(sPool1ETH.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakeData2 = (await sPool1ETH.getMemberStakeData(acc, addr))
        // assert.equal(stakeData.baseAmt, v, 'spartan')
        // assert.equal(stakeData.tokenAmt, a, 'token')
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

        var V = _.getBN((await sPool1ETH2.poolData(addr)).baseAmt)
        var A = _.getBN((await sPool1ETH2.poolData(addr)).tokenAmt)

        // let stakers = _.BN2Str((await sPool1ETH.poolData(addr)).stakerCount)
        let totalUnits = _.getBN((await sPool1ETH2.poolData(addr)).poolUnits)
        let stakeData = (await sPool1ETH2.getMemberStakeData(acc, addr))
        let stakerUnits = _.getBN(stakeData.stakeUnits)
        let share = (stakerUnits.times(bp)).div(10000)
        let v = (V.times(share)).div(totalUnits)
        let a = (A.times(share)).div(totalUnits)
        console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(v), _.BN2Str(a))
        
        // assert.equal(stakeData.baseAmt, _.BN2Str(v), 'spartan')
        // assert.equal(stakeData.tokenAmt, _.BN2Str(a), 'token')
        
        let tx = await sPool1ETH2.unstake(bp, addr, { from: acc})

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputBase), _.floorBN(v), 'outputBase')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputToken), _.BN2Str(a), 'outputToken')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await sPool1ETH2.poolData(addr)).poolUnits), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str((await sPool1ETH2.poolData(addr)).baseAmt), _.BN2Str(V.minus(v)))
        assert.equal(_.BN2Str((await sPool1ETH2.poolData(addr)).tokenAmt), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str((await sPool1ETH2.poolData(addr)).spartaStaked), _.BN2Str(V.minus(v)))
        assert.equal(_.BN2Str((await sPool1ETH2.poolData(addr)).tokenStaked), _.BN2Str(A.minus(a)))
        // assert.equal(_.BN2Str(await sparta.balanceOf(sPool1ETH.address)), _.BN2Str(V.minus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(sPool1ETH2.address)), _.BN2Str(A.minus(a)), 'ether balance')
        // assert.equal(_.BN2Str(await sparta.balanceOf(sPool1ETH.address)), _.BN2Str(V.minus(v)), 'spartan balance')
        // assert.equal(_.BN2Str(await web3.eth.getBalance(sPool1ETH.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakeData2 = (await sPool1ETH2.getMemberStakeData(acc, addr))
        // assert.equal(stakeData.baseAmt, v, 'spartan')
        // assert.equal(stakeData.tokenAmt, a, 'token')
        assert.equal(_.BN2Str(stakeData2.stakeUnits), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
}


function logETH() {
    it("logs", async () => {
        await help.logPool(sPool1ETH, _.ETH, 'ETH')
    })
}
function logETH2() {
    it("logs", async () => {
        await help.logPool(sPool1ETH2, _.ETH, 'ETH')
    })
}

function logTKN1() {
    it("logs", async () => {
        await help.logPool(sPool1ETH, token1.address, 'TKN1')
    })
}
function logTKN2() {
    it("logs", async () => {
        await help.logPool(sPool1ETH2, token1.address, 'TKN1')
    })
}



