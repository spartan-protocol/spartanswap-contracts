
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

contract('Synthetics', function (accounts) {
    constructor(accounts)
    
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

        

        
    });
}



async function createPoolBNB() {
    it("It should deploy BNB Pool", async () => {
        var _pool = await router.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one), _.BNB, {from: acc1,value:_.BN2Str(_.one)})
        await router.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one), _.BNB, {from: acc1, value:_.BN2Str(_.one)})
        poolWBNB = await POOL.at(_pool)
        //console.log(`Pools: ${poolWBNB.address}`)
        const baseAddr = await poolWBNB.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(_.one * 10), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(_.one), 'bnb balance')

        let supply = await base.totalSupply()
        await base.approve(poolWBNB.address, supply, { from: acc0 })
        await base.approve(poolWBNB.address, supply, { from: acc1 })
    })
}

async function addLiquidity(acc) {
    it("It should add liquidity", async () => {
         let token = _.BNB
        //let token = token1.address
        let y = _.BN2Str(_.one * 10)
        let x = _.BN2Str(_.one * 100)
        await router.addLiquidity(x, y, token, { from: acc, value:y})
    })
}

async function depositBNB(acc){
    it("It should deposit asset and receive half LP", async () => {
        let tnk = _.BNB
        let amount = _.BN2Str(_.one)
        let spartaAllocation = await utils.calcValueInBase(tnk,amount)
        let poolData = await utils.getPoolData(tnk);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolWBNB.totalSupply()))
        let units = _.getBN(await utils.calcLiquidityUnits(spartaAllocation, B, amount, T, poolUnits))
        let unitsAdj = units.times(5000).div(10000)
        let balBefore = _.getBN(await poolWBNB.balanceOf(acc))
        await lock.deposit(tnk, amount,{from:acc, value:amount})
        let balAfter = _.getBN(await poolWBNB.balanceOf(acc))
        assert.equal(_.BN2Str((await poolWBNB.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
        assert.equal(_.BN2Str(_.floorBN(balBefore.plus(unitsAdj))), _.BN2Str(balAfter), 'lp tokens')
        assert.equal(_.BN2Str(await lock.mapMember_lockedLP(acc)), _.BN2Str(await poolWBNB.balanceOf(acc)), 'locked LP')

    })
}

