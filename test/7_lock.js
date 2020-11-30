
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
var BOND = artifacts.require("./BondV3.sol");
var BONDv = artifacts.require("./BondV2.sol");
var WBNB = artifacts.require("./WBNB");
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
    createPoolBNB()
    createPoolTKN1()
    deployerListBNB()
    deployerChangeSecondsPerYear(10)
    depositBNB(acc2)
    claimLPAndLock(acc2, 2000) 
    attackerListAsset()
    depositNONEListedAsset()
    deployerListTKN()
    depositTKN(acc2)
    claimLPAndLockTNK(acc2, 1000) // claim after 1 second
    deployerBurnBaseBalance()
    claimAfterPeriod(acc2, 10000)
    deployerMintBond()
    checkLockSupply2()
    burnLock2()
    deployerBurnBaseBalance()
    deployerMintBond()
    checkLockSupply2()
    burnLock2()
    depositTKN(acc2)
    deployerBurnBaseBalance()
    addLiquidityTKN1(acc1)
    addLiquidityTKN1(acc2)
    addLiquidityTKN1(acc3)
    lockTKN(acc1, _.BN2Str(_.one * 10)) // 25% <33%
    lockTKN(acc2, _.BN2Str(_.one * 10)) // 25% +1 >33% <50%
    lockTKN(acc3, _.BN2Str(_.one * 15)) // 37% +1 >50%
    changeCoolPeriod()
    deployerBurnBaseBalance()
    mintBond()
    burnLock2()
    voteList()
  
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
        bond = await BOND.new(base.address)
        bondtwo = await BONDv.new(base.address)
        token1 = await TOKEN1.new();
        token2 = await TOKEN1.new();
      
        await base.listAsset(bond.address, _.BN2Str(allocation* _.one),_.BN2Str(18*_.one) ) // list bond
        await base.listAsset(bondtwo.address, _.BN2Str(5000000* _.one),_.BN2Str(1*_.one) ) // list bond
        await base.listAsset(token1.address, _.BN2Str(500000 * _.one),_.BN2Str(3*_.one) ) //list token 1
      
        await base.changeDAO(Dao.address)
        await Dao.setGenesisAddresses(router.address, utils.address)

        let supply = await token1.totalSupply()
        await token1.transfer(acc1, _.getBN(_.BN2Int(supply)/4)) // give acc1 token1 to burn
        await token1.transfer(acc2, _.getBN(_.BN2Int(supply)/4))
        await token1.transfer(acc3, _.getBN(_.BN2Int(supply)/4))

        await token1.approve(base.address, supply, {from:acc1})//approve base to burn token1 from acc1
        await base.claim(token1.address, _.BN2Str(_.one), {from: acc1}) // burn 1 token1 to get sparta
        //console.log(_.BN2Str(await base.balanceOf(acc1))/_.one)

        await wbnb.approve(router.address, supply, {from:acc1}) // approve router to add token1
        await token1.approve(router.address, supply, {from:acc1}) // approve router to add token1
        await base.approve(router.address, supply, {from:acc1}) //approve router to add base

        await wbnb.approve(bond.address, supply, {from:acc1}) // approve bond 
        await token1.approve(bond.address, supply, {from:acc1}) // approve bond 
        await base.approve(bond.address, supply, {from:acc1})
        await wbnb.approve(bondtwo.address, supply, {from:acc1}) // approve bond 
        await token1.approve(bondtwo.address, supply, {from:acc1}) // approve bond 
        await base.approve(bondtwo.address, supply, {from:acc1})
        await base.approve('0x93892e7ef9ab548bcb7b00354a51a84a4fe94cd7',supply, {from:acc1})
        await wbnb.approve('0x93892e7ef9ab548bcb7b00354a51a84a4fe94cd7',supply, {from:acc1})
        await token1.approve('0x93892e7ef9ab548bcb7b00354a51a84a4fe94cd7',supply, {from:acc1})
        
        await token1.approve(base.address, supply, {from:acc2})//approve base to burn token1 from acc1
        await token1.approve(base.address, supply, {from:acc3})//approve base to burn token1 from acc1
        await base.claim(token1.address, _.BN2Str(_.one), {from: acc2}) // burn 1 token1 to get sparta
        await base.claim(token1.address, _.BN2Str(_.one), {from: acc3}) // burn 1 token1 to get sparta
        //console.log(_.BN2Str(await base.balanceOf(acc1))/_.one)

        await wbnb.approve(router.address, supply, {from:acc2}) // approve router to add wbnb
        await token1.approve(router.address, supply, {from:acc2}) // approve router to add token1
        await base.approve(router.address, supply, {from:acc2}) //approve router to add base
        await token1.approve(router.address, supply, {from:acc3}) // approve router to add token1
        await base.approve(router.address, supply, {from:acc3}) //approve router to add base

        await wbnb.approve(bond.address, supply, {from:acc2}) // approve bond 
        await token1.approve(bond.address, supply, {from:acc2}) // approve bond 
        await base.approve(bond.address, supply, {from:acc2})
        await wbnb.approve(bondtwo.address, supply, {from:acc2}) // approve bond 
        await token1.approve(bondtwo.address, supply, {from:acc2}) // approve bond 
        await base.approve(bondtwo.address, supply, {from:acc2})
        await base.approve('0x93892e7ef9ab548bcb7b00354a51a84a4fe94cd7',supply, {from:acc2})
        await wbnb.approve('0x93892e7ef9ab548bcb7b00354a51a84a4fe94cd7',supply, {from:acc2})

        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

        
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
        await bondtwo.approve(base.address, lockBalBefore, {from:acc0})
        expect(_.BN2Str(await bond.allowance(acc0, base.address))).to.equal(_.BN2Str(lockBalBefore));
        let tx = await bond.burnBond()
        let tx1 = await bondtwo.burnBond()
        let lockBalAfter = await bond.balanceOf(bond.address)
        assert.equal(lockBalAfter,'0',  'bond was burnt')
        let spartaBalAfter = await base.balanceOf(bond.address)
        assert.equal(_.BN2Str(spartaBalAfter/_.one),allocation, 'did it get 5m sparta')
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
async function createPoolBNB() {
    it("It should deploy BNB Pool", async () => {
        var _pool = await router.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one), _.BNB, {from: acc1,value:_.BN2Str(_.one)})
        await router.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one), _.BNB, {from: acc1, value:_.BN2Str(_.one)})
        poolBNB = await POOL.at(_pool)

        //console.log(`Pools: ${poolWBNB.address}`)
        const baseAddr = await poolBNB.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        assert.equal(_.BN2Str(await base.balanceOf(poolBNB.address)), _.BN2Str(_.one * 10), 'base balance')
    })
}
async function depositBNB(acc){
    it(`It should deposit and bond into dao `, async () => {
        let asset = _.BNB
        let amount = _.BN2Str(_.one)
        let poolData = await utils.getPoolData(asset);
        let spartaAllocation = await utils.calcTokenPPinBase(asset,amount)
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolBNB.totalSupply()))
        let units = _.getBN(await utils.calcLiquidityUnits(spartaAllocation, B, amount, T, poolUnits))
        DEPOTime = _.getBN((new Date())/1000)
       let tx = await bond.deposit(asset, amount,{from:acc, value:amount})
       let memberDetails = await bond.getMemberDetails(acc, asset);
       assert.equal(_.BN2Str(memberDetails.bondedLP), _.BN2Str(units), 'bonded LP')
       let poolData2 = await utils.getPoolData(asset);
       let spartaAllocation2 = await utils.calcValueInBase(asset,amount)
       var Bb = _.getBN(poolData2.baseAmount)
       var Tt = _.getBN(poolData2.tokenAmount)
       poolUnits2 = _.getBN((await poolBNB.totalSupply()))
       let units2 = _.getBN(await utils.calcLiquidityUnits(spartaAllocation2, Bb, amount, Tt, poolUnits2))
       DEPOTime2 = _.getBN((new Date())/1000)
       let tx1 = await bondtwo.deposit(asset, amount,{from:acc, value:amount})
       let memberDetails2 = await bondtwo.getMemberDetails(acc, asset);
        assert.equal(_.BN2Str((await poolBNB.totalSupply())), _.BN2Str(poolUnits.plus(units).plus(units2)), 'poolUnits')
        assert.equal(_.BN2Str(memberDetails2.bondedLP), _.BN2Str(units2.times(75).div(100)), 'bonded LP')

    })
}
async function depositTKN(acc){
    it(`It should deposit and bond into dao`, async () => {
        let asset = token1.address
        let amount = _.BN2Str(_.one)
        let poolData = await utils.getPoolData(asset);
        let spartaAllocation = await utils.calcTokenPPinBase(asset,amount)
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolTKN1.totalSupply()))
        let units = _.getBN(await utils.calcLiquidityUnits(spartaAllocation, B, amount, T, poolUnits))
        DEPOTime = _.getBN((new Date())/1000)
        let lockLPBalB =  _.BN2Str(await poolTKN1.balanceOf(bond.address))
        await bond.deposit(asset, amount,{from:acc})
        let memberDetails = await bond.getMemberDetails(acc, asset);
        let lockLPBal =  _.getBN(await poolTKN1.balanceOf(bond.address))
       assert.equal(lockLPBal.minus(units), lockLPBalB, 'got LP')
        assert.equal(_.BN2Str((await poolTKN1.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
        assert.equal(_.BN2Str(memberDetails.bondedLP), _.BN2Str(units.plus(lockLPBalB)), 'bonded LP')

    })
}
async function claimLPAndLockTNK(acc, ms){
    it(`It should claim vesting Token LPs after ${ms/1000} seconds`, async () => {
        await sleep(ms)
        let asset = token1.address
        let balBefore = _.getBN(await poolTKN1.balanceOf(Dao.address))
        let now = _.getBN((new Date())/1000)
        let memberDetailsBefore = await bond.getMemberDetails(acc, asset);
        let bondedLPBefore = _.BN2Int(memberDetailsBefore.bondedLP)
        let claimRate = _.BN2Str(memberDetailsBefore.claimRate)
        await bond.claimAndLock(asset,{from:acc})
        let calcClaimable = _.floorBN(now.minus(DEPOTime).times(claimRate))
        let memberDetailsAfter = await bond.getMemberDetails(acc, asset);
        let bondedLPAfter = _.getBN(memberDetailsAfter.bondedLP)
        let balAfter = _.getBN(await poolTKN1.balanceOf(Dao.address))
        assert.isAtLeast(_.BN2Int(balBefore.plus(9008584171235832928)), _.BN2Int(balAfter))
        assert.isAtLeast(_.BN2Int(bondedLPAfter.plus(9008584171235832928)), bondedLPBefore)
    })
    
}
async function claimLPAndLock(acc, ms){
    it(`It should claim and bond into DAO LPs after ${ms/1000} seconds`, async () => {
        await sleep(ms)
        let asset = _.BNB
        let now = _.getBN((new Date())/1000)
        let balBefore = _.getBN(await poolBNB.balanceOf(Dao.address))
        let memberDetailsBefore = await bond.getMemberDetails(acc, asset);
        let bondedLPBefore = _.getBN(memberDetailsBefore.bondedLP)
        let claimRate = _.BN2Str(memberDetailsBefore.claimRate)
        let tx = await bondtwo.claim(asset,{from:acc})
        let accBal = _.getBN(await poolBNB.balanceOf(acc))
        await bond.claimAndLock(asset,{from:acc})
        let memberDetailsAfter = await bond.getMemberDetails(acc, asset);
        let bondedLPAfter = _.getBN(memberDetailsAfter.bondedLP)
        let balAfter = _.getBN(await poolBNB.balanceOf(Dao.address))
        assert.isAtLeast(_.BN2Int(balBefore.plus('1875000000000000000').plus(accBal)), _.BN2Int(balAfter))
        assert.isAtLeast(_.BN2Int(bondedLPBefore.minus('1875000000000000000')), _.BN2Int(bondedLPAfter))
    })
    
}
async function deployerBurnBaseBalance(){
    it(`Deployer burn base from bond`, async () => {
        await bond.burnBalance();
        let bal = _.BN2Str(await base.balanceOf(bond.address))
        assert.equal(bal, 0, 'balance burnt');
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
async function attackerListAsset(){
    it('should fail to list asset from attacker', async () =>{
        let attacker = acc3;
        let asset = token1.address;
        try {
            await bond.listBondAsset(asset, {from:attacker});
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
        await bond.listBondAsset(asset, {from:deployer});
        await bondtwo.listBondAsset(asset, {from:deployer});

    })
}
async function deployerListBNB(){
    it('deployer list bnb asset', async () =>{
        let deployer = acc0;
        let asset = _.BNB;
        await bond.listBondAsset(asset, {from:deployer});
        await bondtwo.listBondAsset(asset, {from:deployer});

    })
}
async function claimAfterPeriod(acc, ms){
    it('claim correct mount after time-locked period', async () =>{
        await sleep(ms)
        let asset = _.BNB
        await bondtwo.claim(asset,{from:acc})
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
        await bondtwo.changeBondingPeriod(seconds, {from:acc0});
        let secondsPerYearA = _.BN2Str(await bond.bondingPeriodSeconds());
        assert.equal(secondsPerYearA, seconds, 'deployer change bond period in seconds')
    })
}
async function deployerMintBond(){
    it('deployer mint BOND', async () =>{
        let deployer = acc0;
        let amount = _.BN2Str(_.one);
        await bond.mintBond({from:deployer});
        let totalSupply = _.BN2Str(await bond.totalSupply());
        assert.equal(totalSupply, amount, "total supply bond")

    })
}
async function checkLockSupply2(){
    it("Check total Bond Supply to be 1", async () => {
        let lockSupply = await bond.totalSupply()
        assert.equal(lockSupply,_.BN2Str(_.one), '1 Lock exists')
})
}
async function lockTKN(acc, amount) {
    it("It should bond into dao", async () => {
        // let balance = await poolTKN1.balanceOf(acc)
        // //console.log(`balance: ${balance}`)
        // await poolTKN1.approve(Dao.address, balance, { from: acc })
        await Dao.deposit(poolTKN1.address, amount, { from: acc })
        //console.log(`isMember: ${await Dao.isMember(acc)}`)
        //console.log(`mapMemberPool_balance: ${await Dao.mapMemberPool_balance(acc, poolWBNB.address)}`)
        //console.log(`totalWeight: ${await Dao.totalWeight()}`)
        //console.log(`mapMember_weight: ${await Dao.mapMember_weight(acc)}`)
        //console.log(`rate: ${_.getBN(await Dao.mapMember_weight(acc)).div(_.getBN(await Dao.totalWeight()))}`)
    })
}
async function addLiquidityTKN1(acc) {
    it("Acc should add liquidity ", async () => {
        await router.addLiquidity(_.BN2Str(_.one * 15), _.BN2Str(_.one * 200), token1.address, { from: acc})
    })
}
async function voteList() {
    it("Proposal to LIST bonding asset", async () => {
        let balBefore = _.BN2Str(await base.balanceOf(acc1))
        await bond.newAddressProposal(token2.address, 'LIST',{ from: acc1 })
        let proposalCount = _.BN2Str(await bond.proposalCount())
        await bond.voteProposal(proposalCount, { from: acc1 })
        await bond.voteProposal(proposalCount, { from: acc2 })
        await sleep(2100)
        await bond.finaliseProposal(proposalCount)
        assert.equal(await bond.isListed(token2.address), true)
        assert.equal(_.BN2Str(await base.balanceOf(acc1)),balBefore-100*10**18, )
    })
    it("Proposal to DELIST bonding asset", async () => {
        let balBefore = _.BN2Str(await base.balanceOf(acc1))
        await bond.newAddressProposal(token2.address, 'DELIST', { from: acc1 })
        let proposalCount = _.BN2Str(await bond.proposalCount())
        await bond.voteProposal(proposalCount, { from: acc1 })
        await bond.voteProposal(proposalCount, { from: acc2 })
        await sleep(2100)
        await bond.finaliseProposal(proposalCount)
        assert.equal(await bond.isListed(token2.address), false)
        assert.equal(_.BN2Str(await base.balanceOf(acc1)),balBefore-100*10**18, )
    })
}
async function mintBond() {
    it("Final Proposal should mint another bond", async () => {
        assert.equal(await bond.totalSupply(), '0')
        await bond.newActionProposal('MINT', { from: acc1 })
        let proposalCount = _.BN2Str(await bond.proposalCount())
        await bond.voteProposal(proposalCount, { from: acc1 })
        await bond.voteProposal(proposalCount, { from: acc2 })
        await sleep(2100)
        await bond.finaliseProposal(proposalCount)
        assert.equal(await bond.totalSupply(), '1000000000000000000')
    })
}
async function burnLock2(){
    it("Burn Bond for Allocation", async () => {
        let lockBalBefore = await bond.totalSupply()
        let spartaBalBefore = _.getBN(await base.balanceOf(bond.address))
        await bond.approve(base.address, lockBalBefore, {from:acc0})
        expect(_.BN2Str(await bond.allowance(acc0, base.address))).to.equal(_.BN2Str(lockBalBefore));
        let tx = await bond.burnBond()
        let lockBalAfter = _.BN2Str(await bond.balanceOf(bond.address))
        assert.equal(lockBalAfter,'0',  'bond was burnt')
        let spartaBalAfter = _.getBN(await base.balanceOf(bond.address))
        assert.equal(_.BN2Str(spartaBalAfter.minus(spartaBalBefore)/_.one),allocation, 'did it get sparta')
        
    })
}
async function rate() {
    it("It should check rates", async () => {
        console.log(`acc0 rate: ${await Dao.mapMember_weight(acc0)} ${_.getBN(await Dao.mapMember_weight(acc0)).div(_.getBN(await Dao.totalWeight()))}`)
        console.log(`acc1 rate: ${await Dao.mapMember_weight(acc1)} ${_.getBN(await Dao.mapMember_weight(acc1)).div(_.getBN(await Dao.totalWeight()))}`)
        console.log(`acc2 rate: ${await Dao.mapMember_weight(acc2)} ${_.getBN(await Dao.mapMember_weight(acc2)).div(_.getBN(await Dao.totalWeight()))}`)
        console.log(`acc3 rate: ${await Dao.mapMember_weight(acc3)} ${_.getBN(await Dao.mapMember_weight(acc3)).div(_.getBN(await Dao.totalWeight()))}`)

    })
}
async function changeCoolPeriod(){
    it("It should check rates", async () => {
    await bond.changeCoolOff(1, {from:acc0});
})
}



