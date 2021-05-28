const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');
const web3Abi = require('web3-eth-abi');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');

var DAO = artifacts.require("./Dao.sol");
var SPARTA = artifacts.require("./Sparta.sol");
var UTILS = artifacts.require("./Utils.sol");
var TOKEN = artifacts.require("./Token1.sol");
var RESERVE = artifacts.require("./Reserve.sol");
var DAOVAULT = artifacts.require("./DaoVault.sol");
var POOL = artifacts.require("./Pool.sol");
var POOLFACTORY = artifacts.require("./PoolFactory.sol");
var ROUTER = artifacts.require("./Router.sol");
var WBNB = artifacts.require("./WBNB");

var SYNTH = artifacts.require("./Synth.sol");
var SYNTHFACTORY = artifacts.require("./SynthFactory.sol");


var sparta; var token1;  var token2; var wbnb;
var utils; var utils2; var router; var router2; var Dao; var Dao2;
var poolWBNB; var poolTKN1; var synthTNK2; var synthBNB;var reserve;
var acc0; var acc1; var acc2; var acc3;
var allocation = 2500000;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
contract('SWAP', function (accounts) {
    constructor(accounts)
    wrapBNB()
    createPoolWBNB()
    createPoolTKN1()
    addLiquidityBNB(acc1,_.BN2Str(100*_.one),  _.BN2Str(10*_.one)); //SPV2
    addLiquidityBNB(acc0,_.BN2Str(100*_.one),  _.BN2Str(10*_.one)); //SPV2
    addLiquidityTKN1(acc0,_.BN2Str(100*_.one),  _.BN2Str(50*_.one))
    addLiquidityTKN1(acc1,_.BN2Str(100*_.one),  _.BN2Str(50*_.one))
    swapBASEToBNB(acc1, _.BN2Str(10*_.one))// wbnb swaps
    swapBNBtoBASE(acc1, _.BN2Str(1*_.one))// wbnb swaps
    curatePools() // SPV2
    buyBNB(acc2, _.BN2Str(_.one * 1)) // bnbswaps
    sellBNB(acc2, _.BN2Str(_.one * 1))// bnbswaps
    buyBNB(acc2, _.BN2Str(_.one * 1)) // bnbswaps
    sellBNB(acc2, _.BN2Str(_.one * 1))// bnbswaps
    buyBNB(acc2, _.BN2Str(_.one * 1)) // bnbswaps
    sellBNB(acc2, _.BN2Str(_.one * 1))// bnbswaps
    buyBNB(acc2, _.BN2Str(_.one * 1)) // bnbswaps
    sellBNB(acc2, _.BN2Str(_.one * 1))// bnbswaps
    buyBNB(acc2, _.BN2Str(_.one * 1)) // bnbswaps
    // sellBNB(acc2, _.BN2Str(_.one * 1))// bnbswaps
    // buyBNB(acc2, _.BN2Str(_.one * 1)) // bnbswaps
    // sellBNB(acc2, _.BN2Str(_.one * 1))// bnbswaps
    // buyBNB(acc2, _.BN2Str(_.one * 1)) // bnbswaps
    // sellBNB(acc2, _.BN2Str(_.one * 1))// bnbswaps
    // buyBNB(acc2, _.BN2Str(_.one * 1)) // bnbswaps
    // sellBNB(acc2, _.BN2Str(_.one * 1))// bnbswaps
    // swapTKN1ToBNB(acc2, _.BN2Str(_.one * 1))//double swaps
    // swapBNBToTKN1(acc2, _.BN2Str(_.one * 1))//double swaps
    // swapBASE(acc0, _.BN2Str(_.one)) // dividends
    // swapTOKEN(acc0, _.BN2Str(_.one * 1))// dividends
    // swapBASE(acc0, _.BN2Str(_.one)) // dividends
    // swapTOKEN(acc0, _.BN2Str(_.one * 1))// dividends
    createSyntheticBNB() 
    swapLayer1ToSynth(acc1, _.BN2Str(10*_.one))
    swapLayer1ToSynth(acc0, _.BN2Str(1*_.one))
     swapLayer1ToSynth(acc2, _.BN2Str(5*_.one))
     swapSynthToLayer1(acc1, _.BN2Str(1.1*_.one))
     swapSynthToLayer1(acc0, _.BN2Str(0.1*_.one))
     swapSynthToLayer1(acc2, _.BN2Str(0.2*_.one))
    zapLiquidity(acc1,  _.BN2Str(_.one * 10))
    

})


//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
            //SPARTANPROTOCOLv2
            sparta = await SPARTA.new(acc0) // deploy sparta v2
            Dao = await DAO.new(sparta.address)     // deploy daoV2
            wbnb = await WBNB.new() // deploy wBNB 
            utils = await UTILS.new(sparta.address) // deploy utilsV2
            token1 = await TOKEN.new()   
            reserve = await RESERVE.new(sparta.address) // deploy reserve 
            daoVault = await DAOVAULT.new(sparta.address); // deploy daoVault
            router = await ROUTER.new(sparta.address, wbnb.address,); // deploy router
            poolFactory = await POOLFACTORY.new(sparta.address,  wbnb.address) // deploy poolfactory
            synthFactory = await SYNTHFACTORY.new(sparta.address,  wbnb.address) // deploy synthFactory

            await Dao.setGenesisAddresses(router.address,utils.address,reserve.address);
            await Dao.setVaultAddresses(daoVault.address,daoVault.address, daoVault.address);
            await Dao.setFactoryAddresses(poolFactory.address,synthFactory.address);
            await sparta.changeDAO(Dao.address)
            await reserve.setIncentiveAddresses(router.address,utils.address,utils.address,Dao.address );
            // await reserve.flipEmissions();    
            // await sparta.flipEmissions();  
    
            await sparta.transfer(acc1, _.getBN(_.BN2Str(10000 * _.one)))
            await sparta.transfer(acc2, _.getBN(_.BN2Str(10000 * _.one)))
    
            await token1.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
            await token1.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
    
            await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
            await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
            await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

            await sparta.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
            await sparta.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
            await sparta.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

    });
}
async function wrapBNB() {
    it("It should wrap", async () => {
        await web3.eth.sendTransaction({to: wbnb.address, value:_.BN2Str(_.one*100), from:acc0});
        await wbnb.transfer(acc0, _.getBN(_.BN2Int(_.one * 30)))
        await wbnb.transfer(acc1, _.getBN(_.BN2Int(_.one * 30)))
        // await wbnb.transfer(acc2, _.getBN(_.BN2Int(_.one * 30)))
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
        assert.equal(baseAddr, sparta.address, "address is correct")

        let supply = await sparta.totalSupply()
        await sparta.approve(poolWBNB.address, supply, { from: acc0 })
        await sparta.approve(poolWBNB.address, supply, { from: acc1 })
        console.log(await poolWBNB.symbol());
        console.log(await poolWBNB.name());
        await poolWBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await poolWBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await poolWBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

    })
}
async function createPoolTKN1(SPT, token) {
    it("It should deploy TKN1 Pool", async () => {
        var _pool = await poolFactory.createPool.call(token1.address)
        await poolFactory.createPool(token1.address)
        poolTKN1 = await POOL.at(_pool)
        //console.log(`Pools: ${poolTKN1.address}`)
        const baseAddr = await poolTKN1.BASE()
        assert.equal(baseAddr, sparta.address, "address is correct")
        let supply = await sparta.totalSupply()
        await sparta.approve(poolTKN1.address, supply, { from: acc0 })
        await sparta.approve(poolTKN1.address, supply, { from: acc1 })
        await poolTKN1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await poolTKN1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await poolTKN1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })



    })
}
async function addLiquidityBNB(acc, bb, t) {

    it(`It should addLiquidity BNB from ${acc}`, async () => {
        let token = wbnb.address
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolWBNB.totalSupply()))

        let feeOnTransfer = _.getBN(await sparta.feeOnTransfer())
        let fee = feeOnTransfer.times(bb).div(10000);
        let b = _.getBN(bb).minus(fee);

        let units = math.calcLiquidityUnits(b, B, t, T, poolUnits)
        let tx = await router.addLiquidity(b, t, token, { from: acc})
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(B.plus(b)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.plus(t)))
        assert.equal(_.BN2Str((await poolWBNB.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
        assert.equal(_.BN2Str(await poolWBNB.balanceOf(acc)), _.BN2Str(units), 'units')
        assert.equal(_.BN2Str(await sparta.balanceOf(poolWBNB.address)), _.BN2Str(B.plus(b)), 'sparta balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(T.plus(t)), 'wbnb balance')
    })
}
async function addLiquidityTKN1(acc, bb, t) {

    it(`It should addLiquidity TKN from ${acc}`, async () => {
        let token = token1.address
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolTKN1.totalSupply()))

        let feeOnTransfer = _.getBN(await sparta.feeOnTransfer())
        let fee = feeOnTransfer.times(bb).div(10000);
        let b = _.getBN(bb).minus(fee);


        let units = math.calcLiquidityUnits(b, B, t, T, poolUnits)
        let tx = await router.addLiquidity(b, t, token, { from: acc})
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(B.plus(b)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.plus(t)))
        assert.equal(_.BN2Str((await poolTKN1.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
        assert.equal(_.BN2Str(await poolTKN1.balanceOf(acc)), _.BN2Str(units), 'units')
        assert.equal(_.BN2Str(await sparta.balanceOf(poolTKN1.address)), _.BN2Str(B.plus(b)), 'sparta balance')
        assert.equal(_.BN2Str(await token1.balanceOf(poolTKN1.address)), _.BN2Str(T.plus(t)), 'wbnb balance')
    })
}
async function swapBASEToBNB(acc, xx) {
    it(`It should buy BNB with BASE from ${acc}`, async () => {
        let baseStart = _.getBN(await sparta.balanceOf(acc))
        let tokenStart = _.getBN(await wbnb.balanceOf(acc))
        let feeOnTransfer = _.getBN(await sparta.feeOnTransfer())
        let totalSupply = _.BN2Str(await sparta.totalSupply())

        let fee = feeOnTransfer.times(xx).div(10000);
        let x = _.getBN(xx).minus(fee);
        let token = wbnb.address
        let poolData = await utils.getPoolData(token);
        const X = _.getBN(poolData.baseAmount)
        const Y = _.getBN(poolData.tokenAmount)
        // await help.logPool(utils, token, 'WBNB')
        //console.log('start data', _.BN2Str(X), _.BN2Str(Y))

        let y = math.calcSwapOutput(x, X, Y)
        let _fee = math.calcSwapFee(x, X, Y)
        // console.log(_.BN2Str(y), _.BN2Str(Y), _.BN2Str(X), _.BN2Str(x), _.BN2Str(fee))
        
        let tx = await router.swap(x, sparta.address, token, {from:acc})
        // console.log(tx)
        poolData = await utils.getPoolData(token);

        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(Y.minus(y)))
        
        assert.equal(_.BN2Str(await sparta.balanceOf(poolWBNB.address)), _.BN2Str(X.plus(x)), 'sparta balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(Y.minus(y)), 'wbnb balance')
        
        assert.equal(_.BN2Str(await sparta.balanceOf(acc)), _.BN2Str(baseStart.minus(x)), 'sparta balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(acc)), _.BN2Str(tokenStart.plus(y)), 'wbnb balance')
       
    })
}
async function swapBNBtoBASE(acc, x) {
    it(`It should swap BNB to BASE from ${acc}`, async () => {
        let baseStart = _.getBN(await sparta.balanceOf(acc))
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

        let tx = await router.swap(x, token, sparta.address, {from:acc})
        // console.log(tx.receipt.logs)
        // console.log(tx.receipt.rawLogs)

        poolData = await utils.getPoolData(token);

        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(x))
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(y))
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(Y.minus(y)))

        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(X.plus(x)), 'wbnb balance')
        assert.equal(_.BN2Str(await sparta.balanceOf(poolWBNB.address)), _.BN2Str(Y.minus(y)), 'sparta balance')

        assert.equal(_.BN2Str(await wbnb.balanceOf(acc)), _.BN2Str(tokenStart.minus(x)), 'wbnb balance')
        assert.equal(_.BN2Str(await sparta.balanceOf(acc)), _.BN2Str(baseStart.plus(y)), 'sparta balance')
        
    })
}
async function swapBASE(acc, x) {
    it(`Swap from BNB to BASE and pool gets Dividend`, async () => {
        let baseStart = _.getBN(await sparta.balanceOf(acc))
        let tokenStart = _.getBN(await wbnb.balanceOf(acc))
        let reserveBal = _.getBN(await sparta.balanceOf(reserve.address));
        let dailyAllocation = _.BN2Str(reserveBal.div(30).div(100));
        
        let fromToken = wbnb.address
        let toToken = sparta.address
        let poolData = await utils.getPoolData(fromToken);
        const X = _.getBN(poolData.tokenAmount)
        const Y = _.getBN(poolData.baseAmount)
        //console.log('start data', _.BN2Str(X), _.BN2Str(Y))

        let y =  _.getBN(math.calcSwapOutput(x, X, Y))
     
        // console.log(_.BN2Str(x), _.BN2Str(X), _.BN2Str(y), _.BN2Str(Y), _.BN2Str(fee))
        
        let tx = await router.swap(x, fromToken, toToken)
        let normalFee = _.getBN(await router.normalAverageFee());
        // console.log("normalFee",_.BN2Str(normalFee))
    
        let fee = math.calcSwapFee(x, X, Y)
        let numerator =  _.getBN(fee.times(dailyAllocation));
        let feeDividend = _.getBN(numerator.div(fee.plus(normalFee)));
        // console.log("Fee",_.BN2Str(feeDividend))

        poolData = await utils.getPoolData(fromToken);

        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(X.plus(x)))
        if(!(_.BN2Str(normalFee) == 0)){
            assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(Y.plus(feeDividend.minus(y))))
            assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(X.plus(x)))
            assert.equal(_.BN2Str(await sparta.balanceOf(poolWBNB.address)), _.BN2Str(Y.minus(y).plus(feeDividend)), 'sparta balance')
        }else{
            assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(X.plus(x)))
            assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(Y.minus(y)))
            assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(X.plus(x)), 'wbnb balance')
            assert.equal(_.BN2Str(await sparta.balanceOf(poolWBNB.address)), _.BN2Str(Y.minus(y)), 'sparta balance')
        }

    })
}
async function swapTOKEN(acc, x) {
    it(`Swap from BASE to BNB and pool gets Dividend`, async () => {
        let baseStart = _.getBN(await sparta.balanceOf(acc))
        let tokenStart = _.getBN(await wbnb.balanceOf(acc))
        let reserveBal = _.getBN(await sparta.balanceOf(reserve.address));
        let dailyAllocation = reserveBal.div(30).div(100);
        let fromToken = sparta.address
        let toToken = wbnb.address
        let poolData = await utils.getPoolData(toToken);
        const X = _.getBN(poolData.baseAmount)
        const Y = _.getBN(poolData.tokenAmount)
        //console.log('start data', _.BN2Str(X), _.BN2Str(Y))
        let y = math.calcSwapOutput(x, X, Y)
        // console.log(_.BN2Str(y), _.BN2Str(Y), _.BN2Str(X), _.BN2Str(x), _.BN2Str(fee))
        
        let tx = await router.swap(x, fromToken, toToken)
        let normalFee = _.getBN(await router.normalAverageFee());
        let _fee = math.calcSwapFee(x, X, Y)
        let fee =  _.floorBN((_fee.times(X)).div(Y));
        let numerator = fee.times(dailyAllocation);
        let feeDividend = _.floorBN(numerator.div(fee.plus(normalFee)));
        // console.log(tx)
        poolData = await utils.getPoolData(toToken);
        if(!(normalFee == 0)){
            assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(X.plus(feeDividend.plus(x))))
            assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(Y.minus(y)))
            assert.equal(_.BN2Str(await sparta.balanceOf(poolWBNB.address)), _.BN2Str(X.plus(x).plus(feeDividend)), 'sparta balance')
        }else{
            assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(X.plus(x)))
            assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(Y.minus(y)))
            assert.equal(_.BN2Str(await sparta.balanceOf(acc)), _.BN2Str(baseStart.minus(x)), 'sparta balance')
            assert.equal(_.BN2Str(await wbnb.balanceOf(acc)), _.BN2Str(tokenStart.plus(y)), 'wbnb balance')
        }

    })
}
async function buyBNB(acc, x) {

    it(`It should buy WBNB with BASE from ${acc}`, async () => {

        let baseStart = _.getBN(await sparta.balanceOf(acc))
        let bnbStart = _.getBN(await web3.eth.getBalance(acc))

        let token = _.BNB
        let poolData = await utils.getPoolData(token);
        const X = _.getBN(poolData.baseAmount)
        const Y = _.getBN(poolData.tokenAmount)

        let y = math.calcSwapOutput(x, X, Y)
        let fee = math.calcSwapFee(x, X, Y)
        // console.log(_.BN2Str(y), _.BN2Str(Y), _.BN2Str(X), _.BN2Str(x), _.BN2Str(fee))
        
        let tx = await router.swap(x, sparta.address, token, {from:acc})
        // console.log(tx)
        poolData = await utils.getPoolData(token);

        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(Y.minus(y)))
        
        assert.equal(_.BN2Str(await sparta.balanceOf(poolWBNB.address)), _.BN2Str(X.plus(x)), 'sparta balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(Y.minus(y)), 'wbnb balance')
        
        assert.equal(_.BN2Str(await sparta.balanceOf(acc)), _.BN2Str(baseStart.minus(x)), 'sparta balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(acc)), _.BN2Str(0), 'wbnb balance')
        // assert.isAtLeast(_.BN2Int(await web3.eth.getBalance(acc)), _.BN2Int(bnbStart.plus(y)), 'bnb balance')
        // // await help.logPool(utils, token, 'WBNB')
    })
}
async function sellBNB(acc, x) {

    it(`It should sell BNB to BASE from ${acc}`, async () => {
        
        let baseStart = _.getBN(await sparta.balanceOf(acc))
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

        let tx = await router.swap(x, token,sparta.address, {value:x, from:acc})
        // console.log(tx.receipt.logs)
        // console.log(tx.receipt.rawLogs)

        poolData = await utils.getPoolData(token);

        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(x))
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(y))
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(Y.minus(y)))

        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(X.plus(x)), 'wbnb balance')
        assert.equal(_.BN2Str(await sparta.balanceOf(poolWBNB.address)), _.BN2Str(Y.minus(y)), 'sparta balance')

        //assert.equal(_.BN2Str(await web3.eth.balance(acc)), _.BN2Str(tokenStart.minus(x)), 'wbnb balance')
        assert.equal(_.BN2Str(await sparta.balanceOf(acc)), _.BN2Str(baseStart.plus(y)), 'sparta balance')
        
        // await help.logPool(utils, token, 'WBNB')
    })
}
async function curatePools() {
    it("Curate POOls", async () => {
        await poolFactory.addCuratedPool(wbnb.address);
        await poolFactory.addCuratedPool(token1.address);
    })
}
async function swapBNBToTKN1(acc, x) {
    it(`It should buy BNB with TKN1 from ${acc}`, async () => {
       let wbnbStart = _.getBN(await wbnb.balanceOf(acc))
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
        
        let tx = await router.swap(x, fromToken, toToken, {value:x, from:acc})
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
        assert.equal(_.BN2Str(await sparta.balanceOf(poolWBNB.address)), _.BN2Str(Y.minus(y)), 'sparta balance')
        assert.equal(_.BN2Str(await sparta.balanceOf(poolTKN1.address)), _.BN2Str(B.plus(y)), 'sparta balance')
        assert.equal(_.BN2Str(await token1.balanceOf(poolTKN1.address)), _.BN2Str(Z.minus(z)), 'token1 balance')
        
        // assert.equal(_.BN2Str(await wbnb.balanceOf(acc)), _.BN2Str(wbnbStart.minus(x)), 'wbnb balance')
        assert.equal(_.BN2Str(await token1.balanceOf(acc)), _.BN2Str(tokenStart.plus(z)), 'token1 balance')
        //await help.logPool(utils, _.BNB, 'BNB')
    })
}
async function swapTKN1ToBNB(acc, x) {
    it(`It should buy BNB with TKN1 from ${acc}`, async () => {
        let bnbStart = _.getBN(await web3.eth.getBalance(acc))
        let tokenStart = _.getBN(await token1.balanceOf(acc))

        let fromToken = token1.address
        let toToken = _.BNB
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
        
        let tx = await router.swap(x, fromToken, toToken, {from:acc})
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

        assert.equal(_.BN2Str(await token1.balanceOf(poolTKN1.address)), _.BN2Str(X.plus(x)), 'wbnb balance')
        assert.equal(_.BN2Str(await sparta.balanceOf(poolTKN1.address)), _.BN2Str(Y.minus(y)), 'sparta balance')
        assert.equal(_.BN2Str(await sparta.balanceOf(poolWBNB.address)), _.BN2Str(B.plus(y)), 'sparta balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(Z.minus(z)), 'token1 balance')
        
        assert.equal(_.BN2Str(await wbnb.balanceOf(acc)), _.BN2Str(0), 'wbnb balance')
       // assert.isAtLeast(_.BN2Int(await web3.eth.getBalance(acc)), _.BN2Int(bnbStart.plus(y)), 'bnb balance')
        // await help.logPool(utils, token, 'WBNB')
    })
}
async function createSyntheticBNB() {
    it("It should Create Synthetic BNB ", async () => {
        var _synth =  await synthFactory.createSynth.call(wbnb.address);
        await synthFactory.createSynth(wbnb.address);
        synthBNB = await SYNTH.at(_synth)
        await synthBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await synthBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await synthBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
        console.log("Symbol: ",await synthBNB.symbol());
         console.log("  Name: ",await synthBNB.name());
        console.log("Symbol: ",await poolTKN1.symbol());
         console.log("  Name: ",await poolTKN1.name());
    })
}

async function swapLayer1ToSynth(acc, x) {
    it("Swap BASE to Synthetic BNB", async () => {
        let synthOUT = synthBNB.address;
        let synBal = _.getBN(await synthBNB.balanceOf(acc));
        let basBal = _.getBN(await sparta.balanceOf(acc));
        // console.log("synBal",_.BN2Str(synBal));
        let token = _.BNB
        let poolData = await utils.getPoolData(token);
        let lpBalance = _.getBN(await synthBNB.mapSynth_LPBalance(poolWBNB.address));
        let lpDebt =_.getBN( await synthBNB.mapSynth_LPDept(poolWBNB.address));
        const X = _.getBN(poolData.baseAmount)
        const Y = _.getBN(poolData.tokenAmount)
        let asymAdd = _.getBN(await utils.calcLiquidityUnitsAsym(x, poolWBNB.address))
        // let y = math.calcSwapOutput(x, X, token)
      
      
        let poolSynBal = _.getBN(await poolWBNB.balanceOf(synthBNB.address));
        let totalSynth = _.getBN(await synthBNB.totalSupply());

        

        await router.swapAssetToSynth(x,sparta.address,synthOUT,{from:acc});
        let synthMint = math.calcSwapOutput(x, X, Y)

        poolData = await utils.getPoolData(token);
        let lpBalanceA = _.getBN(await synthBNB.mapSynth_LPBalance(poolWBNB.address));
        let lpDebtA =_.getBN( await synthBNB.mapSynth_LPDept(poolWBNB.address));

        let feeOnTransfer = _.getBN(await sparta.feeOnTransfer())
       //  console.log("Fee BP",_.BN2Str(feeOnTransfer));

        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(Y))
        assert.equal(_.BN2Str(lpBalanceA), _.BN2Str(lpBalance.plus(asymAdd)))
        assert.equal(_.BN2Str(lpDebtA), _.BN2Str(lpDebt.plus(synthMint)))
        assert.equal(_.BN2Str(await poolWBNB.balanceOf(synthBNB.address)), _.BN2Str(poolSynBal.plus(asymAdd)))
        assert.equal(_.BN2Str(await synthBNB.totalSupply()), _.BN2Str(totalSynth.plus(synthMint)))
        assert.equal(_.BN2Str(await synthBNB.balanceOf(acc)), _.BN2Str(synBal.plus(synthMint)))
        assert.equal(_.BN2Str(await sparta.balanceOf(acc)), _.BN2Str(basBal.minus(x)))
        assert.equal(_.BN2Str(await sparta.balanceOf(poolWBNB.address)), _.BN2Str(X.plus(x)), 'wbnb balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(Y), 'sparta balance')
        
    })
}
async function swapSynthToLayer1(acc, x) {
    it("Swap Synthetic BNB To BASE", async () => {
        let input = _.BN2Str(await synthBNB.balanceOf(acc));
        // console.log("Synth Balance",input);
        // console.log("x",x);
        
        // console.log("synBal",_.BN2Str(input)/_.one);

        let synthIN = synthBNB.address;
        let synBal = _.getBN(await synthBNB.balanceOf(acc));
        let basBal = _.getBN(await sparta.balanceOf(acc));

        let lpBalance = _.getBN(await synthBNB.mapSynth_LPBalance(poolWBNB.address));
        let lpDebt =_.getBN( await synthBNB.mapSynth_LPDept(poolWBNB.address));
        let token = _.BNB
        let poolData = await utils.getPoolData(token);
        const X = _.getBN(poolData.tokenAmount)
        const Y = _.getBN(poolData.baseAmount)
        // await help.logPool(utils, token, 'WBNB')
        // console.log('start data', _.BN2Str(X), _.BN2Str(Y))

        let baseSwapped = math.calcSwapOutput(x, X, Y)
        //  console.log("Swa", _.BN2Str(baseSwapped));

        let poolSynBal = _.getBN(await poolWBNB.balanceOf(synthBNB.address));
        let totalSynth = _.getBN(await synthBNB.totalSupply());

        let amountSynths = _.BN2Str((_.getBN(x).times(lpBalance)).div(lpDebt));

        await router.swapSynthToAsset(x,synthIN,sparta.address,{from:acc});
        
       
        poolData = await utils.getPoolData(token);

        let lpBalanceA = _.getBN(await synthBNB.mapSynth_LPBalance(poolWBNB.address));
        let lpDebtA =_.getBN( await synthBNB.mapSynth_LPDept(poolWBNB.address));

        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(Y.minus(baseSwapped)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(X))
        assert.equal(_.BN2Str(lpBalanceA), _.BN2Str(lpBalance.minus(amountSynths)))
        assert.equal(_.BN2Str(lpDebtA), _.BN2Str(lpDebt.minus(x)))
        assert.equal(_.BN2Str(await poolWBNB.balanceOf(synthBNB.address)), _.BN2Str(poolSynBal.minus(amountSynths)))
        assert.equal(_.BN2Str(await synthBNB.totalSupply()), _.BN2Str(totalSynth.minus(x)))
        assert.equal(_.BN2Str(await synthBNB.balanceOf(acc)), _.BN2Str(synBal.minus(x)))
        assert.equal(_.BN2Str(await sparta.balanceOf(acc)), _.BN2Str(basBal.plus(baseSwapped)))
        assert.equal(_.BN2Str(await sparta.balanceOf(poolWBNB.address)), _.BN2Str(Y.minus(baseSwapped)), 'wbnb balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(X), 'sparta balance')
        
    })
}

async function zapLiquidity(acc, x) {
    it("zap liquidity", async () => {
        let SPT2TKN = _.BN2Str(await poolTKN1.balanceOf(acc))
        let baseP = _.BN2Str(await sparta.balanceOf(poolWBNB.address))
        let wbnbb = _.BN2Str(await wbnb.balanceOf(poolWBNB.address))
        let TOKENN = _.BN2Str(await token1.balanceOf(poolTKN1.address))
         let baset = _.BN2Str(await sparta.balanceOf(poolTKN1.address))
        console.log("SPT2TKN bal",SPT2TKN/_.one )
        let fromTOKEN = poolWBNB.address
        let toTOKEN = poolTKN1.address
        console.log("BASE BALANCE poolWBNB",baseP/_.one )
        console.log("WBNB BALANCE poolWBNB", wbnbb/_.one)
        console.log("BASE BALANCE poolTKN", baset/_.one)
        console.log("TOKEN BALANCE poolTKN", TOKENN/_.one)

        let tx = await router.zapLiquidity(x, fromTOKEN, toTOKEN, {from:acc})
        // console.log(_.BN2Str(tx.logs[0].args.outputBase))
        // console.log(_.BN2Str(tx.logs[0].args.outputToken))
        // console.log(_.BN2Str(tx.logs[2].args.inputAmount))
        // console.log(_.BN2Str(tx.logs[2].args.outputAmount))
        // console.log(_.BN2Str(tx.logs[4].args.inputBase))
        // console.log(_.BN2Str(tx.logs[4].args.inputToken))
        let basePA = _.BN2Str(await sparta.balanceOf(poolWBNB.address))
        let wbnbbA = _.BN2Str(await wbnb.balanceOf(poolWBNB.address))
        let TOKENNA = _.BN2Str(await token1.balanceOf(poolTKN1.address))
         let basetA = _.BN2Str(await sparta.balanceOf(poolTKN1.address))
        let SPT2BNBa = _.BN2Str(await poolWBNB.balanceOf(acc))
        let SPT2TKNa = _.BN2Str(await poolTKN1.balanceOf(acc))
        console.log("SPT2BNB bal",SPT2BNBa/_.one )
        console.log("SPT2TKN bal",SPT2TKNa/_.one )
        console.log("BASE BALANCE poolWBNB",basePA/_.one )
        console.log("WBNB BALANCE poolWBNB", wbnbbA/_.one)
        console.log("BASE BALANCE poolTKN", basetA/_.one)
        console.log("TOKEN BALANCE poolTKN", TOKENNA/_.one)
       
    })
}





