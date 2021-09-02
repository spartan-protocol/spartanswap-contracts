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
BigNumber.config({ DECIMAL_PLACES: 0 })
BigNumber.config({ ROUNDING_MODE: 1 })

var sparta; var token1;  var token2; var wbnb;
var utils; var utils2; var router; var router2; var Dao; var Dao2;
var poolBNB; var poolTKN1; var synthTNK2; var synthBNB;
var acc0; var acc1; var acc2; var acc3;
var allocation = 2500000;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
contract('CREATE + ADD + REMOVE', function (accounts) {

    constructor(accounts)
    createPoolBNB(acc0, 10000, 30)
    createPoolBUSD(acc0, 10000, 10000)
    addLiquidityBNB(acc1, 12)
    addLiquidityBUSD(acc1, 1231)
    BNBPoolBalanceCheck()
    addLiquidityBNBAsym(acc2, _.BN2Str(_.oneBN.times(1.2)))
    addLiquidityBUSDAsym(acc2, _.BN2Str(_.oneBN.times(50)))
    addLiquidityBNBAsymSPARTA(acc2, _.BN2Str(_.oneBN.times(100)))
    addLiquidityBUSDAsymSPARTA(acc2, _.BN2Str(_.oneBN.times(100)))
    removeLiquidityBUSD(5000, acc1)
    removeLiquidityBUSD(5000, acc0)
    removeLiquidityBNB(5000, acc1)
    removeLiquidityBNB(3000, acc0)
    addLiquidityBNB(acc2, 1)
    addLiquidityBUSD(acc2, 1)
    removeLiquidityBNBAsym(1000,acc1)
    removeLiquidityBUSDAsym(1000,acc1)
    removeLiquidityBUSDAsymSPARTA(1000, acc1)
    removeLiquidityBNBAsymSPARTA(2000, acc1) 
    removeLiquidityBNB(10000, acc1)
    removeLiquidityBNB(10000, acc0)
    removeLiquidityBNB(10000, acc2)
    removeLiquidityBUSD(10000, acc1)
    removeLiquidityBUSD(10000, acc0)
    removeLiquidityBUSD(10000, acc2)
    BNBPoolBalanceCheck()
    TokenPoolBalanceCheck()
})


//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
        sparta = await SPARTA.new(acc0)         // deploy sparta v2
        Dao = await DAO.new(sparta.address)     // deploy daoV2
        wbnb = await WBNB.new()                 // deploy wBNB 
        utils = await UTILS.new(sparta.address) // deploy utilsV2
        token1 = await TOKEN.new()   
        reserve = await RESERVE.new(sparta.address) // deploy reserve 
        daoVault = await DAOVAULT.new(sparta.address); // deploy daoVault
        router = await ROUTER.new(sparta.address, wbnb.address,); // deploy router
        poolFactory = await POOLFACTORY.new(sparta.address,  wbnb.address) // deploy poolfactory

        await Dao.setGenesisAddresses(router.address,utils.address,reserve.address, utils.address);
        await Dao.setVaultAddresses(daoVault.address,daoVault.address, daoVault.address);
        await Dao.setFactoryAddresses(poolFactory.address,poolFactory.address);
        await sparta.changeDAO(Dao.address)
     
        // await reserve.flipEmissions();    
        // await sparta.flipEmissions();  
        // await sparta.flipMinting();

        await sparta.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await sparta.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
       

        await token1.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))

        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await sparta.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await sparta.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await sparta.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await sparta.approve(poolFactory.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await sparta.approve(poolFactory.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await sparta.approve(poolFactory.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await token1.approve(poolFactory.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token1.approve(poolFactory.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token1.approve(poolFactory.address, _.BN2Str(500000 * _.one), { from: acc2 })


    });
}
async function createPoolBNB(acc, inputB, inputT) {
    it("It should deploy BNB Pool", async () => {
        let inputBase = _.getBN(inputB * _.one)
        let inputToken = _.getBN(inputT * _.one)
        let token = _.BNB
        var _pool = await poolFactory.createPoolADD.call(inputBase, inputToken, token, {value: inputToken})
        await poolFactory.createPoolADD(inputBase, inputToken, token, {value: inputToken})
        poolBNB = await POOL.at(_pool)
        //console.log(`Pools: ${poolBNB.address}`)
        const baseAddr = await poolBNB.BASE()
        assert.equal(baseAddr, sparta.address, "address is correct")
        let supply = await sparta.totalSupply()
        await sparta.approve(router.address, supply, { from: acc0 })
        await sparta.approve(router.address, supply, { from: acc1 })

        assert.equal(_.BN2Str(await wbnb.balanceOf(poolBNB.address)), _.BN2Str(inputToken), 'wbnb balance')
        assert.equal(_.BN2Str(await sparta.balanceOf(poolBNB.address)), _.BN2Str(inputBase), 'sparta balance')
        assert.equal(_.BN2Str(await poolBNB.balanceOf(acc0)), _.BN2Str(inputBase.minus(100*10**18)), 'Correct LPS')

    })
}
async function createPoolBUSD(acc, inputB, inputT) {
    it("It should deploy BUSD Pool", async () => {
        let inputBase = _.getBN(inputB * _.one)
        let inputToken = _.getBN(inputT * _.one)
        let token = token1.address
        var _pool = await poolFactory.createPoolADD.call(inputBase, inputToken, token,{from:acc})
        await poolFactory.createPoolADD(inputBase, inputToken, token,{from:acc})
        poolBUSD = await POOL.at(_pool)

        const baseAddr = await poolBUSD.BASE()
        assert.equal(baseAddr, sparta.address, "address is correct")

        let supply = await sparta.totalSupply()
        await sparta.approve(poolBUSD.address, supply, { from: acc0 })
        await sparta.approve(poolBUSD.address, supply, { from: acc1 })

        assert.equal(_.BN2Str(await token1.balanceOf(poolBUSD.address)), _.BN2Str(inputToken), 'BUSD balance')
        assert.equal(_.BN2Str(await sparta.balanceOf(poolBUSD.address)), _.BN2Str(inputBase), 'sparta balance')
        assert.equal(_.BN2Str(await poolBUSD.balanceOf(acc)), _.BN2Str(inputBase.minus(100*10**18)), 'Correct LPS')

    })
}
async function addLiquidityBNB(acc, t) {
    it(`It should addLiquidity BNB`, async () => {
        let token = _.BNB
        let inputToken = _.getBN(t * _.one)
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        let b = inputToken.times(B).div(T);
        poolUnits = _.getBN((await poolBNB.totalSupply()))
        let before = _.getBN(await poolBNB.balanceOf(acc))
        let units = math.calcLiquidityUnits(b, B, inputToken, T, poolUnits)
        let tx = await router.addLiquidity(inputToken,b, token, {from: acc, value:inputToken})
         poolData = await utils.getPoolData(token);
         assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(B.plus(b)))
         assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.plus(inputToken)))
         assert.equal(_.BN2Str((await poolBNB.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
         assert.equal(_.BN2Str(await poolBNB.balanceOf(acc)), _.BN2Str(before.plus(units)), 'units')
         assert.equal(_.BN2Str(await sparta.balanceOf(poolBNB.address)), _.BN2Str(B.plus(b)), 'sparta balance')
         assert.equal(_.BN2Str(await wbnb.balanceOf(poolBNB.address)), _.BN2Str(T.plus(inputToken)), 'wbnb balance')
    })
}
async function addLiquidityBUSD(acc, t) {
    it(`It should addLiquidity BUSD `, async () => {
        let token = token1.address
        let inputToken = _.getBN(t * _.one)
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        let b = inputToken.times(B).div(T);
        poolUnits = _.getBN((await poolBUSD.totalSupply()))
        let before = _.getBN(await poolBUSD.balanceOf(acc))
        let units = math.calcLiquidityUnits(b, B, inputToken, T, poolUnits)
        let tx = await router.addLiquidity(inputToken,b, token, {from: acc})
         poolData = await utils.getPoolData(token);
         assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(B.plus(b)))
         assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.plus(inputToken)))
         assert.equal(_.BN2Str((await poolBUSD.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
         assert.equal(_.BN2Str(await poolBUSD.balanceOf(acc)), _.BN2Str(before.plus(units)), 'units')
         assert.equal(_.BN2Str(await sparta.balanceOf(poolBUSD.address)), _.BN2Str(B.plus(b)), 'sparta balance')
         assert.equal(_.BN2Str(await token1.balanceOf(poolBUSD.address)), _.BN2Str(T.plus(inputToken)), 'wbnb balance')
    })
}
async function removeLiquidityBUSD(bp, acc) {
    it(`It should removeLiquidity BUSD`, async () => {
        let token = token1.address
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        let totalUnits = _.getBN((await poolBUSD.totalSupply()))
        let addLiquidityUnits = _.getBN(await poolBUSD.balanceOf(acc))
        let share = (addLiquidityUnits.times(bp)).div(10000)
        let b = _.floorBN((B.times(share)).div(totalUnits))
        let t = _.floorBN((T.times(share)).div(totalUnits))
        await poolBUSD.approve(router.address, _.BN2Str(100000*10**18),{from:acc})
        let tx = await router.removeLiquidity(bp, token, { from: acc})
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str((await poolBUSD.totalSupply())), _.BN2Str(totalUnits.minus(share)), 'poolUnits')
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Int(B.minus(b)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.minus(t)))
        assert.equal(_.BN2Str(await sparta.balanceOf(poolBUSD.address)), _.BN2Int(B.minus(b)), 'sparta balance')
        assert.equal(_.BN2Str(await token1.balanceOf(poolBUSD.address)), _.BN2Str(T.minus(t)), 'busd balance')
        assert.equal(_.BN2Str(await poolBUSD.balanceOf(acc)), _.BN2Str(addLiquidityUnits.minus(share)), 'addLiquidityrUnits')
        
    })
}
async function removeLiquidityBNB(bp, acc) {
    it(`It should removeLiquidity BNB`, async () => {
        let token = _.BNB
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        let totalUnits = _.getBN((await poolBNB.totalSupply()))
        let addLiquidityUnits = _.getBN(await poolBNB.balanceOf(acc))
        let share =  _.floorBN(addLiquidityUnits.times(bp)).div(10000)
        let b = _.floorBN((B.times(share)).div(totalUnits))
        let t = _.floorBN((T.times(share)).div(totalUnits))
        await poolBNB.approve(router.address, _.BN2Str(100000*10**18),{from:acc})
        let tx = await router.removeLiquidity(bp, token, { from: acc})
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str((await poolBNB.totalSupply())), _.BN2Str(totalUnits.minus(share)), 'poolUnits')
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Int(B.minus(b)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.minus(t)))
        assert.equal(_.BN2Str(await sparta.balanceOf(poolBNB.address)), _.BN2Int(B.minus(b)), 'sparta balance')
        // assert.equal(_.BN2Str(await token1.balanceOf(poolBNB.address)), _.BN2Str(T.minus(t)), 'busd balance')
        assert.equal(_.BN2Str(await poolBNB.balanceOf(acc)), _.BN2Str(addLiquidityUnits.minus(share)), 'addLiquidityrUnits')
        
    })
}
async function addLiquidityBNBAsym(acc, t) {
    it(`It should addLiquidity ASYM BNB `, async () => {
        let token = _.BNB
        let inputToken = _.getBN(t)
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        let b = math.calcSwapOutput(inputToken.div(2), T, B);
        poolUnits = _.getBN((await poolBNB.totalSupply()))
        let before = _.getBN(await poolBNB.balanceOf(acc))
        let units = math.calcLiquidityUnits(b, B.minus(b), inputToken.div(2), T.plus(inputToken.div(2)), poolUnits)
        let tx = await router.addLiquidityAsym(inputToken, false, token, {from: acc, value:inputToken})
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(B))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.plus(inputToken)))
        assert.equal(_.BN2Str((await poolBNB.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits') // Manual Verification Required
        assert.equal(_.BN2Str(await poolBNB.balanceOf(acc)), _.BN2Str(before.plus(units)), 'units') // Manual Verification Required
        assert.equal(_.BN2Str(await sparta.balanceOf(poolBNB.address)), _.BN2Str(B), 'sparta balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolBNB.address)), _.BN2Str(T.plus(inputToken)), 'wbnb balance')
        assert.equal(_.BN2Str(await poolBNB.balanceOf(acc)), _.BN2Str(units), 'Correct LPS')
    })
}
async function addLiquidityBNBAsymSPARTA(acc, b) {
    it(`It should addLiquidity ASYM BNB `, async () => {
        let token = _.BNB
        let inputToken = _.getBN(b)
        let lpBal = _.getBN(await poolBNB.balanceOf(acc));
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        let t = math.calcSwapOutput(inputToken.div(2), B, T);
        poolUnits = _.getBN((await poolBNB.totalSupply()))
        let before = _.getBN(await poolBNB.balanceOf(acc))
        let units = math.calcLiquidityUnits(inputToken.div(2), B.plus(inputToken.div(2)), t, T.minus(t), poolUnits)
        let tx = await router.addLiquidityAsym(inputToken, true, token, {from: acc})
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(B.plus(inputToken)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T))
        assert.equal(_.BN2Str((await poolBNB.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits') // Manual Verification Required
        assert.equal(_.BN2Str(await poolBNB.balanceOf(acc)), _.BN2Str(before.plus(units)), 'units') // Manual Verification Required
        assert.equal(_.BN2Str(await sparta.balanceOf(poolBNB.address)), _.BN2Str(B.plus(inputToken)), 'sparta balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolBNB.address)), _.BN2Str(T), 'wbnb balance')
        assert.equal(_.BN2Str(await poolBNB.balanceOf(acc)), _.BN2Str(lpBal.plus(units)), 'Correct LPS')
    })
}
async function addLiquidityBUSDAsym(acc, t) {
    it(`It should addLiquidity ASYM Sparta `, async () => {
        let token = token1.address
        let inputToken = _.getBN(t)
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        let b = math.calcSwapOutput(inputToken.div(2), T, B);
        poolUnits = _.getBN((await poolBUSD.totalSupply()))
        let before = _.getBN(await poolBUSD.balanceOf(acc))
        let units = math.calcLiquidityUnits(b, B.minus(b), inputToken.div(2), T.plus(inputToken.div(2)), poolUnits)
        let tx = await router.addLiquidityAsym(inputToken, false, token, {from: acc})
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(B))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.plus(inputToken)))
         assert.equal(_.BN2Str((await poolBUSD.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits') // Manual Verification Required
         assert.equal(_.BN2Str(await poolBUSD.balanceOf(acc)), _.BN2Str(before.plus(units)), 'units') // Manual Verification Required
        assert.equal(_.BN2Str(await sparta.balanceOf(poolBUSD.address)), _.BN2Str(B), 'sparta balance')
        assert.equal(_.BN2Str(await token1.balanceOf(poolBUSD.address)), _.BN2Str(T.plus(inputToken)), 'wbnb balance')
         assert.equal(_.BN2Str(await poolBUSD.balanceOf(acc)), _.BN2Str(units), 'Correct LPS')
    })
}
async function addLiquidityBUSDAsymSPARTA(acc, b) {
    it(`It should addLiquidity ASYM Sparta `, async () => {
        let token = token1.address
        let inputToken = _.getBN(b)
        let lpBal = _.getBN(await poolBUSD.balanceOf(acc));
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        let t = math.calcSwapOutput(inputToken.div(2), B, T);
        poolUnits = _.getBN((await poolBUSD.totalSupply()))
        let before = _.getBN(await poolBUSD.balanceOf(acc))
        let units = math.calcLiquidityUnits(inputToken.div(2), B.plus(inputToken.div(2)), t, T.minus(t), poolUnits)
        let tx = await router.addLiquidityAsym(inputToken, true, token, {from: acc})
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(B.plus(inputToken)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T))
        assert.equal(_.BN2Str((await poolBUSD.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits') // Manual Verification Required
        assert.equal(_.BN2Str(await poolBUSD.balanceOf(acc)), _.BN2Str(before.plus(units)), 'units') // Manual Verification Required
        assert.equal(_.BN2Str(await sparta.balanceOf(poolBUSD.address)), _.BN2Str(B.plus(inputToken)), 'sparta balance')
        assert.equal(_.BN2Str(await token1.balanceOf(poolBUSD.address)), _.BN2Str(T), 'wbnb balance')
        assert.equal(_.BN2Str(await poolBUSD.balanceOf(acc)), _.BN2Str(lpBal.plus(units)), 'Correct LPS')
    })
}
async function removeLiquidityBNBAsym(bp, acc) {
    it(`It should removeLiquidity ASYM BNB`, async () => {
        let token = _.BNB
         let poolData = await utils.getPoolData(token);
         let acSB = _.BN2Str(await sparta.balanceOf(acc))
         let bnbStart = _.getBN(await web3.eth.getBalance(acc))
         var B = _.getBN(poolData.baseAmount)
         var T = _.getBN(poolData.tokenAmount)
         let totalUnits = _.getBN((await poolBNB.totalSupply()))
         let addLiquidityUnits = _.getBN(await poolBNB.balanceOf(acc))
         let share =  _.floorBN(addLiquidityUnits.times(bp)).div(10000)
         let b = _.floorBN((B.times(share)).div(totalUnits))
         let t = _.floorBN((T.times(share)).div(totalUnits))
        await poolBNB.approve(router.address, _.BN2Str(100000*10**18),{from:acc})
        let tx = await router.removeLiquidityAsym(bp, false, token, { from: acc})
         poolData = await utils.getPoolData(token);
         assert.equal(_.BN2Str((await poolBNB.totalSupply())), _.BN2Str(totalUnits.minus(share)), 'poolUnits')
         let tt = math.calcSwapOutput(b, B.minus(b), T.minus(t));
         assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Int(B))
         assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.minus(t.plus(tt))))
         assert.equal(_.BN2Str(await sparta.balanceOf(poolBNB.address)), _.BN2Int(B), 'sparta balance')
         assert.equal(_.BN2Str(await wbnb.balanceOf(poolBNB.address)), _.BN2Str(T.minus(t.plus(tt))), 'busd balance')
         assert.equal(_.BN2Str(await poolBNB.balanceOf(acc)), _.BN2Str(addLiquidityUnits.minus(share)), 'addLiquidityrUnits')
         assert.equal(_.BN2Str(await sparta.balanceOf(acc)), acSB,'correct sparta balance')
         assert.isAtMost(_.BN2Int(await web3.eth.getBalance(acc)), _.BN2Int(bnbStart.plus(t.plus(tt))), 'bnb balance')
    })
}
async function removeLiquidityBUSDAsym(bp, acc) {
    it(`It should removeLiquidity ASYM BUSD`, async () => {
        let token = token1.address
         let poolData = await utils.getPoolData(token);
         let acSB = _.BN2Str(await sparta.balanceOf(acc))
         let acBB = _.getBN(await token1.balanceOf(acc))
         var B = _.getBN(poolData.baseAmount)
         var T = _.getBN(poolData.tokenAmount)
         let totalUnits = _.getBN((await poolBUSD.totalSupply()))
         let addLiquidityUnits = _.getBN(await poolBUSD.balanceOf(acc))
         let share =  _.floorBN(addLiquidityUnits.times(bp)).div(10000)
         let b = _.floorBN((B.times(share)).div(totalUnits))
         let t = _.floorBN((T.times(share)).div(totalUnits))
        await poolBUSD.approve(router.address, _.BN2Str(100000*10**18),{from:acc})
        let tx = await router.removeLiquidityAsym(bp, false, token, { from: acc})
         poolData = await utils.getPoolData(token);
         assert.equal(_.BN2Str((await poolBUSD.totalSupply())), _.BN2Str(totalUnits.minus(share)), 'poolUnits')
         let tt = math.calcSwapOutput(b, B.minus(b), T.minus(t));
         assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Int(B))
         assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.minus(t.plus(tt))))
         assert.equal(_.BN2Str(await sparta.balanceOf(poolBUSD.address)), _.BN2Int(B), 'sparta balance')
         assert.equal(_.BN2Str(await token1.balanceOf(poolBUSD.address)), _.BN2Str(T.minus(t.plus(tt))), 'busd balance')
         assert.equal(_.BN2Str(await poolBUSD.balanceOf(acc)), _.BN2Str(addLiquidityUnits.minus(share)), 'addLiquidityrUnits')
         assert.equal(_.BN2Str(await sparta.balanceOf(acc)), acSB,'correct sparta balance')
         assert.equal(_.BN2Str(await token1.balanceOf(acc)), _.BN2Str(acBB.plus(t.plus(tt))),'correct token balance')
    })
}
async function removeLiquidityBUSDAsymSPARTA(bp, acc) {
    it(`It should removeLiquidity ASYM BUSD Sparta`, async () => {
        let token = token1.address
         let poolData = await utils.getPoolData(token);
         let acSB = _.getBN(await sparta.balanceOf(acc))
         let acBB = _.getBN(await token1.balanceOf(acc))
         var B = _.getBN(poolData.baseAmount)
         var T = _.getBN(poolData.tokenAmount)
         let totalUnits = _.getBN((await poolBUSD.totalSupply()))
         let addLiquidityUnits = _.getBN(await poolBUSD.balanceOf(acc))
         let share =  _.floorBN(addLiquidityUnits.times(bp)).div(10000)
         let b = _.floorBN((B.times(share)).div(totalUnits))
         let t = _.floorBN((T.times(share)).div(totalUnits))
        await poolBUSD.approve(router.address, _.BN2Str(100000*10**18),{from:acc})
        let tx = await router.removeLiquidityAsym(bp, true, token, { from: acc})
         poolData = await utils.getPoolData(token);
         assert.equal(_.BN2Str((await poolBUSD.totalSupply())), _.BN2Str(totalUnits.minus(share)), 'poolUnits')
         let bb = math.calcSwapOutput(t, T.minus(t), B.minus(b));
         assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Int(B.minus(b.plus(bb))))
         assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T))
         assert.equal(_.BN2Str(await sparta.balanceOf(poolBUSD.address)), _.BN2Int(B.minus(b.plus(bb))), 'sparta balance')
         assert.equal(_.BN2Str(await token1.balanceOf(poolBUSD.address)), _.BN2Str(T), 'busd balance')
         assert.equal(_.BN2Str(await poolBUSD.balanceOf(acc)), _.BN2Str(addLiquidityUnits.minus(share)), 'addLiquidityrUnits')
         assert.equal(_.BN2Str(await sparta.balanceOf(acc)), _.BN2Str(acSB.plus(b.plus(bb))),'correct sparta balance')
         assert.equal(_.BN2Str(await token1.balanceOf(acc)), _.BN2Str(acBB),'correct token balance')
    })
}
async function removeLiquidityBNBAsymSPARTA(bp, acc) {
    it(`It should removeLiquidity ASYM BNB Sparta`, async () => {
        let token = _.BNB
         let poolData = await utils.getPoolData(token);
         let acSB = _.getBN(await sparta.balanceOf(acc))
         let bnbStart = _.getBN(await web3.eth.getBalance(acc))
         var B = _.getBN(poolData.baseAmount)
         var T = _.getBN(poolData.tokenAmount)
         let totalUnits = _.getBN((await poolBNB.totalSupply()))
         let addLiquidityUnits = _.getBN(await poolBNB.balanceOf(acc))
         let share =  _.floorBN(addLiquidityUnits.times(bp)).div(10000)
         let b = _.floorBN((B.times(share)).div(totalUnits))
         let t = _.floorBN((T.times(share)).div(totalUnits))
        await poolBNB.approve(router.address, _.BN2Str(100000*10**18),{from:acc})
        let tx = await router.removeLiquidityAsym(bp, true, token, { from: acc})
         poolData = await utils.getPoolData(token);
         assert.equal(_.BN2Str((await poolBNB.totalSupply())), _.BN2Str(totalUnits.minus(share)), 'poolUnits')
         let bb = math.calcSwapOutput(t, T.minus(t), B.minus(b));
         assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Int(B.minus(b.plus(bb))))
         assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T))
         assert.equal(_.BN2Str(await sparta.balanceOf(poolBNB.address)), _.BN2Int(B.minus(b.plus(bb))), 'sparta balance')
         assert.equal(_.BN2Str(await wbnb.balanceOf(poolBNB.address)), _.BN2Str(T), 'busd balance')
         assert.equal(_.BN2Str(await poolBNB.balanceOf(acc)), _.BN2Str(addLiquidityUnits.minus(share)), 'addLiquidityrUnits')
         assert.equal(_.BN2Str(await sparta.balanceOf(acc)), _.BN2Str(acSB.plus(b.plus(bb))),'correct sparta balance')
         assert.isAtMost(_.BN2Int(await web3.eth.getBalance(acc)), _.BN2Int(bnbStart), 'bnb balance')
         
    })
}





//=========================================HELPERS==========================================//
async function BalanceCheck() {
    it("", async () => {
        let token = sparta.address
        let routerSB = _.BN2Str(await sparta.balanceOf(router.address))
        let PoolFSB = _.BN2Str(await sparta.balanceOf(poolFactory.address))
        let reserveFSB = _.BN2Str(await sparta.balanceOf(reserve.address))
        console.log("Router Sparta Bal: ",routerSB/10**18);
        console.log("PoolFactory Sparta Bal: ",PoolFSB/10**18);
        console.log("Reserve Sparta Bal: ",reserveFSB/10**18);
    })
}
async function BNBPoolBalanceCheck() {
    it("", async () => {
        let poolSB = _.BN2Str(await sparta.balanceOf(poolBNB.address))
        let poolTB = _.BN2Str(await wbnb.balanceOf(poolBNB.address))
        let supply = _.BN2Str(await poolBNB.totalSupply())
        console.log("BNB POOL Sparta Bal: ", poolSB/10**18);
        console.log("BNB POOL Token Bal: ", poolTB/10**18);
        console.log("BNB POOL TotalSupply ", supply/10**18);
    })
}
async function TokenPoolBalanceCheck() {
    it("", async () => {
        let poolSB = _.BN2Str(await sparta.balanceOf(poolBUSD.address))
        let poolTB = _.BN2Str(await token1.balanceOf(poolBUSD.address))
        let supply = _.BN2Str(await poolBUSD.totalSupply())
        console.log("BUSD POOL Sparta Bal: ", poolSB/10**18);
        console.log("BUSD POOL Token Bal: ", poolTB/10**18);
        console.log("BUSD POOL TotalSupply ", supply/10**18);
    })
}

