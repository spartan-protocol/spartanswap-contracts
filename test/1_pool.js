const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');

var BASE = artifacts.require("./BaseMinted.sol");
var DAO = artifacts.require("./Dao.sol");
var ROUTER = artifacts.require("./Router.sol");
var RESERVE = artifacts.require("./Reserve.sol");
var POOL = artifacts.require("./Pool.sol");
var UTILS = artifacts.require("./Utils.sol");
var POOLFACTORY = artifacts.require("./poolFactory.sol");
var WBNB = artifacts.require("./WBNB");
var TOKEN = artifacts.require("./Token1.sol");
var base; var token1;  var token2; var wbnb;
var utils; var utils2; var router; var router2; var Dao; var Dao2;
var poolWBNB; var poolTKN1; var synthTNK2; var synthBNB;
var acc0; var acc1; var acc2; var acc3;
var allocation = 2500000;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
contract('ADD LIQUIDITY', function (accounts) {

    constructor(accounts)
    wrapBNB()
    createPoolWBNB()
    addLiquidity(acc1, _.BN2Str(_.one * 100), _.BN2Str(_.one * 10))
     removeLiquidityBNB(1000, acc1)
    addLiquidity(acc0, _.BN2Str(_.one * 50), _.BN2Str(_.one * 5))
     addLiquidityAsym(acc1,_.BN2Str(_.one * 1) )
     removeLiquidityBNBASYM(0, acc0)

})


//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
        //SPARTANPROTOCOLv2
        base = await BASE.new() // deploy base
        reserve = await RESERVE.new(base.address) // deploy base
        wbnb = await WBNB.new() // deploy wBNB
        Dao = await DAO.new(base.address)     // deploy daoV2
        router = await ROUTER.new(base.address, wbnb.address, Dao.address) //deploy router
        utils = await UTILS.new(base.address, router.address, Dao.address) // deploy utilsV2
        poolFactory = await POOLFACTORY.new(base.address,  wbnb.address, Dao.address) 
        token1 = await TOKEN.new()     
        await Dao.setGenesisAddresses(router.address, utils.address, utils.address, utils.address, utils.address,poolFactory.address, utils.address, reserve.address);
    
        await base.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(reserve.address, _.getBN(_.BN2Str(100000 * _.one)))
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await token1.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))

        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })


    });
}
async function wrapBNB() {
    it("It should wrap", async () => {
        await web3.eth.sendTransaction({to: wbnb.address, value:_.BN2Str(_.one*100), from:acc0});
        await wbnb.transfer(acc0, _.getBN(_.BN2Int(_.one * 30)))
        await wbnb.transfer(acc1, _.getBN(_.BN2Int(_.one * 30)))
        await wbnb.transfer(acc2, _.getBN(_.BN2Int(_.one * 30)))
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
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
async function addLiquidityAsym(acc, b) {

    it(`It should addLiquidity ASYM BNB from ${acc}`, async () => {
        let token = wbnb.address
        // let poolData = await utils.getPoolData(token);
        // var B = _.getBN(poolData.baseAmount)
        // var T = _.getBN(poolData.tokenAmount)
        // poolUnits = _.getBN((await poolWBNB.totalSupply()))
        // let before = _.getBN(await poolWBNB.balanceOf(acc))
        // let units = math.calcLiquidityUnits(b, B, t, T, poolUnits)
        let tx = await router.addLiquidityAsym(b,false, token,{from: acc, value:b})
    })
}
async function removeLiquidityBNB(bp, acc) {

    it(`It should removeLiquidity BNB for ${acc}`, async () => {
        let token = wbnb.address
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        let totalUnits = _.getBN((await poolWBNB.totalSupply()))
        let addLiquidityUnits = _.getBN(await poolWBNB.balanceOf(acc))
        let share = (addLiquidityUnits.times(bp)).div(10000)
        let b = _.floorBN((B.times(share)).div(totalUnits))
        let t = _.floorBN((T.times(share)).div(totalUnits))
        let tx = await router.removeLiquidity(bp, token, { from: acc})
        poolData = await utils.getPoolData(token);
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputBase), _.BN2Str(_.floorBN(b)), 'outputBase')
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputToken), _.BN2Str(_.floorBN(t)), 'outputToken')
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')
        assert.equal(_.BN2Str((await poolWBNB.totalSupply())), totalUnits.minus(share), 'poolUnits')
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Int(B.minus(b)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.minus(t)))
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Int(B.minus(b)), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(T.minus(t)), 'wbnb balance')
        assert.equal(_.BN2Str(await poolWBNB.balanceOf(acc)), _.BN2Str(addLiquidityUnits.minus(share)), 'addLiquidityrUnits')
    })
}
async function removeLiquidityBNBASYM(bp, acc) {
    it(`It should removeLiquidity asym BNB for ${acc}`, async () => {
        let token = _.BNB
        let addLiquidityUnits = _.getBN(await poolWBNB.balanceOf(acc))

        let tx = await router.removeLiquidityAsym(addLiquidityUnits,true, token,{ from: acc})
        

    })
}

