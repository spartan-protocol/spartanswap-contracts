const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');

var BASE = artifacts.require("./BaseMinted.sol");
var DAO = artifacts.require("./Dao.sol");
var ROUTER = artifacts.require("./Router.sol");
var POOL = artifacts.require("./Pool.sol");
var UTILS = artifacts.require("./Utils.sol");
var synthRouter = artifacts.require("./synthRouter.sol");
var SYNTH = artifacts.require("./synth.sol");
var BOND = artifacts.require("./Bond.sol");
var TOKEN = artifacts.require("./Token1.sol");
var TOKEN2 = artifacts.require("./Token2.sol");
var WBNB = artifacts.require("./WBNB");
var DAOVAULT = artifacts.require("./DaoVault.sol");
var LEVERAGE = artifacts.require("./Leverage.sol");
var CURATED = artifacts.require("./Curated.sol");

var base; var token1;  var token2; var wbnb;
var utils; var utils2; var router; var router2; var Dao; var Dao2;
var poolWBNB; var poolTKN1; var synthTNK2; var synthTKN2;
var acc0; var acc1; var acc2; var acc3;


contract('pRouter', function (accounts) {
    constructor(accounts)
    wrapBNB()
    createPoolWBNB(1000*_.one, 100*_.one)
    //createPoolTKN1(1000*_.one, 600*_.one)
    createPoolTKN2(4000*_.one, 130*_.one)
    addLiquidityBNB(acc0,_.BN2Str(20*_.one),  _.BN2Str(10*_.one));
    addLiquidityTKN2(acc0,  _.BN2Str(20*_.one),  _.BN2Str(10*_.one))
    curatePools();

    // // Single swap
     buyTOKEN(acc0, _.BN2Str(_.one * 1))
     sellTOKEN(acc0, _.BN2Str(_.one))
     swapBASE1(acc0, _.BN2Str(_.one*5))
     swapTOKEN1(acc0, _.BN2Str(_.one * 10))
     swapBASE1(acc0, _.BN2Str(_.one *2))
    swapTOKEN1(acc0, _.BN2Str(_.one * 12))
    swapBASE1(acc0, _.BN2Str(_.one*5))
    swapTOKEN1(acc0, _.BN2Str(_.one * 10))
    swapBASE1(acc0, _.BN2Str(_.one *2))
    swapBASE1(acc0, _.BN2Str(_.one*5))
    swapTOKEN1(acc0, _.BN2Str(_.one * 10))
    swapBASE1(acc0, _.BN2Str(_.one *2))
    swapTOKEN1(acc0, _.BN2Str(_.one * 12))
    swapBASE1(acc0, _.BN2Str(_.one*5))
    swapTOKEN1(acc0, _.BN2Str(_.one * 10))
    swapBASE1(acc0, _.BN2Str(_.one *2))
    swapTOKEN1(acc0, _.BN2Str(_.one * 12))
    swapBASE1(acc0, _.BN2Str(_.one*5))
    //double swap
    swapWBNBtoTKN2(acc0, _.BN2Str(_.one * 1))
    swapTKN2toWBNB(acc0, _.BN2Str(_.one * 1))

    swapTOKEN1(acc0, _.BN2Str(_.one * 1))
    swapBASE1(acc0, _.BN2Str(_.one *2))
    swapTOKEN1(acc0, _.BN2Str(_.one * 1))

     swapBASE(acc0, _.BN2Str(_.one))
     swapTOKEN(acc0, _.BN2Str(_.one * 1))

    removeLiquidityBNB(10000, acc0)
    


})


//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
        base = await BASE.new() // deploy base
        wbnb = await WBNB.new() // deploy wBNB
        utils = await UTILS.new(base.address) // deploy utilsV2
        Dao = await DAO.new(base.address)     // deploy daoV2
        router = await ROUTER.new(base.address, wbnb.address) //deploy router
        daoVault = await DAOVAULT.new(base.address);
        await base.changeDAO(Dao.address)     
        synthRouter = await synthRouter.new(base.address, wbnb.address) //deploy synthRouter
        bond = await BOND.new(base.address)     //deploy new bond
        curate = await CURATED.new(base.address, wbnb.address);
        token1 = await TOKEN.new()             //deploy token
        token2 = await TOKEN2.new() 
        leverage = await LEVERAGE.new(base.address,wbnb.address );

        await Dao.setGenesisAddresses(router.address, utils.address, synthRouter.address, bond.address, daoVault.address, curate.address);

        await base.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(router.address, _.getBN(_.BN2Str(100000 * _.one)))
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await base.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await base.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await base.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await token1.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await token1.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token1.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token1.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await token2.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await token2.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token2.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await token2.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token2.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token2.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await token2.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token2.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token2.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })

    });
}
async function wrapBNB() {
    it("It should wrap", async () => {
        await web3.eth.sendTransaction({to: wbnb.address, value:_.BN2Str(_.one*100), from:acc0});
        await wbnb.transfer(acc1, _.getBN(_.BN2Int(_.one * 30)))
        await wbnb.transfer(acc2, _.getBN(_.BN2Int(_.one * 30)))
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
    })
}
async function wrapBNB() {
    it("It should wrap", async () => {
        await web3.eth.sendTransaction({to: wbnb.address, value:_.BN2Str(_.one*1000), from:acc0});
        await wbnb.transfer(acc0, _.getBN(_.BN2Int(_.one * 300)))
        await wbnb.transfer(acc1, _.getBN(_.BN2Int(_.one * 300)))
        await wbnb.transfer(acc2, _.getBN(_.BN2Int(_.one * 300)))
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await wbnb.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await wbnb.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await wbnb.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })
    })
}
async function createPoolWBNB(SPT, token) {
    it("It should deploy BNB Pool", async () => {
        var _pool = await curate.createPool.call(wbnb.address)
        await curate.createPool(wbnb.address)
        poolWBNB = await POOL.at(_pool)
        //console.log(`Pools: ${poolWBNB.address}`)
        const baseAddr = await poolWBNB.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        let supply = await base.totalSupply()
        await base.approve(poolWBNB.address, supply, { from: acc0 })
        await base.approve(poolWBNB.address, supply, { from: acc1 })
        await poolWBNB.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await poolWBNB.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await poolWBNB.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await poolWBNB.approve(leverage.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await poolWBNB.approve(leverage.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await poolWBNB.approve(leverage.address, _.BN2Str(500000 * _.one), { from: acc2 })
    })
}
async function createPoolTKN2(SPT, token) {
    it("It should deploy TKN2 Pool", async () => {
        var _pool = await curate.createPool.call(token2.address)
        await curate.createPool( token2.address)
        poolTKN2 = await POOL.at(_pool)
        const baseAddr = await poolTKN2.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
      
        let supply = await base.totalSupply()
        await base.approve(poolTKN2.address, supply, { from: acc0 })
        await base.approve(poolTKN2.address, supply, { from: acc1 })
        await poolTKN2.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await poolTKN2.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await poolTKN2.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })
    })
}
async function addLiquidityBNB(acc, x, y) {
    it(`It should addLiquidity BNB from ${acc}`, async () => {
        let token = wbnb.address
        let poolData = await utils.getPoolData(token);
        var X = _.getBN(poolData.baseAmount)
        var Y = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolWBNB.totalSupply()))
        //console.log('start data', _.BN2Str(X), _.BN2Str(Y), _.BN2Str(poolUnits))
        let units = math.calcLiquidityUnits(x, X, y, Y, poolUnits)
        // console.log(_.BN2Str(units), _.BN2Str(x), _.BN2Str(X), _.BN2Str(y), _.BN2Str(Y), _.BN2Str(poolUnits))
        let tx = await router.addLiquidity(x, y, token, { from: acc})
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(Y.plus(y)))
        assert.equal(_.BN2Str((await poolWBNB.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
        assert.equal(_.BN2Str(await poolWBNB.balanceOf(acc)), _.BN2Str(units), 'units')
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(X.plus(x)), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(Y.plus(y)), 'wbnb balance')
   
    })
}
async function addLiquidityTKN2(acc, x, y) {
    it(`It should addLiquidity TKN2 from ${acc}`, async () => {
        let token = token2.address
        let poolData = await utils.getPoolData(token);
        var X = _.getBN(poolData.baseAmount)
        var Y = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolTKN2.totalSupply()))
        //console.log('start data', _.BN2Str(X), _.BN2Str(Y), _.BN2Str(poolUnits))

        let units = math.calcLiquidityUnits(x, X, y, Y, poolUnits)
        // console.log(_.BN2Str(units), _.BN2Str(x), _.BN2Str(X), _.BN2Str(y), _.BN2Str(Y), _.BN2Str(poolUnits))
        
        let tx = await router.addLiquidity(x, y, token, { from: acc})
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(Y.plus(y)))
        assert.equal(_.BN2Str((await poolTKN2.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
        assert.equal(_.BN2Str(await poolTKN2.balanceOf(acc)), _.BN2Str(units), 'units')
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN2.address)), _.BN2Str(X.plus(x)), 'base balance')
        assert.equal(_.BN2Str(await token2.balanceOf(poolTKN2.address)), _.BN2Str(Y.plus(y)), 'wbnb balance')
    
    })
}
async function removeLiquidityBNB(bp, acc) {

    it(`It should removeLiquidity BNB for ${acc}`, async () => {
        let token = _.BNB
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)

        let baseStart = _.getBN(await base.balanceOf(acc))
        let tokenStart = _.getBN(await wbnb.balanceOf(acc))
        let bnbStart = _.getBN(await web3.eth.getBalance(acc))

        let totalUnits = _.getBN((await poolWBNB.totalSupply()))
        let addLiquidityUnits = _.getBN(await poolWBNB.balanceOf(acc))
        let share = (addLiquidityUnits.times(bp)).div(10000)
        let b = _.floorBN((B.times(share)).div(totalUnits))
        let t = _.floorBN((T.times(share)).div(totalUnits))
        // let memberData = (await utils.getMemberData(token, acc))
        // let baseAmount = _.getBN(memberData.baseAmountPooled)
        // let tokenAmount = _.getBN(memberData.tokenAmountPooled)
        // let vs = _.floorBN((baseAmount.times(bp)).div(10000))
        // let aa = _.floorBN((tokenAmount.times(bp)).div(10000))
        //console.log(_.BN2Str(totalUnits), _.BN2Str(liquidityUnitss), _.BN2Str(share), _.BN2Str(b), _.BN2Str(t))
        await poolWBNB.approve(router.address, totalUnits,{from:acc});
        let tx = await router.removeLiquidity(bp, token, { from: acc})
        poolData = await utils.getPoolData(token);
        // //console.log(tx.receipt.logs)
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputBase), _.BN2Str(_.floorBN(b)), 'outputBase')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputToken), _.BN2Str(_.floorBN(t)), 'outputToken')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await poolWBNB.totalSupply())), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Int(B.minus(b)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.minus(t)))
        // assert.equal(_.BN2Str(poolData.baseAmountPooled), _.BN2Int(B.minus(b)))
        // assert.equal(_.BN2Str(poolData.tokenAmountPooled), _.BN2Str(T.minus(t)))
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Int(B.minus(b)), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(T.minus(t)), 'wbnb balance')

        // let memberData2 = (await utils.getMemberData(token, acc))
        // assert.equal(_.BN2Str((memberData2.baseAmountPooled)), _.BN2Str(baseAmount.minus(vs)), '0')
        // assert.equal(_.BN2Str((memberData2.tokenAmountPooled)), _.BN2Str(tokenAmount.minus(aa)), '0')
        assert.equal(_.BN2Str(await poolWBNB.balanceOf(acc)), _.BN2Str(addLiquidityUnits.minus(share)), 'addLiquidityrUnits')

        assert.equal(_.BN2Str(await base.balanceOf(acc)), _.BN2Str(baseStart.plus(b)), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(acc)), _.BN2Str(tokenStart.plus(t)), 'wbnb balance')
       // assert.isAtLeast(_.BN2Int(await web3.eth.getBalance(acc)), _.BN2Int(bnbStart.plus(t).minus(3*10**15)), 'bnb balance')
    })
}
async function curatePools() {
    it("Curate POOls", async () => {
        await curate.addCuratedPool(wbnb.address);
        // await curate.addCuratedPool(token1.address);
        await curate.addCuratedPool(token2.address);
       
    })
}


async function buyTOKEN(acc, x) {

    it(`It should buy WBNB with BASE from ${acc}`, async () => {

        let baseStart = _.getBN(await base.balanceOf(acc))
        let tokenStart = _.getBN(await wbnb.balanceOf(acc))

        let token = wbnb.address
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

async function sellTOKEN(acc, x) {

    it(`It should sell WBNB to BASE from ${acc}`, async () => {
        
        let baseStart = _.getBN(await base.balanceOf(acc))
        let tokenStart = _.getBN(await wbnb.balanceOf(acc))

        let token = wbnb.address
        let poolData = await utils.getPoolData(token);
        const X = _.getBN(poolData.tokenAmount)
        const Y = _.getBN(poolData.baseAmount)
        // await help.logPool(utils, token, 'WBNB')
        //console.log('start data', _.BN2Str(X), _.BN2Str(Y))

        let y = math.calcSwapOutput(x, X, Y)
        let fee = math.calcSwapFee(x, X, Y)
        // console.log(_.BN2Str(x), _.BN2Str(X), _.BN2Str(y), _.BN2Str(Y), _.BN2Str(fee))

        let tx = await router.sell(x, token)
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

        assert.equal(_.BN2Str(await wbnb.balanceOf(acc)), _.BN2Str(tokenStart.minus(x)), 'wbnb balance')
        assert.equal(_.BN2Str(await base.balanceOf(acc)), _.BN2Str(baseStart.plus(y)), 'base balance')
        
        // await help.logPool(utils, token, 'WBNB')
    })
}

async function swapWBNBtoTKN2(acc, x) {

    it(`It should swap from wbnb to tkn2 from ${acc}`, async () => {
        let wbnbStart = _.getBN(await wbnb.balanceOf(acc))
        let tokenStart = _.getBN(await token2.balanceOf(acc))

        let fromToken = wbnb.address
        let toToken = token2.address
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
        
        let tx = await router.swap(x, fromToken, toToken)
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
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN2.address)), _.BN2Str(B.plus(y)), 'base balance')
        assert.equal(_.BN2Str(await token2.balanceOf(poolTKN2.address)), _.BN2Str(Z.minus(z)), 'token1 balance')
        
        assert.equal(_.BN2Str(await wbnb.balanceOf(acc)), _.BN2Str(wbnbStart.minus(x)), 'wbnb balance')
        assert.equal(_.BN2Str(await token2.balanceOf(acc)), _.BN2Str(tokenStart.plus(z)), 'token1 balance')
        //await help.logPool(utils, _.BNB, 'BNB')
    })
}
async function swapTKN2toWBNB(acc, x) {

    it(`It should swap from tkn2 to wbnb from ${acc}`, async () => {
        let wbnbStart = _.getBN(await token2.balanceOf(acc))
        let tokenStart = _.getBN(await wbnb.balanceOf(acc))

        let fromToken = token2.address 
        let toToken = wbnb.address
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
        
        let tx = await router.swap(x, fromToken, toToken)
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

        // assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(X.plus(x)), 'wbnb balance')
        // assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(Y.minus(y)), 'base balance')
        // assert.equal(_.BN2Str(await base.balanceOf(poolTKN2.address)), _.BN2Str(B.plus(y)), 'base balance')
        // assert.equal(_.BN2Str(await token2.balanceOf(poolTKN2.address)), _.BN2Str(Z.minus(z)), 'token1 balance')
        
        assert.equal(_.BN2Str(await  token2.balanceOf(acc)), _.BN2Str(wbnbStart.minus(x)), 'wbnb balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(acc)), _.BN2Str(tokenStart.plus(z)), 'token1 balance')
       
    })
}

async function swapBASE1(acc, x) {
    it(`Swap`, async () => {

        
        let fromToken = wbnb.address
        let toToken = base.address
     
        let tx = await router.swap(x, fromToken, toToken)
     
    })
}
async function swapTOKEN1(acc, x) {
    it(`Swap`, async () => {

        let toToken = wbnb.address
        let fromToken = base.address
       
        let tx = await router.swap(x, fromToken, toToken)
      

    })
}

async function swapBASE(acc, x) {
    it(`Swap from BNB to BASE and pool gets Dividend`, async () => {
        let baseStart = _.getBN(await base.balanceOf(acc))
        let tokenStart = _.getBN(await wbnb.balanceOf(acc))
        let reserve = _.getBN(await base.balanceOf(router.address));
        let dailyAllocation = reserve.div(30).div(100);
        
        let fromToken = wbnb.address
        let toToken = base.address
        let poolData = await utils.getPoolData(fromToken);
        const X = _.getBN(poolData.tokenAmount)
        const Y = _.getBN(poolData.baseAmount)
        //console.log('start data', _.BN2Str(X), _.BN2Str(Y))

        let y = math.calcSwapOutput(x, X, Y)
     
        // console.log(_.BN2Str(x), _.BN2Str(X), _.BN2Str(y), _.BN2Str(Y), _.BN2Str(fee))
        
        let tx = await router.swap(x, fromToken, toToken)
        let normalFee = _.getBN(await router.normalAverageFee());
    
        let fee = math.calcSwapFee(x, X, Y)
        let numerator = fee.times(dailyAllocation);
        let feeDividend = _.floorBN(numerator.div(fee.plus(normalFee)));

        poolData = await utils.getPoolData(fromToken);

        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(X.plus(x)))
        if(!(_.BN2Str(normalFee) == 0)){
            assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(Y.plus(feeDividend.minus(y))))
            assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(X.plus(x)))
            assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(Y.minus(y).plus(feeDividend)), 'base balance')
        }else{
            assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(X.plus(x)))
            assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(Y.minus(y)))
            assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(X.plus(x)), 'wbnb balance')
            assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(Y.minus(y)), 'base balance')
        }

    })
}


async function swapTOKEN(acc, x) {
    it(`Swap from BASE to BNB and pool gets Dividend`, async () => {
        let baseStart = _.getBN(await base.balanceOf(acc))
        let tokenStart = _.getBN(await wbnb.balanceOf(acc))
        let reserve = _.getBN(await base.balanceOf(router.address));
        let dailyAllocation = reserve.div(30).div(100);
        let fromToken = base.address
        let toToken = wbnb.address
        let poolData = await utils.getPoolData(toToken);
        const X = _.getBN(poolData.baseAmount)
        const Y = _.getBN(poolData.tokenAmount)
        //console.log('start data', _.BN2Str(X), _.BN2Str(Y))
        let y = math.calcSwapOutput(x, X, Y)
        // console.log(_.BN2Str(y), _.BN2Str(Y), _.BN2Str(X), _.BN2Str(x), _.BN2Str(fee))
        
        let tx = await router.swap(x, fromToken, toToken)
        let normalFee = _.getBN(await router.normalAverageFee());
        let fee = math.calcSwapFee(x, X, Y)
        let numerator = fee.times(dailyAllocation);
        let feeDividend = _.floorBN(numerator.div(fee.plus(normalFee)));
        // console.log(tx)
        poolData = await utils.getPoolData(toToken);
        if(!(normalFee == 0)){
            assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(X.plus(feeDividend.plus(x))))
            assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(Y.minus(y)))
            assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(X.plus(x).plus(feeDividend)), 'base balance')
        }else{
            assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(X.plus(x)))
            assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(Y.minus(y)))
            assert.equal(_.BN2Str(await base.balanceOf(acc)), _.BN2Str(baseStart.minus(x)), 'base balance')
            assert.equal(_.BN2Str(await wbnb.balanceOf(acc)), _.BN2Str(tokenStart.plus(y)), 'wbnb balance')
        }

    })
}

