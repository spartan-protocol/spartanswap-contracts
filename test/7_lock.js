
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
var DEPOTime;
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
    wrapBNB()
    createPoolWBNB()
    createPoolTKN1()
    deployerListWBNB()
    depositWBNB(acc2)
    claimLPWBNB(acc2, 1000) 
    attackerListAsset()
    depositNONEListedAsset()
    deployerListTKN()
    depositTKN(acc2)
    claimLPTKN(acc2, 1000) // claim after 1 second
    
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
        lock = await LOCK.new(base.address, router.address, wbnb.address)
        token1 = await TOKEN1.new();
      
        await base.listAsset(lock.address, _.BN2Str(5000000 * _.one),_.BN2Str(_.one) ) // list lock
        await base.listAsset(token1.address, _.BN2Str(500000 * _.one),_.BN2Str(2*_.one) ) //list token 1
      
        await base.changeDAO(Dao.address)
        await Dao.setGenesisAddresses(router.address, utils.address)

        let supply = await token1.totalSupply()
        await token1.transfer(acc1, _.getBN(_.BN2Int(supply)/4)) // give acc1 token1 to burn
        await token1.approve(base.address, supply, {from:acc1})//approve base to burn token1 from acc1
        await base.claim(token1.address, _.BN2Str(_.one), {from: acc1}) // burn 1 token1 to get sparta
        //console.log(_.BN2Str(await base.balanceOf(acc1))/_.one)

        await wbnb.approve(router.address, supply, {from:acc1}) // approve router to add token1
        await token1.approve(router.address, supply, {from:acc1}) // approve router to add token1
        await base.approve(router.address, supply, {from:acc1}) //approve router to add base

        await wbnb.approve(lock.address, supply, {from:acc1}) // approve lock 
        await token1.approve(lock.address, supply, {from:acc1}) // approve lock 
        await base.approve(lock.address, supply, {from:acc1})
        await base.approve('0x93892e7ef9ab548bcb7b00354a51a84a4fe94cd7',supply, {from:acc1})
        await wbnb.approve('0x93892e7ef9ab548bcb7b00354a51a84a4fe94cd7',supply, {from:acc1})
        await token1.approve('0x93892e7ef9ab548bcb7b00354a51a84a4fe94cd7',supply, {from:acc1})

        await token1.transfer(acc2, _.getBN(_.BN2Int(supply)/4)) // give acc1 token1 to burn
        await token1.approve(base.address, supply, {from:acc2})//approve base to burn token1 from acc1
        await base.claim(token1.address, _.BN2Str(_.one), {from: acc2}) // burn 1 token1 to get sparta
        //console.log(_.BN2Str(await base.balanceOf(acc1))/_.one)

        await wbnb.approve(router.address, supply, {from:acc2}) // approve router to add wbnb
        await token1.approve(router.address, supply, {from:acc2}) // approve router to add token1
        await base.approve(router.address, supply, {from:acc2}) //approve router to add base

        await wbnb.approve(lock.address, supply, {from:acc2}) // approve lock 
        await token1.approve(lock.address, supply, {from:acc2}) // approve lock 
        await base.approve(lock.address, supply, {from:acc2})
        await base.approve('0x93892e7ef9ab548bcb7b00354a51a84a4fe94cd7',supply, {from:acc2})
        await wbnb.approve('0x93892e7ef9ab548bcb7b00354a51a84a4fe94cd7',supply, {from:acc2})

        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

        
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
async function wrapBNB() {
    it("It should wrap", async () => {
        await web3.eth.sendTransaction({to: wbnb.address, value:_.BN2Str(10*_.one), from:acc0});
        await wbnb.transfer(acc1, _.getBN(_.BN2Int(_.one * 3)))
        await wbnb.transfer(acc2, _.getBN(_.BN2Int(_.one*3)))
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await wbnb.approve(lock.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await wbnb.approve(lock.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await wbnb.approve(lock.address, _.BN2Str(500000 * _.one), { from: acc2 })
    })
}

// async function createPoolBNB() {
//     it("It should deploy BNB Pool", async () => {
//         var _pool = await router.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one), _.BNB, {from: acc1,value:_.BN2Str(_.one)})
//         await router.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one), _.BNB, {from: acc1, value:_.BN2Str(_.one)})
//         poolWBNB = await POOL.at(_pool)
//         //console.log(`Pools: ${poolWBNB.address}`)
//         const baseAddr = await poolWBNB.BASE()
//         assert.equal(baseAddr, base.address, "address is correct")
//         assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(_.one * 10), 'base balance')
//     })
// }
async function createPoolWBNB() {
    it("It should deploy BNB Pool", async () => {
        var _pool = await router.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one), wbnb.address, {from:acc1})
        await router.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one), wbnb.address, {from:acc1})
        poolWBNB = await POOL.at(_pool)
        //console.log(`Pools: ${poolWBNB.address}`)
        const baseAddr = await poolWBNB.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(_.one * 10), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(_.BN2Str(_.one)), 'wbnb balance')

        let supply = await base.totalSupply()
        await base.approve(poolWBNB.address, supply, { from: acc0 })
        await base.approve(poolWBNB.address, supply, { from: acc1 })
    })
}


// async function addLiquidity(acc) {
//     it("It should add liquidity", async () => {
//          let token = _.BNB
//         //let token = token1.address
//         let y = _.BN2Str(_.one * 10)
//         let x = _.BN2Str(_.one * 100)
//         await router.addLiquidity(x, y, token, { from: acc, value:y})
//     })
// }

async function depositWBNB(acc){
    it("It should deposit asset and receive half LP", async () => {
        let asset = wbnb.address
        let amount = _.BN2Str(_.one)
        let spartaAllocation = await utils.calcValueInBase(asset,amount)
        let poolData = await utils.getPoolData(asset);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolWBNB.totalSupply()))
        let units = _.getBN(await utils.calcLiquidityUnits(spartaAllocation, B, amount, T, poolUnits))
        let unitsAdj = units.times(5000).div(10000)
        let balBefore = _.getBN(await poolWBNB.balanceOf(acc))
        DEPOTime = _.getBN((new Date())/1000)
        await lock.deposit(asset, amount,{from:acc})
        let memberDetails = await lock.getMemberDetails(acc, asset);
        let balAfter = _.getBN(await poolWBNB.balanceOf(acc))
        assert.equal(_.BN2Str((await poolWBNB.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
        assert.equal(_.BN2Str(_.floorBN(balBefore.plus(unitsAdj))), _.BN2Str(balAfter), 'lp tokens')
        assert.equal(_.BN2Str(memberDetails.lockedLP), _.BN2Str(await poolWBNB.balanceOf(acc)), 'locked LP')

    })
}
async function depositTKN(acc){
    it("It should deposit asset and receive half LP", async () => {
        let asset = token1.address
        let amount = _.BN2Str(_.one)
        let spartaAllocation = await utils.calcValueInBase(asset,amount)
        let poolData = await utils.getPoolData(asset);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolTKN1.totalSupply()))
        let units = _.getBN(await utils.calcLiquidityUnits(spartaAllocation, B, amount, T, poolUnits))
        let unitsAdj = units.times(5000).div(10000)
        let balBefore = _.getBN(await poolTKN1.balanceOf(acc))
        await lock.deposit(asset, amount,{from:acc})
        DEPOTime = _.getBN((new Date())/1000)
        let balAfter = _.getBN(await poolTKN1.balanceOf(acc))
        let memberDetails = await lock.getMemberDetails(acc, asset);
        assert.equal(_.BN2Str((await poolTKN1.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
        assert.equal(_.BN2Str(_.floorBN(balBefore.plus(unitsAdj))), _.BN2Str(balAfter), 'lp tokens')
        assert.equal(_.BN2Str(memberDetails.lockedLP), _.BN2Str(await poolTKN1.balanceOf(acc)), 'locked LP')

    })
}


async function claimLPTKN(acc, ms){
    it(`It should claim vesting lp after ${ms/1000} seconds`, async () => {
        await sleep(ms)
        let asset = token1.address
        let balBefore = _.getBN(await poolTKN1.balanceOf(acc))
        let now = _.getBN((new Date())/1000)
        let memberDetailsBefore = await lock.getMemberDetails(acc, asset);
        let lockLPBefore = _.BN2Int(memberDetailsBefore.lockedLP)
        let claimRate = _.BN2Str(memberDetailsBefore.claimRate)
        await lock.claim(asset,{from:acc})
        let calcClaimable = _.floorBN(now.minus(DEPOTime).times(claimRate))
        let memberDetailsAfter = await lock.getMemberDetails(acc, asset);
        let lockLPAfter = _.getBN(memberDetailsAfter.lockedLP)
        let balAfter = _.getBN(await poolTKN1.balanceOf(acc))
        assert.isAtLeast(_.BN2Int(balBefore.plus(calcClaimable)), _.BN2Int(balAfter))
        assert.isAtLeast(_.BN2Int(lockLPAfter.plus(calcClaimable)), lockLPBefore)
    })
    
}
async function claimLPWBNB(acc, ms){
    it(`It should claim vesting lp after ${ms/1000} seconds`, async () => {
        await sleep(ms)
        let asset = wbnb.address
        let balBefore = _.getBN(await poolWBNB.balanceOf(acc))
        let now = _.getBN((new Date())/1000)
        let memberDetailsBefore = await lock.getMemberDetails(acc, asset);
        let lockLPBefore = _.BN2Int(memberDetailsBefore.lockedLP)
        let claimRate = _.BN2Str(memberDetailsBefore.claimRate)
        await lock.claim(asset,{from:acc})
        let calcClaimable = _.floorBN(now.minus(DEPOTime).times(claimRate))
        let memberDetailsAfter = await lock.getMemberDetails(acc, asset);
        let lockLPAfter = _.getBN(memberDetailsAfter.lockedLP)
        let balAfter = _.getBN(await poolWBNB.balanceOf(acc))
        assert.isAtLeast(_.BN2Int(balBefore.plus(calcClaimable)), _.BN2Int(balAfter))
        assert.isAtLeast(_.BN2Int(lockLPAfter.plus(calcClaimable)), lockLPBefore)
    })
    
}

async function depositNONEListedAsset(){
    it('should fail to deposit none listed asset', async () =>{
        let attacker = acc3;
        let amount = _.BN2Str(_.one)
        let tnk = token1.address;
        try {
            await lock.deposit(tnk, amount,{from:attacker})
            assert.fail("The transaction should reject attacker");
        }
        catch (err) {
            assert.include(err.message, "revert", "revert must be listed");
        }

    })
}
async function attackerListAsset(){
    it('should fail to list asset from attacker', async () =>{
        let attacker = acc3;
        let asset = token1.address;
        try {
            await lock.listLockAsset(asset, {from:attacker});
            assert.fail("The transaction should reject attacker");
        }
        catch (err) {
            assert.include(err.message, "revert", "revert Must be DAO");
        }

    })
}

async function deployerListTKN(){
    it('deployer list TKN asset', async () =>{
        let deployer = acc0;
        let asset = token1.address;
        await lock.listLockAsset(asset, {from:deployer});

    })
}
async function deployerListWBNB(){
    it('deployer list wbnb asset', async () =>{
        let deployer = acc0;
        let asset = wbnb.address;
        await lock.listLockAsset(asset, {from:deployer});

    })
}



