/*
################################################
Members and Pools
################################################
*/

const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');

var BASE = artifacts.require("./BaseMinted");
var DAO = artifacts.require("./Dao");
var ROUTER = artifacts.require("./Router");
var POOL = artifacts.require("./Pool");
var UTILS = artifacts.require("./Utils");
var TOKEN1 = artifacts.require("./Token1");
var WBNB = artifacts.require("./WBNB");

var base; var poolWBNB;  var utils; var token1; var token2;
var pool; var router; var Dao; var wbnb
var acc0; var acc1; var acc2; var acc3;

contract('ADD LIQUIDITY', function (accounts) {

    constructor(accounts)
    wrapBNB()
    createPoolWBNB()
    addLiquidity(acc1, _.BN2Str(_.one * 10), _.dot1BN)
    // Single swap
    swapBASEToBNB(acc0, _.BN2Str(_.one * 10))

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
        await base.changeDAO(Dao.address)
        await Dao.setGenesisAddresses(router.address, utils.address)
        // assert.equal(await Dao.DEPLOYER(), '0x0000000000000000000000000000000000000000', " deployer purged")
        // //console.log(await utils.BASE())
        // //console.log(await Dao.ROUTER())

        token1 = await TOKEN1.new();
        token2 = await TOKEN1.new();

        //console.log(`Acc0: ${acc0}`)
        //console.log(`base: ${base.address}`)
        //console.log(`dao: ${Dao.address}`)
        //console.log(`utils: ${utils.address}`)
        //console.log(`router: ${router.address}`)
        //console.log(`token1: ${token1.address}`)

        let supply = await token1.totalSupply()
        await base.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

        
    });
}

async function createPool() {
    it("It should deploy BNB Pool", async () => {
        var _pool = await router.createPool.call(_.BN2Str(_.one * 10), _.dot1BN, _.BNB, { value: _.dot1BN })
        await router.createPool(_.BN2Str(_.one * 10), _.dot1BN, _.BNB, { value: _.dot1BN })
        poolWBNB = await POOL.at(_pool)
        //console.log(`Pools: ${poolWBNB.address}`)
        const baseAddr = await poolWBNB.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(_.one * 10), 'base balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(poolWBNB.address)), _.BN2Str(_.dot1BN), 'BNBer balance')

        let supply = await base.totalSupply()
        await base.approve(poolWBNB.address, supply, { from: acc0 })
        await base.approve(poolWBNB.address, supply, { from: acc1 })
    })
}

async function wrapBNB() {
    it("It should wrap", async () => {
        await web3.eth.sendTransaction({to: wbnb.address, value:_.BN2Str(_.one), from:acc0});
        await wbnb.transfer(acc1, _.getBN(_.BN2Int(_.one)/3))
        await wbnb.transfer(acc2, _.getBN(_.BN2Int(_.one)/3))
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
    })
}

async function createPoolWBNB() {
    it("It should deploy BNB Pool", async () => {
        var _pool = await router.createPool.call(_.BN2Str(_.one * 10), _.dot1BN, wbnb.address)
        await router.createPool(_.BN2Str(_.one * 10), _.dot1BN, wbnb.address)
        poolWBNB = await POOL.at(_pool)
        //console.log(`Pools: ${poolWBNB.address}`)
        const baseAddr = await poolWBNB.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(_.one * 10), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(_.dot1BN), 'wbnb balance')

        let supply = await base.totalSupply()
        await base.approve(poolWBNB.address, supply, { from: acc0 })
        await base.approve(poolWBNB.address, supply, { from: acc1 })
    })
}

async function addLiquidity(acc, b, t) {

    it(`It should addLiquidity BNB from ${acc}`, async () => {
        let token = wbnb.address
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolWBNB.totalSupply()))
        //console.log('start data', _.BN2Str(B), _.BN2Str(T), _.BN2Str(poolUnits))

        let units = math.calcLiquidityUnits(b, B, t, T, poolUnits)
        // console.log(_.BN2Str(units), _.BN2Str(b), _.BN2Str(B), _.BN2Str(t), _.BN2Str(T), _.BN2Str(poolUnits))
        
        let tx = await router.addLiquidity(b, t, token, { from: acc})
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(B.plus(b)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.plus(t)))
        assert.equal(_.BN2Str(poolData.baseAmountPooled), _.BN2Str(B.plus(b)))
        assert.equal(_.BN2Str(poolData.tokenAmountPooled), _.BN2Str(T.plus(t)))
        assert.equal(_.BN2Str((await poolWBNB.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
        assert.equal(_.BN2Str(await poolWBNB.balanceOf(acc)), _.BN2Str(units), 'units')
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(B.plus(b)), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(T.plus(t)), 'wbnb balance')
    })
}

async function swapBASEToBNB(acc, b) {

    it(`It should buy BNB with BASE from ${acc}`, async () => {
        let token = wbnb.address
        let poolData = await utils.getPoolData(token);
        const B = _.getBN(poolData.baseAmount)
        const T = _.getBN(poolData.tokenAmount)
        //console.log('start data', _.BN2Str(B), _.BN2Str(T))

        let t = math.calcSwapOutput(b, B, T)
        let fee = math.calcSwapFee(b, B, T)
        //console.log(_.BN2Str(t), _.BN2Str(T), _.BN2Str(B), _.BN2Str(b), _.BN2Str(fee))
        
        let tx = await router.buy(b, token)
        poolData = await utils.getPoolData(token);

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(b))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(t))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.minus(t)))
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(B.plus(b)))

        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(T.minus(t)), 'wbnb balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(B.plus(b)), 'base balance')

        //await help.logPool(utils, _.BNB, 'BNB')
    })
}

