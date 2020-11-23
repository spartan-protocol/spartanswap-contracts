
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
var BOND = artifacts.require("./Bond.sol");
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
    burnLock()
    createPoolTKN1()
    deployerListTKN()
    depositTKN()
    removeLiquidity()
    swapToBase()
     swapToBase2()
     swapToBase3()
    swapToBase4()
    swapToBase5()
    swapToBase6()
    swapToBase7()
    swapToBase8()
    swapToBase9()
    swapToBase10()

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
        lock = await BOND.new(base.address)
        token1 = await TOKEN1.new();
      
        await base.listAsset(lock.address, _.BN2Str(5000000 * _.one),_.BN2Str(_.one) ) // list lock
        await base.listAsset(token1.address, _.BN2Str(500000 * _.one),_.BN2Str(2*_.one) ) //list token 1
      
        await base.changeDAO(Dao.address)
        await Dao.setGenesisAddresses(router.address, utils.address)

        let supply = await token1.totalSupply()

        await token1.transfer(acc2, _.getBN(_.BN2Int(supply))) // give acc1 token1 to burn
        await token1.approve(base.address, supply, {from:acc2})//approve base to burn token1 from acc1
        
        await base.claim(token1.address, _.BN2Str(_.one), {from: acc2}) // burn 1 token1 to get sparta


        await token1.approve(router.address, supply, {from:acc2}) // approve router to add token1
        await base.approve(router.address, supply, {from:acc2}) //approve router to add base

        await token1.approve(lock.address, supply, {from:acc2}) // approve lock 
        await base.approve(lock.address, supply, {from:acc2})
        await base.approve('0x93892e7ef9ab548bcb7b00354a51a84a4fe94cd7',supply, {from:acc2})

        
    });
}



async function burnLock(){
    it("Burn Lock for Allocation", async () => {
        let lockBalBefore = await lock.balanceOf(lock.address)
        assert.equal(_.BN2Str(lockBalBefore), _.BN2Str(_.one), '1 lock exist')
        let spartaBalBefore = await base.balanceOf(lock.address)
        assert.equal(spartaBalBefore,'0', 'Sparta balance zero')
        await lock.approve(base.address, lockBalBefore, {from:acc0})
        expect(_.BN2Str(await lock.allowance(acc0, base.address))).to.equal(_.BN2Str(lockBalBefore));
        let tx = await lock.burnBond()
        let lockBalAfter = await lock.balanceOf(lock.address)
        assert.equal(lockBalAfter,'0',  'lock was burnt')
        let spartaBalAfter = await base.balanceOf(lock.address)
        assert.equal(_.BN2Str(spartaBalAfter/_.one),'5000000', 'did it get 5m sparta')
    })
}

async function createPoolTKN1() {
    it("It should deploy TKN1 Pool", async () => {
        var _pool = await router.createPool.call(_.BN2Str(_.one * 100), _.BN2Str(1*_.one), token1.address, {from:acc2})
        await router.createPool(_.BN2Str(_.one * 1), _.BN2Str(0.1*_.one), token1.address, {from:acc2})
        poolTKN1 = await POOL.at(_pool,{from:acc2})
        poolUnits = _.getBN((await poolTKN1.totalSupply()))
        console.log(_.BN2Str(poolUnits/_.one));
    })
}

async function deployerListTKN(){
    it('deployer list TKN asset', async () =>{
        let deployer = acc0;
        let asset = token1.address;
        await lock.listBondAsset(asset, {from:deployer});

    })
}

async function depositTKN(){
    it(`It should deposit and recieve  back`, async () => {
        let asset = token1.address
        let amount = _.BN2Str(500000*_.one)
        let spartaAllocation = await utils.calcValueInBase(asset,amount) 
        console.log(`spartaAllocation - ${spartaAllocation/_.one}`)
        let poolData = await utils.getPoolData(asset);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolTKN1.totalSupply()))
        let units = _.getBN(await utils.calcLiquidityUnits(spartaAllocation, B, amount, T, poolUnits))
        let unitsAdj = units.times(2500).div(10000)
        let spBal = _.BN2Str(await base.balanceOf(lock.address))
        console.log(`lock sparta bal ${spBal/_.one}`)
        await lock.deposit(asset, amount,{from:acc2})
 
    })
}
async function removeLiquidity() {
    it(`remove liquidity`, async () => {
        let token = token1.address
        let balanceBefore = _.BN2Str(await base.balanceOf(acc2));
        let spBal = _.BN2Str(await base.balanceOf(lock.address))
        let tnkBalB = _.BN2Str(await token1.balanceOf(acc2))
        let tx = await router.removeLiquidity(10000, token, { from: acc2})
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        console.log(`base - ${B/_.one}`)
        console.log(`tkn - ${T/_.one}`)
        let balanceA = _.BN2Str(await base.balanceOf(acc2));
        console.log(`sparta account bal - ${balanceA/_.one - balanceBefore/_.one}`)

  
    })
}
async function swapToBase() {
    it(`swap tkn `, async () => {
        let token = token1.address
        let balanceBefore = _.BN2Str(await base.balanceOf(acc2));
        let spBal = _.BN2Str(await base.balanceOf(lock.address))
        let tnkBalB = _.BN2Str(await token1.balanceOf(acc2))
        let tx = await router.sell( _.BN2Str(_.one * 380000), token, { from: acc2})
        let balanceA = _.BN2Str(await base.balanceOf(acc2));
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        console.log(`base - ${B/_.one}`)
        console.log(`tkn - ${T/_.one}`)
        console.log(`sparta account bal - ${balanceA/_.one}`)
  
  
    })
}

async function swapToBase2() {
    it(`swap tkn `, async () => {
        let token = token1.address
        let balanceBefore = _.BN2Str(await base.balanceOf(acc2));
        let spBal = _.BN2Str(await base.balanceOf(lock.address))
        let tnkBalB = _.BN2Str(await token1.balanceOf(acc2))
        let tx = await router.sell( _.BN2Str(_.one * 760000), token, { from: acc2})
        let balanceA = _.BN2Str(await base.balanceOf(acc2));
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        console.log(`base - ${B/_.one}`)
        console.log(`tkn - ${T/_.one}`)
        console.log(`sparta account bal - ${balanceA/_.one}`)
  
 
  
    })
}
async function swapToBase3() {
    it(`swap tkn `, async () => {
        let token = token1.address
        let balanceBefore = _.BN2Str(await base.balanceOf(acc2));
        let spBal = _.BN2Str(await base.balanceOf(lock.address))
        let tnkBalB = _.BN2Str(await token1.balanceOf(acc2))
        let tx = await router.sell( _.BN2Str(_.one * 1520000), token, { from: acc2})
        let balanceA = _.BN2Str(await base.balanceOf(acc2));
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        console.log(`base - ${B/_.one}`)
        console.log(`tkn - ${T/_.one}`)
        console.log(`sparta account bal - ${balanceA/_.one}`)
  
    })
}
async function swapToBase4() {
    it(`swap tkn `, async () => {
        let token = token1.address
        let balanceBefore = _.BN2Str(await base.balanceOf(acc2));
        let spBal = _.BN2Str(await base.balanceOf(lock.address))
        let tnkBalB = _.BN2Str(await token1.balanceOf(acc2))
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        console.log(`base - ${B/_.one}`)
        console.log(`tkn - ${T/_.one}`)

        let tx = await router.sell( _.BN2Str(_.one * 3040000), token, { from: acc2})
        let balanceA = _.BN2Str(await base.balanceOf(acc2));
        console.log(`sparta account bal - ${balanceA/_.one}`)

  
    })
}
async function swapToBase5() {
    it(`swap tkn `, async () => {
        let token = token1.address
        let balanceBefore = _.BN2Str(await base.balanceOf(acc2));
        let spBal = _.BN2Str(await base.balanceOf(lock.address))
        let tnkBalB = _.BN2Str(await token1.balanceOf(acc2))
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        console.log(`base - ${B/_.one}`)
        console.log(`tkn - ${T/_.one}`)

        let tx = await router.sell( _.BN2Str(_.one * 6080000), token, { from: acc2})
        let balanceA = _.BN2Str(await base.balanceOf(acc2));
        console.log(`sparta account bal - ${balanceA/_.one}`)

  
    })
}
async function swapToBase6() {
    it(`swap tkn `, async () => {
        let token = token1.address
        let balanceBefore = _.BN2Str(await base.balanceOf(acc2));
        let spBal = _.BN2Str(await base.balanceOf(lock.address))
        let tnkBalB = _.BN2Str(await token1.balanceOf(acc2))
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        console.log(`base - ${B/_.one}`)
        console.log(`tkn - ${T/_.one}`)

        let tx = await router.sell( _.BN2Str(_.one * 12160000), token,{ from: acc2})
        let balanceA = _.BN2Str(await base.balanceOf(acc2));
        console.log(`sparta account bal - ${balanceA/_.one}`)

  
    })
}
async function swapToBase7() {
    it(`swap tkn `, async () => {
        let token = token1.address
        let balanceBefore = _.BN2Str(await base.balanceOf(acc2));
        let spBal = _.BN2Str(await base.balanceOf(lock.address))
        let tnkBalB = _.BN2Str(await token1.balanceOf(acc2))
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        console.log(`base - ${B/_.one}`)
        console.log(`tkn - ${T/_.one}`)

        let tx = await router.sell( _.BN2Str(_.one * 24320000), token,  { from: acc2})
        let balanceA = _.BN2Str(await base.balanceOf(acc2));
        console.log(`sparta account bal - ${balanceA/_.one}`)


    })
}
async function swapToBase8() {
    it(`swap tkn `, async () => {
        let token = token1.address
        let balanceBefore = _.BN2Str(await base.balanceOf(acc2));
        let spBal = _.BN2Str(await base.balanceOf(lock.address))
        let tnkBalB = _.BN2Str(await token1.balanceOf(acc2))
        console.log(`tkn bal before ${tnkBalB/_.one}`)
       
        let tx = await router.sell( _.BN2Str(_.one * 45184000), token, { from: acc2})
        let balanceA = _.BN2Str(await base.balanceOf(acc2));
        console.log(`sparta account bal - ${balanceA/_.one}`)
        let tnkBalA = _.BN2Str(await token1.balanceOf(acc2))
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        console.log(`base - ${B/_.one}`)
        console.log(`tkn - ${T/_.one}`)

    })
}
async function swapToBase9() {
    it(`swap tkn `, async () => {
        let token = token1.address
        let balanceBefore = _.BN2Str(await base.balanceOf(acc2));
        let spBal = _.BN2Str(await base.balanceOf(lock.address))
        let tnkBalB = _.BN2Str(await token1.balanceOf(acc2))
        console.log(`tkn bal before ${tnkBalB/_.one}`)
       
        let tx = await router.sell( _.BN2Str(_.one * 90368000), token, { from: acc2})
        let balanceA = _.BN2Str(await base.balanceOf(acc2));
        console.log(`sparta account bal - ${balanceA/_.one}`)
        let tnkBalA = _.BN2Str(await token1.balanceOf(acc2))
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        console.log(`base - ${B/_.one}`)
        console.log(`tkn - ${T/_.one}`)

    })
}
async function swapToBase10() {
    it(`swap tkn `, async () => {
        let token = token1.address
        let balanceBefore = _.BN2Str(await base.balanceOf(acc2));
        let spBal = _.BN2Str(await base.balanceOf(lock.address))
        let tnkBalB = _.BN2Str(await token1.balanceOf(acc2))
        console.log(`tkn bal before ${tnkBalB/_.one}`)
       
        let tx = await router.sell( _.BN2Str(_.one * 180736000), token, { from: acc2})
        let balanceA = _.BN2Str(await base.balanceOf(acc2));
        console.log(`sparta account bal - ${balanceA/_.one}`)
        let tnkBalA = _.BN2Str(await token1.balanceOf(acc2))
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        console.log(`base - ${B/_.one}`)
        console.log(`tkn - ${T/_.one}`)

    })
}






