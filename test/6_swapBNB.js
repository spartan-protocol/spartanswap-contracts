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

var base; var poolWBNB; var poolTKN1; var utils; var token1; var token2;
var pool; var router; var Dao; var wbnb
var acc0; var acc1; var acc2; var acc3;

contract('BNB LOGIC', function (accounts) {

    constructor(accounts)
    // wrapBNB()
    createPoolBNB()
    addLiquidity(acc1, _.BN2Str(_.one * 100), _.BN2Str(_.one * 10))
    // // Single swap
    buyBNB(acc0, _.BN2Str(_.one * 10))
    sellBNB(acc0, _.BN2Str(_.one))
    swapBASE(acc0, _.BN2Str(_.one))
    swapBNB(acc0, _.BN2Str(_.one * 10))

    createPoolTKN1()
    addLiquidityTKN1(acc1, _.BN2Str(_.one * 100), _.BN2Str(_.one * 100))
    swapBNBtoTKN1(acc0, _.BN2Str(_.one * 10))

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

        await token1.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
    });
}

async function createPoolBNB() {
    it("It should deploy WBNB Pool", async () => {
        var _pool = await router.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one), _.BNB, {value:_.BN2Str(_.one)})
        await router.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one), _.BNB, {value:_.BN2Str(_.one)})
        poolWBNB = await POOL.at(_pool)
        //console.log(`Pools: ${poolWBNB.address}`)
        const baseAddr = await poolWBNB.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(_.one * 10), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(_.one), 'wbnb balance')

        let supply = await base.totalSupply()
        await base.approve(poolWBNB.address, supply, { from: acc0 })
        await base.approve(poolWBNB.address, supply, { from: acc1 })
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

async function addLiquidity(acc, x, y) {

    it(`It should addLiquidity BNB from ${acc}`, async () => {
        let token = _.BNB
        let poolData = await utils.getPoolData(token);
        var X = _.getBN(poolData.baseAmount)
        var Y = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolWBNB.totalSupply()))
        //console.log('start data', _.BN2Str(X), _.BN2Str(Y), _.BN2Str(poolUnits))

        let units = math.calcLiquidityUnits(x, X, y, Y, poolUnits)
        // console.log(_.BN2Str(units), _.BN2Str(x), _.BN2Str(X), _.BN2Str(y), _.BN2Str(Y), _.BN2Str(poolUnits))
        
        let tx = await router.addLiquidity(x, y, token, { from: acc, value:y})
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(Y.plus(y)))
        assert.equal(_.BN2Str(poolData.baseAmountPooled), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str(poolData.tokenAmountPooled), _.BN2Str(Y.plus(y)))
        assert.equal(_.BN2Str((await poolWBNB.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
        assert.equal(_.BN2Str(await poolWBNB.balanceOf(acc)), _.BN2Str(units), 'units')
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(X.plus(x)), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(Y.plus(y)), 'wbnb balance')
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

async function buyBNB(acc, x) {

    it(`It should buy WBNB with BASE from ${acc}`, async () => {

        let baseStart = _.getBN(await base.balanceOf(acc))
        let tokenStart = _.getBN(await wbnb.balanceOf(acc))

        let token = _.BNB
        let poolData = await utils.getPoolData(token);
        const X = _.getBN(poolData.baseAmount)
        const Y = _.getBN(poolData.tokenAmount)
        // await help.logPool(utils, token, 'WBNB')
        //console.log('start data', _.BN2Str(X), _.BN2Str(Y))

        let y = math.calcSwapOutput(x, X, Y)
        let fee = math.calcSwapFee(x, X, Y)
        // console.log(_.BN2Str(y), _.BN2Str(Y), _.BN2Str(X), _.BN2Str(x), _.BN2Str(fee))
        
        let tx = await router.buy(x, token)
        // console.log(tx)
        poolData = await utils.getPoolData(token);

        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(x))
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(y))
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(Y.minus(y)))
        
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(X.plus(x)), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(Y.minus(y)), 'wbnb balance')
        
        assert.equal(_.BN2Str(await base.balanceOf(acc)), _.BN2Str(baseStart.minus(x)), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(acc)), _.BN2Str(tokenStart.plus(y)), 'wbnb balance')
        // await help.logPool(utils, token, 'WBNB')
    })
}

async function sellBNB(acc, x) {

    it(`It should sell BNB to BASE from ${acc}`, async () => {
        
        let baseStart = _.getBN(await base.balanceOf(acc))
        // let tokenStart = _.getBN(await web3.eth.balance(acc))

        let token = _.BNB
        let poolData = await utils.getPoolData(token);
        const X = _.getBN(poolData.tokenAmount)
        const Y = _.getBN(poolData.baseAmount)
        // await help.logPool(utils, token, 'WBNB')
        //console.log('start data', _.BN2Str(X), _.BN2Str(Y))

        let y = math.calcSwapOutput(x, X, Y)
        let fee = math.calcSwapFee(x, X, Y)
        // console.log(_.BN2Str(x), _.BN2Str(X), _.BN2Str(y), _.BN2Str(Y), _.BN2Str(fee))

        let tx = await router.sell(x, token, {value:x})
        // console.log(tx.receipt.logs)
        // console.log(tx.receipt.rawLogs)

        poolData = await utils.getPoolData(token);

        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(x))
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(y))
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(Y.minus(y)))

        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(X.plus(x)), 'wbnb balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(Y.minus(y)), 'base balance')

        // assert.equal(_.BN2Str(await web3.eth.balance(acc)), _.BN2Str(tokenStart.minus(x)), 'wbnb balance')
        assert.equal(_.BN2Str(await base.balanceOf(acc)), _.BN2Str(baseStart.plus(y)), 'base balance')
        
        // await help.logPool(utils, token, 'WBNB')
    })
}

async function swapBASE(acc, x) {

    it(`It should swap from BNB to BASE from ${acc}`, async () => {
        let baseStart = _.getBN(await base.balanceOf(acc))
        // let tokenStart = _.getBN(await wbnb.balanceOf(acc))

        let fromToken = _.BNB
        let toToken = base.address
        let poolData = await utils.getPoolData(fromToken);
        const X = _.getBN(poolData.tokenAmount)
        const Y = _.getBN(poolData.baseAmount)
        //console.log('start data', _.BN2Str(X), _.BN2Str(Y))

        let y = math.calcSwapOutput(x, X, Y)
        let fee = math.calcSwapFee(x, X, Y)
        // console.log(_.BN2Str(x), _.BN2Str(X), _.BN2Str(y), _.BN2Str(Y), _.BN2Str(fee))
        
        let tx = await router.swap(x, fromToken, toToken, {value:x})
        // console.log(tx)
        poolData = await utils.getPoolData(fromToken);

        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(x))
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(y))
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(Y.minus(y)))

        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(X.plus(x)), 'wbnb balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(Y.minus(y)), 'base balance')

        // assert.equal(_.BN2Str(await wbnb.balanceOf(acc)), _.BN2Str(tokenStart.minus(x)), 'wbnb balance')
        assert.equal(_.BN2Str(await base.balanceOf(acc)), _.BN2Str(baseStart.plus(y)), 'base balance')
        
        //await help.logPool(utils, _.BNB, 'BNB')
    })
}

async function swapBNB(acc, x) {

    it(`It should swap from BASE to BNB from ${acc}`, async () => {
        let baseStart = _.getBN(await base.balanceOf(acc))
        let tokenStart = _.getBN(await wbnb.balanceOf(acc))

        let fromToken = base.address
        let toToken = _.BNB
        let poolData = await utils.getPoolData(toToken);
        const X = _.getBN(poolData.baseAmount)
        const Y = _.getBN(poolData.tokenAmount)
        //console.log('start data', _.BN2Str(X), _.BN2Str(Y))

        let y = math.calcSwapOutput(x, X, Y)
        let fee = math.calcSwapFee(x, X, Y)
        // console.log(_.BN2Str(y), _.BN2Str(Y), _.BN2Str(X), _.BN2Str(x), _.BN2Str(fee))
        
        let tx = await router.swap(x, fromToken, toToken)
        // console.log(tx)
        poolData = await utils.getPoolData(toToken);

        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(x))
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(y))
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(Y.minus(y)))
        
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(X.plus(x)), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(Y.minus(y)), 'wbnb balance')
        
        assert.equal(_.BN2Str(await base.balanceOf(acc)), _.BN2Str(baseStart.minus(x)), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(acc)), _.BN2Str(tokenStart.plus(y)), 'wbnb balance')
        //await help.logPool(utils, _.BNB, 'BNB')
    })
}

async function swapBNBtoTKN1(acc, x) {

    it(`It should swap from BASE to BNB from ${acc}`, async () => {
        // let wbnbStart = _.getBN(await wbnb.balanceOf(acc))
        let tokenStart = _.getBN(await token1.balanceOf(acc))

        let fromToken = _.BNB
        let toToken = token1.address
        let poolDataWBNB = await utils.getPoolData(fromToken);
        let poolDataTKN1 = await utils.getPoolData(toToken);
        const X = _.getBN(poolDataWBNB.tokenAmount)
        const Y = _.getBN(poolDataWBNB.baseAmount)
        const B = _.getBN(poolDataTKN1.baseAmount)
        const Z = _.getBN(poolDataTKN1.tokenAmount)
        //console.log('start data', _.BN2Str(X), _.BN2Str(Y))

        let y = math.calcSwapOutput(x, X, Y)
        let feey = math.calcSwapFee(x, X, Y)
        let z = math.calcSwapOutput(y, B, Z)
        let feez = math.calcSwapFee(y, B, Z)
        let fee = math.calcValueIn(feey, B.plus(y), Z.minus(z)).plus(feez)
        // console.log(_.BN2Str(y), _.BN2Str(Y), _.BN2Str(X), _.BN2Str(x), _.BN2Str(fee))
        
        let tx = await router.swap(x, fromToken, toToken, {value:x})
        // console.log(tx)
        poolDataWBNB = await utils.getPoolData(fromToken);
        poolDataTKN1 = await utils.getPoolData(toToken);

        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(x))
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(y))
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))
        
        assert.equal(_.BN2Str(poolDataWBNB.tokenAmount), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str(poolDataWBNB.baseAmount), _.BN2Str(Y.minus(y)))
        assert.equal(_.BN2Str(poolDataTKN1.baseAmount), _.BN2Str(B.plus(y)))
        assert.equal(_.BN2Str(poolDataTKN1.tokenAmount), _.BN2Str(Z.minus(z)))

        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(X.plus(x)), 'wbnb balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(Y.minus(y)), 'base balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN1.address)), _.BN2Str(B.plus(y)), 'base balance')
        assert.equal(_.BN2Str(await token1.balanceOf(poolTKN1.address)), _.BN2Str(Z.minus(z)), 'token1 balance')
        
        // assert.equal(_.BN2Str(await wbnb.balanceOf(acc)), _.BN2Str(wbnbStart.minus(x)), 'wbnb balance')
        assert.equal(_.BN2Str(await token1.balanceOf(acc)), _.BN2Str(tokenStart.plus(z)), 'token1 balance')
        //await help.logPool(utils, _.BNB, 'BNB')
    })
}

