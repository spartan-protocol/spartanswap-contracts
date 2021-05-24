const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');
const { expect } = require("chai");

var BASE = artifacts.require("./BaseMinted.sol");
var DAO = artifacts.require("./Dao.sol");
var ROUTER = artifacts.require("./Router.sol");
var POOL = artifacts.require("./Pool.sol");
var UTILS = artifacts.require("./Utils.sol");
var SYNTHVAULT = artifacts.require("./SynthVault.sol");

var SYNTH = artifacts.require("./synth.sol");
var LEND = artifacts.require("./SpartanLend.sol");
var LENDROUTER = artifacts.require("./lendRouter.sol");
var RESERVE = artifacts.require("./Reserve.sol");
var BOND = artifacts.require("./Bond.sol");
var BONDVault = artifacts.require("./BondVault.sol");
var TOKEN = artifacts.require("./Token1.sol");
var TOKEN2 = artifacts.require("./Token2.sol");
var POOLFACTORY = artifacts.require("./poolFactory.sol");
var SYNTHFACTORY = artifacts.require("./synthFactory.sol");
var WBNB = artifacts.require("./WBNB");
var DAOVAULT = artifacts.require("./DaoVault.sol");
var UPGR = artifacts.require("./SPARTANUPGRADE.sol");
var base;
var DEPOTime;
var DEPOTime2;
var allocation = 2500000;
var utils; var router; var Dao;

var acc0; var acc1; var acc2; var acc3; var poolTKN1;
var start;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

contract('LOCK', function (accounts) {
    constructor(accounts)
    checkLockSupply()
    burnLock()
    createPoolWBNB()
    createPoolTKN1()
    addLiquidity(acc1, _.BN2Str(_.one * 100), _.BN2Str(_.one * 10))
    addLiquidity(acc0, _.BN2Str(_.one * 100), _.BN2Str(_.one * 10))
    addLiquidityTKN1(acc0,_.BN2Str(100*_.one),  _.BN2Str(50*_.one))
    addLiquidityTKN1(acc1,_.BN2Str(100*_.one),  _.BN2Str(50*_.one))
     deployerListBNB()
     deployerChangeSecondsPerYear(100)
     depositBNB(acc2, _.BN2Str(_.one))
     claimLPAndLock(acc2, 2000) 
    //  deployerChangeSecondsPerYear(1)
     //claimLPAndLock(acc2, 2000) 
     deployerChangeSecondsPerYear(100)
     depositNONEListedAsset()
     deployerListTKN()
     depositTKN(acc2, _.BN2Str(_.one))
     migrateMemberDetails(acc2)
     moveBondVault()
    //  claimLPAndLockTNK(acc2, 1000) // claim after 1 second
    //   deployerChangeSecondsPerYear(1)
      claimLPAndLock(acc2, 2000) 
      depositBNBAfter(acc2, _.BN2Str(_.one))
    //  deployerUnListBNB()
    //   claimLPAndLock(acc2, 2000) 

  
})

//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
        base = await BASE.new() // deploy base
        wbnb = await WBNB.new() // deploy wBNB
        token1 = await TOKEN.new()             //deploy token
        
        Dao = await DAO.new(base.address)     // deploy daoV2
        synthV = await SYNTHVAULT.new(base.address, Dao.address) 
        utils = await UTILS.new(base.address, base.address, Dao.address) // deploy utilsV2
        router = await ROUTER.new(base.address, wbnb.address, Dao.address) //deploy router
        daoVault = await DAOVAULT.new(base.address, Dao.address);
        bondVault = await BONDVault.new(base.address, Dao.address)  //deploy new bond
        bondVault2 = await BONDVault.new(base.address, Dao.address)  //deploy new bond
        bond = await BOND.new(base.address, wbnb.address, Dao.address, bondVault.address);
        poolFactory = await POOLFACTORY.new(base.address,  wbnb.address, Dao.address) 
        synthFactory = await SYNTHFACTORY.new(base.address,  wbnb.address, Dao.address) 

        daoVault = await DAOVAULT.new(base.address, Dao.address);
        lendRouter = await LENDROUTER.new(base.address);

        lend = await LEND.new(base.address, lendRouter.address);
        SPReserve = await RESERVE.new(base.address) // deploy base 


        await Dao.setGenesisAddresses(router.address, utils.address, lend.address, bond.address, daoVault.address,poolFactory.address, synthFactory.address, SPReserve.address); 
        await base.changeDAO(Dao.address)  


        await SPReserve.setIncentiveAddresses(router.address, lend.address,synthV.address,Dao.address );
        await SPReserve.start();

      
        await base.listAsset(bond.address, _.BN2Str(allocation* _.one),_.BN2Str(18*_.one) ) // list bond

        let supply = await token1.totalSupply()
        await base.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))

        await base.transfer(SPReserve.address, _.getBN(_.BN2Str(10000 * _.one)))
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await wbnb.approve(router.address, supply, {from:acc1}) // approve router to add token1
        await token1.approve(router.address, supply, {from:acc1}) // approve router to add token1
        await base.approve(router.address, supply, {from:acc1}) //approve router to add base

        await token1.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
      

        
    });
}
async function checkLockSupply(){
    it("It should mint 1 BOND token", async () => {
        let lockSupply = await bond.totalSupply()
        assert.equal(lockSupply,_.BN2Str(_.one), '1 Lock exists')
})
}
async function burnLock(){
    it("Burn bond for Allocation", async () => {
        let lockBalBefore = await bond.balanceOf(bond.address)
        assert.equal(_.BN2Str(lockBalBefore), _.BN2Str(_.one), '1 bond exist')
        let spartaBalBefore = await base.balanceOf(bond.address)
        assert.equal(spartaBalBefore,'0', 'Sparta balance zero')
        await bond.approve(base.address, lockBalBefore, {from:acc0})
      
        expect(_.BN2Str(await bond.allowance(acc0, base.address))).to.equal(_.BN2Str(lockBalBefore));
        let tx = await bond.burnBond()

        let lockBalAfter = await bond.balanceOf(bond.address)
        assert.equal(lockBalAfter,'0',  'bond was burnt')
        let spartaBalAfter = await base.balanceOf(bond.address)
        assert.equal(_.BN2Str(spartaBalAfter/_.one),allocation, 'did it get 5m sparta')
    })
}
async function addLiquidity(acc, b, t) {

    it(`It should addLiquidity BNB from ${acc}`, async () => {
        let token = _.BNB
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolWBNB.totalSupply()))
        let before = _.getBN(await poolWBNB.balanceOf(acc))
        let units = math.calcLiquidityUnits(b, B, t, T, poolUnits)
        let tx = await router.addLiquidity(b, t, token, { from: acc, value:t})
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(B.plus(b)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.plus(t)))
        assert.equal(_.BN2Str((await poolWBNB.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
        assert.equal(_.BN2Str(await poolWBNB.balanceOf(acc)), _.BN2Str(before.plus(units)), 'units')
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(B.plus(b)), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(T.plus(t)), 'wbnb balance')
    })
}
async function addLiquidityTKN1(acc, b, t) {

    it(`It should addLiquidity TKN from ${acc}`, async () => {
        let token = token1.address
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolTKN1.totalSupply()))
        let units = math.calcLiquidityUnits(b, B, t, T, poolUnits)
        let tx = await router.addLiquidity(b, t, token, { from: acc})
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(B.plus(b)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.plus(t)))
        assert.equal(_.BN2Str((await poolTKN1.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
        assert.equal(_.BN2Str(await poolTKN1.balanceOf(acc)), _.BN2Str(units), 'units')
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN1.address)), _.BN2Str(B.plus(b)), 'base balance')
        assert.equal(_.BN2Str(await token1.balanceOf(poolTKN1.address)), _.BN2Str(T.plus(t)), 'wbnb balance')
    })
}
async function createPoolWBNB(SPT, token) {
    it("It should deploy BNB Pool", async () => {
        var _pool = await poolFactory.createPool.call( wbnb.address)
        await poolFactory.createPool(wbnb.address)
        poolWBNB = await POOL.at(_pool)
        //console.log(`Pools: ${poolWBNB.address}`)
        const baseAddr = await poolWBNB.BASE()
        assert.equal(baseAddr, base.address, "address is correct")

        let supply = await base.totalSupply()
        await base.approve(poolWBNB.address, supply, { from: acc0 })
        await base.approve(poolWBNB.address, supply, { from: acc1 })

    })
}
async function createPoolTKN1(SPT, token) {
    it("It should deploy TKN1 Pool", async () => {
        var _pool = await poolFactory.createPool.call(token1.address)
        await poolFactory.createPool(token1.address)
        poolTKN1 = await POOL.at(_pool)
        //console.log(`Pools: ${poolTKN1.address}`)
        const baseAddr = await poolTKN1.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        let supply = await base.totalSupply()
        await base.approve(poolTKN1.address, supply, { from: acc0 })
        await base.approve(poolTKN1.address, supply, { from: acc1 })
        

    })
}
async function depositBNB(acc, amount){
    it(`It should deposit and bond into dao `, async () => {
        let asset = _.BNB
        let poolData = await utils.getPoolData(asset);
        let spartaAllocation = await utils.calcSwapValueInBase(asset,amount)
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolWBNB.totalSupply()))
        let units = _.getBN(await utils.calcLiquidityUnits(spartaAllocation, B, amount, T, poolUnits))
        DEPOTime = _.getBN((new Date())/1000)
       await bond.deposit(asset, amount,{from:acc, value:amount})
       let memberDetails = await bondVault.getMemberDetails(acc, asset);

        console.log("bondedLPBefore ",_.BN2Str(memberDetails.bondedLP)); 

 
       assert.equal(_.BN2Str(memberDetails.bondedLP), _.BN2Str(units), 'bonded LP')
        assert.equal(_.BN2Str((await poolWBNB.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
    })
}
async function depositTKN(acc, amount){
    it(`It should deposit tkn`, async () => {
        let asset = token1.address
        let poolData = await utils.getPoolData(asset);
        let spartaAllocation = await utils.calcSwapValueInBase(asset,amount)
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolTKN1.totalSupply()))
        let units = _.getBN(await utils.calcLiquidityUnits(spartaAllocation, B, amount, T, poolUnits))
        DEPOTime = _.getBN((new Date())/1000)
        let lockLPBalB =  _.getBN(await poolTKN1.balanceOf(bondVault.address))
        await token1.approve(bond.address, _.BN2Str(10000*_.one), {from:acc})
        await bond.deposit(asset, amount,{from:acc})
        let memberDetails = await bondVault.getMemberDetails(acc, asset);
        let lockLPBal =  _.BN2Str(await poolTKN1.balanceOf(bondVault.address))
        assert.equal(lockLPBal, _.BN2Str(lockLPBalB.plus(units)), 'got LP')
        assert.equal(_.BN2Str((await poolTKN1.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
        assert.equal(_.BN2Str(memberDetails.bondedLP), _.BN2Str(units.plus(lockLPBalB)), 'bonded LP')

    })
}
async function claimLPAndLockTNK(acc, ms){
    it(`It should claim vesting Token LPs after ${ms/1000} seconds`, async () => {
        await sleep(ms)
        let asset = token1.address
        let balBefore = _.getBN(await poolTKN1.balanceOf(bondVault.address))
        let now = _.getBN((new Date())/1000)
        let memberDetailsBefore = await bondVault.getMemberDetails(acc, asset);
        let bondedLPBefore = _.BN2Int(memberDetailsBefore.bondedLP)
        let claimRate = _.BN2Str(memberDetailsBefore.claimRate)
        
        await bond.claimForMember(asset,{from:acc})
        let calcClaimable = _.floorBN(now.minus(DEPOTime).times(claimRate))
        let memberDetailsAfter = await bondVault.getMemberDetails(acc, asset);
        let bondedLPAfter = _.getBN(memberDetailsAfter.bondedLP)
        let balAfter = _.getBN(await poolTKN1.balanceOf(bondVault.address))
        let accBall = _.getBN(await poolWBNB.balanceOf(acc))
        console.log("vault LP balance ",_.BN2Str(balBefore)); 
        console.log("member bondedLPBefore ",_.BN2Str(bondedLPBefore)); 
        console.log("claimRate ",_.BN2Str(claimRate)); 
       

        console.log("member bondedLPAfter ",_.BN2Str(bondedLPAfter)); 
        console.log("vault balAfter ",_.BN2Str(balAfter)); 
        console.log("accBall  ",_.BN2Str(accBall)); 
    })
    
}
async function claimLPAndLock(acc, ms){
  
    it(`It should claim  ${ms/1000} seconds`, async () => {
        await sleep(ms)
        let asset = token1.address
        let assetB = _.BNB
        let balBefore = _.getBN(await poolWBNB.balanceOf(bondVault.address))
        let memberDetailsBefore = await bondVault.getMemberDetails(acc, asset);
        let bondedLPBefore = _.getBN(memberDetailsBefore.bondedLP)
        let claimRate = _.BN2Str(memberDetailsBefore.claimRate)

        let accBal = _.getBN(await poolWBNB.balanceOf(acc))
        await bond.claimAllForMember(acc,{from:acc})
        let memberDetailsAfter = await bondVault.getMemberDetails(acc, asset);
        let bondedLPAfter = _.getBN(memberDetailsAfter.bondedLP)
        let balAfter = _.getBN(await poolWBNB.balanceOf(bondVault.address))
        let accBall = _.getBN(await poolWBNB.balanceOf(acc))
       
        console.log("vault LP balance ",_.BN2Str(balBefore)); 
        console.log("member bondedLPBefore ",_.BN2Str(bondedLPBefore)); 
        console.log("claimRate ",_.BN2Str(claimRate)); 
        console.log("accBal ",_.BN2Str(accBal)); 

        console.log("member bondedLPAfter ",_.BN2Str(bondedLPAfter)); 
        console.log("vault balAfter ",_.BN2Str(balAfter)); 
        console.log("accBall  ",_.BN2Str(accBall)); 

        let memberDetailsAfterb = await bondVault.getMemberDetails(acc, assetB);
        let bondedLPAfterb = _.getBN(memberDetailsAfterb.bondedLP)
        let balAfterb = _.getBN(await poolWBNB.balanceOf(bondVault.address))
        let accBallb = _.getBN(await poolWBNB.balanceOf(acc))
    
        console.log("member bondedLPAfter ",_.BN2Str(bondedLPAfterb)); 
        console.log("vault balAfter ",_.BN2Str(balAfterb)); 
        console.log("accBall  ",_.BN2Str(accBallb)); 


    })
    
}

async function depositNONEListedAsset(){
    it('should fail to deposit none listed asset', async () =>{
        let attacker = acc3;
        let amount = _.BN2Str(_.one)
        let tnk = token1.address;
        try {
            await bond.deposit(tnk, amount,{from:attacker})
            assert.fail("The transaction should reject attacker");
        }
        catch (err) {
            assert.include(err.message, "revert", "revert must be listed");
        }

    })
}

async function deployerListTKN(){
    it('deployer list TKN asset', async () =>{
        let deployer = acc0;
        let asset = token1.address;
        await bond.listBondAsset(asset, {from:deployer});

    })
}
async function deployerListBNB(){
    it('deployer list bnb asset', async () =>{
        let deployer = acc0;
        let asset = _.BNB;
        await bond.listBondAsset(asset, {from:deployer});
    })
}
async function deployerUnListBNB(){
    it('deployer list bnb asset', async () =>{
        let deployer = acc0;
        let asset = _.BNB;
        await bond.delistBondAsset(asset, {from:deployer});
    })
}
async function claimAfterPeriod(acc, ms){
    it('claim correct mount after time-locked period', async () =>{
        await sleep(ms)
        let asset = _.BNB
        await bond.claimAndLock(asset,{from:acc})
        let memberDetailsAfter = await bond.getMemberDetails(acc, asset);
        let bondedLPAfter = _.getBN(memberDetailsAfter.bondedLP)
        assert.equal(_.BN2Int(bondedLPAfter), 0, 'no more to claim')
        let memberDetailsAfter2 = await bondtwo.getMemberDetails(acc, asset);
        let bondedLPAfter2 = _.getBN(memberDetailsAfter2.bondedLP)
        assert.equal(_.BN2Int(bondedLPAfter2), 0, 'no more to claim')

    })
}
async function deployerChangeSecondsPerYear(seconds){
    it(`Deployer change bond period to ${seconds} seconds`, async () => {
        await bond.changeBondingPeriod(seconds, {from:acc0});
        let secondsPerYearA = _.BN2Str(await bond.bondingPeriodSeconds());
        assert.equal(secondsPerYearA, seconds, 'deployer change bond period in seconds')
    })

}

