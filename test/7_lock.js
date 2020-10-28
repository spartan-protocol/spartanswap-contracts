
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
var TOKEN1 = artifacts.require("./Token1.sol");
var LOCK = artifacts.require("./LOCK.sol");
var WBNB = artifacts.require("./WBNB");
var base;
var utils; var router; var Dao;

var acc0; var acc1; var acc2; var acc3;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

contract('LOCK', function (accounts) {
    constructor(accounts)
    //whitelist LOCK Token
    //whitelist BNB Token
    //add bnb sparta pool
    //deposit 1 bnb
    //claim lp tokens
    checkLockSupply()
    checkListed()
    createPoolTKN1()
    addLiquidityTKN1(acc1, _.BN2Str(_.one * 100), _.BN2Str(_.one * 100))
     burnLock()
     depositTKN()
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

        await base.listAsset(lock.address, _.BN2Str(5000000 * _.one),_.BN2Str(_.one) )
        
        await base.changeDAO(Dao.address)
        await Dao.setGenesisAddresses(router.address, utils.address)

        token1 = await TOKEN1.new();
        let supply = await token1.totalSupply()
        await base.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await token1.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(lock.address, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
    });
}

async function checkLockSupply(){
    it("It should mint 1 Lock", async () => {
        let lockSupply = await lock.totalSupply()
        assert.equal(_.BN2Str(_.one), lockSupply, '1 Lock exists')
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
        assert.equal(lockBalBefore, _.BN2Str(_.one), '1 lock exist')
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
        var _pool = await router.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one), token1.address)
        await router.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one), token1.address)
        poolTKN1 = await POOL.at(_pool)
        //console.log(`Pools: ${poolTKN1.address}`)
        const baseAddr = await poolTKN1.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN1.address)), _.BN2Str(_.one * 10), 'base balance')
        assert.equal(_.BN2Str(await token1.balanceOf(poolTKN1.address)), _.BN2Str(_.one), 'token1 balance')

        let supply = await base.totalSupply()
        await base.approve(poolTKN1.address, supply, { from: acc0 })
        await base.approve(poolTKN1.address, supply, { from: acc1 })
    })
}

async function addLiquidityTKN1(acc, x, y) {

    it(`It should addLiquidity BNB from ${acc}`, async () => {
        let token = token1.address
        let poolData = await utils.getPoolData(token);
        var X = _.getBN(poolData.baseAmount)
        var Y = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolTKN1.totalSupply()))
        //console.log('start data', _.BN2Str(X), _.BN2Str(Y), _.BN2Str(poolUnits))

        let units = math.calcLiquidityUnits(x, X, y, Y, poolUnits)
        // console.log(_.BN2Str(units), _.BN2Str(x), _.BN2Str(X), _.BN2Str(y), _.BN2Str(Y), _.BN2Str(poolUnits))
        
        let tx = await router.addLiquidity(x, y, token, { from: acc})
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(Y.plus(y)))
        assert.equal(_.BN2Str(poolData.baseAmountPooled), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str(poolData.tokenAmountPooled), _.BN2Str(Y.plus(y)))
        assert.equal(_.BN2Str((await poolTKN1.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
        assert.equal(_.BN2Str(await poolTKN1.balanceOf(acc)), _.BN2Str(units), 'units')
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN1.address)), _.BN2Str(X.plus(x)), 'base balance')
        assert.equal(_.BN2Str(await token1.balanceOf(poolTKN1.address)), _.BN2Str(Y.plus(y)), 'wbnb balance')
    })
}


async function depositTKN(){
    it("It should deposit lock asset ", async () => {
        let tnk = token1.address
        let amount = _.BN2Str(_.one)
        let spartaAllocation = await utils.calcValueInBase(tnk,amount)
        console.log(_.BN2Str(spartaAllocation/_.one))
        let spartaBal = await base.balanceOf(lock.address)
        let tokenBal = await token1.balanceOf(lock.address)
        console.log(_.BN2Str(spartaBal)/_.one)
        console.log(_.BN2Str(tokenBal)/_.one)
        let tx = await lock.deposit(tnk, amount, { from: acc1})
        



    })
}


