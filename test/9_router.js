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
var TOKEN1 = artifacts.require("./Token1.sol");
var WBNB = artifacts.require("./WBNB");

var base; var token1;  var token2; var wbnb;
var utils; var utils2; var router; var router2; var Dao; var Dao2;
var poolWBNB; var poolTKN1;
var acc0; var acc1; var acc2; var acc3;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

contract('ROUTERv2', function (accounts) {

    constructor(accounts)
    wrapBNB()
    createPoolWBNB()
    addLiquidity(acc1, _.BN2Str(_.one * 100), _.BN2Str(_.one * 10))
    // Single swap
   
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
    swapTOKEN1(acc0, _.BN2Str(_.one * 10))
    swapBASE1(acc0, _.BN2Str(_.one *2))
    swapTOKEN1(acc0, _.BN2Str(_.one * 12))
    swapTOKEN1(acc0, _.BN2Str(_.one * 12))
    swapBASE(acc0, _.BN2Str(_.one*1))
    swapTOKEN(acc0, _.BN2Str(_.one * 2))

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
        await base.transfer(router.address, _.getBN(_.BN2Str(100000 * _.one)))
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

async function createPoolWBNB() {
    it("It should deploy WBNB Pool", async () => {
        var _pool = await router.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one), wbnb.address)
        await router.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one), wbnb.address)
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

async function addLiquidity(acc, x, y) {

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
        assert.equal(_.BN2Str(poolData.baseAmountPooled), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str(poolData.tokenAmountPooled), _.BN2Str(Y.plus(y)))
        assert.equal(_.BN2Str((await poolWBNB.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
        assert.equal(_.BN2Str(await poolWBNB.balanceOf(acc)), _.BN2Str(units), 'units')
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(X.plus(x)), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(Y.plus(y)), 'wbnb balance')
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
        // console.log(tx)
        poolData = await utils.getPoolData(fromToken);

        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(X.plus(x)))
        if(!(normalFee == 0)){
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
// async function swapTOKEN(acc, x) {
//     it(`ForwardFunds`, async () => {
//         console.log(_.BN2Str(await base.balanceOf(acc3)));
//        await router.forwardRouterFunds(acc3, {from:acc0});
//        console.log(_.BN2Str(await base.balanceOf(acc3)));

//     })
// }

