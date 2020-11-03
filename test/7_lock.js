
const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');
const { expect } = require("chai");

var BASE = artifacts.require("./Base.sol");
var DAO = artifacts.require("./Dao.sol");
var ROUTER = artifacts.require("./Router.sol");
var POOL = artifacts.require("./Pool.sol");
var UTILS = artifacts.require("./Utils.sol");
var TOKEN1 = artifacts.require("./Token1.sol");
var TOKEN2 = artifacts.require("./Token2.sol");
var TOKEN3 = artifacts.require("./Token3.sol");
var LOCK = artifacts.require("./Lock.sol");
var WBNB = artifacts.require("./WBNB");
var base;
var utils; var router; var Dao;

var acc0; var acc1; var acc2; var acc3; var poolTKN1;
var start;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

contract('LOCK', function (accounts) {
    constructor(accounts)
    checkLockSupply()
    checkListed()
    burnLock()
    createPoolTKN1()
    addLiquidityTKN1(acc1)
    depositTKN(acc2)
    depositTKN(acc2)
    claimLP(acc2, 1000) // claim after 1 second
    claimLP(acc2, 10000) // claim after 10 seconds
})

//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
        base = await BASE.new()
        wbnb = await WBNB.new()
        utils = await UTILS.new(base.address)
        Dao = await DAO.new(base.address)
        router = await ROUTER.new(base.address, wbnb.address)
        lock = await LOCK.new(base.address, router.address)
        token1 = await TOKEN1.new();
        token3 = await TOKEN3.new();
        token2 = await TOKEN2.new(token3.address);
        await base.listAsset(lock.address, _.BN2Str(5000000 * _.one),_.BN2Str(_.one) ) // list lock
        await base.listAsset(token1.address, _.BN2Str(500000 * _.one),_.BN2Str(2*_.one) ) //list token 1
      
        await base.changeDAO(Dao.address)
        await Dao.setGenesisAddresses(router.address, utils.address)

        let supply = await token1.totalSupply()
        await token1.transfer(acc1, _.getBN(_.BN2Int(supply)/4)) // give acc1 token1 to burn
        await token1.approve(base.address, supply, {from:acc1})//approve base to burn token1 from acc1
        await base.claim(token1.address, _.BN2Str(_.one), {from: acc1}) // burn 1 token1 to get sparta
        //console.log(_.BN2Str(await base.balanceOf(acc1))/_.one)

        await token1.approve(router.address, supply, {from:acc1}) // approve router to add token1
        await base.approve(router.address, supply, {from:acc1}) //approve router to add base

        await token1.approve(lock.address, supply, {from:acc1}) // approve lock 
        await base.approve(lock.address, supply, {from:acc1})
        await base.approve('0x93892e7ef9ab548bcb7b00354a51a84a4fe94cd7',supply, {from:acc1})
        await token1.approve('0x93892e7ef9ab548bcb7b00354a51a84a4fe94cd7',supply, {from:acc1})

        await token1.transfer(acc2, _.getBN(_.BN2Int(supply)/4)) // give acc1 token1 to burn
        await token1.approve(base.address, supply, {from:acc2})//approve base to burn token1 from acc1
        await base.claim(token1.address, _.BN2Str(_.one), {from: acc2}) // burn 1 token1 to get sparta
        //console.log(_.BN2Str(await base.balanceOf(acc1))/_.one)

        await token1.approve(router.address, supply, {from:acc2}) // approve router to add token1
        await base.approve(router.address, supply, {from:acc2}) //approve router to add base

        await token1.approve(lock.address, supply, {from:acc2}) // approve lock 
        await base.approve(lock.address, supply, {from:acc2})
        await base.approve('0x93892e7ef9ab548bcb7b00354a51a84a4fe94cd7',supply, {from:acc2})
        await token1.approve('0x93892e7ef9ab548bcb7b00354a51a84a4fe94cd7',supply, {from:acc2})

        
        
    });
}

async function checkLockSupply(){
    it("It should mint 1 Lock", async () => {
        let lockSupply = await lock.totalSupply()
        assert.equal(lockSupply,_.BN2Str(_.one), '1 Lock exists')
})
}

async function checkListed(){
    it("It Should check Lock's SPARTA Allocation", async () => {
    expect(await base.isListed(lock.address)).to.equal(true);
    expect(_.BN2Str(await base.mapAsset_allocation(lock.address)/_.one)).to.equal('1')
    expect(_.BN2Str(await base.mapAsset_claimRate(lock.address)/_.one)).to.equal('5000000')
})
}

async function burnLock(){
    it("Burn Lock for Allocation", async () => {
        let lockBalBefore = await lock.balanceOf(lock.address)
        assert.equal(_.BN2Str(lockBalBefore), _.BN2Str(_.one), '1 lock exist')
        let spartaBalBefore = await base.balanceOf(lock.address)
        assert.equal(spartaBalBefore,'0', 'Sparta balance zero')
        await lock.approve(base.address, lockBalBefore, {from:acc0})
        expect(_.BN2Str(await lock.allowance(acc0, base.address))).to.equal(_.BN2Str(lockBalBefore));
        let tx = await lock.burn()
        let lockBalAfter = await lock.balanceOf(lock.address)
        assert.equal(lockBalAfter,'0',  'lock was burnt')
        let spartaBalAfter = await base.balanceOf(lock.address)
        assert.equal(_.BN2Str(spartaBalAfter/_.one),'5000000', 'did it get 5m sparta')
    })
}

async function createPoolTKN1() {
    it("It should deploy TKN1 Pool", async () => {
        //console.log(" before" + _.BN2Str(await poolTKN1.balanceOf(acc1)/_.one));
        var _pool = await router.createPool.call(_.BN2Str(_.one * 1000), _.BN2Str(10*_.one), token1.address, {from:acc1})
        await router.createPool(_.BN2Str(_.one * 1000), _.BN2Str(10*_.one), token1.address, {from:acc1})
        poolTKN1 = await POOL.at(_pool,{from:acc1})
        //console.log(`Pools: ${poolTKN1.address}`)
       
        poolUnits = _.getBN((await poolTKN1.totalSupply()))
        // console.log(_.BN2Str(poolUnits)/_.one);
        const baseAddr = await poolTKN1.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        //assert.equal(_.BN2Str(await base.balanceOf(poolTKN1.address)), _.BN2Str(_.one * 100), 'base balance')
        //assert.equal(_.BN2Str(await token1.balanceOf(poolTKN1.address)), _.BN2Str(_.one), 'token1 balance')

        let supply = await base.totalSupply()
        await base.approve(poolTKN1.address, supply, { from: acc0 })
        await base.approve(poolTKN1.address, supply, { from: acc1 })
    })
}

async function addLiquidityTKN1(acc) {
    it("It should add liquidity", async () => {
        await router.addLiquidity(_.BN2Str(_.one * 100),10, token1.address, { from: acc})
    })
}

async function depositTKN(acc){
    it("It should deposit asset and receive half LP", async () => {
        let tnk = token1.address
        let amount = _.BN2Str(_.one)
        let spartaAllocation = await utils.calcValueInBase(tnk,amount)
        let poolData = await utils.getPoolData(tnk);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolTKN1.totalSupply()))
        let units = _.getBN(await utils.calcLiquidityUnits(spartaAllocation, B, amount, T, poolUnits))
        let unitsAdj = units.times(5000).div(10000)
        let balBefore = _.getBN(await poolTKN1.balanceOf(acc))
        await lock.deposit(token1.address, amount,{from:acc})
        let balAfter = _.getBN(await poolTKN1.balanceOf(acc))
        assert.equal(_.BN2Str((await poolTKN1.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
        assert.equal(_.BN2Str(_.floorBN(balBefore.plus(unitsAdj))), _.BN2Str(balAfter), 'lp tokens')
        assert.equal(_.BN2Str((await lock.mapAddress_LockedLP(acc)).lockedLP), _.BN2Str(await poolTKN1.balanceOf(acc)), 'locked LP')

    })
}

async function claimLP(acc, ms){
    it("It should claim vesting lp", async () => {
        let delay = await sleep(ms)
        let now = _.getBN((new Date())/1000)
        let lastTime = _.getBN((await lock.mapAddress_LockedLP(acc)).secondsSinceLastClaim)
        let calcClaimable = _.getBN(await lock.calcClaimableLockedLP(acc))
        let lockLPBefore = _.getBN((await lock.mapAddress_LockedLP(acc)).lockedLP)
        assert.exists(_.BN2Str(lastTime.minus(now)))
        assert.exists(_.BN2Str(calcClaimable))
        let balBefore = _.BN2Int(await poolTKN1.balanceOf(acc))
        await lock.claim(token1.address,{from:acc})
        let lockLPAfter = _.BN2Int((await lock.mapAddress_LockedLP(acc)).lockedLP)
        let balAfter = _.getBN(await poolTKN1.balanceOf(acc))
        assert.isAtLeast(_.BN2Int(balAfter.minus(calcClaimable)), balBefore)
        assert.isAtLeast(_.BN2Int(lockLPBefore.minus(calcClaimable)), lockLPAfter)
    })
    
}



