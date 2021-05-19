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


var sparta; var token1;  var token2; var wbnb;
var utils; var utils2; var router; var router2; var Dao; var Dao2;
var poolBNB; var poolTKN1; var synthTNK2; var synthBNB;
var acc0; var acc1; var acc2; var acc3;
var allocation = 2500000;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
contract('ADD LIQUIDITY', function (accounts) {

    constructor(accounts)
    wrapBNB()
     createPoolBNB()
     createPoolTKN() 
     addLiquidityBNB(acc1, _.BN2Str(_.one * 100), _.BN2Str(_.one * 10))
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
        sparta = await SPARTA.new(acc0) // deploy sparta v2
        Dao = await DAO.new(sparta.address)     // deploy daoV2
        wbnb = await WBNB.new() // deploy wBNB 
        utils = await UTILS.new(sparta.address) // deploy utilsV2
        token1 = await TOKEN.new()   
        reserve = await RESERVE.new(sparta.address) // deploy reserve 
        daoVault = await DAOVAULT.new(sparta.address); // deploy daoVault
        router = await ROUTER.new(sparta.address, wbnb.address,); // deploy router
        poolFactory = await POOLFACTORY.new(sparta.address,  wbnb.address) // deploy poolfactory

        await Dao.setGenesisAddresses(router.address,utils.address,utils.address,reserve.address, daoVault.address);
        await Dao.setFactoryAddresses(poolFactory.address,utils.address);
        await sparta.changeDAO(Dao.address)

        await sparta.transfer(acc1, _.getBN(_.BN2Str(10000 * _.one)))
        await sparta.transfer(acc2, _.getBN(_.BN2Str(10000 * _.one)))

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
async function createPoolBNB(SPT, token) {
    it("It should deploy BNB Pool", async () => {
        var _pool = await poolFactory.createPool.call(_.BNB)
        await poolFactory.createPool(_.BNB)
        poolBNB = await POOL.at(_pool)
        //console.log(`Pools: ${poolBNB.address}`)
        const baseAddr = await poolBNB.BASE()
        assert.equal(baseAddr, sparta.address, "address is correct")

        let supply = await sparta.totalSupply()
        await sparta.approve(poolBNB.address, supply, { from: acc0 })
        await sparta.approve(poolBNB.address, supply, { from: acc1 })

    })
}
async function createPoolTKN(SPT, token) {
    it("It should deploy USD Pool", async () => {
        var _pool = await poolFactory.createPool.call(token1.address)
        await poolFactory.createPool(token1.address)
        poolTKN = await POOL.at(_pool)
        //console.log(`Pools: ${poolBNB.address}`)
        const baseAddr = await poolTKN.BASE()
        assert.equal(baseAddr, sparta.address, "address is correct")

        let supply = await sparta.totalSupply()
        await sparta.approve(poolTKN.address, supply, { from: acc0 })
        await sparta.approve(poolTKN.address, supply, { from: acc1 })

    })
}

async function addLiquidityBNB(acc, b, t) {
    it(`It should addLiquidity BNB from ${acc}`, async () => {
        let token = _.BNB
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolBNB.totalSupply()))
        let before = _.getBN(await poolBNB.balanceOf(acc))
        let units = math.calcLiquidityUnits(b, B, t, T, poolUnits)
         await sparta.approve(router.address, b,  {from:acc})
         let tx = await router.addLiquidity(b, t, token, { from: acc, value:t})
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(B.plus(b)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.plus(t)))
        assert.equal(_.BN2Str((await poolBNB.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
        assert.equal(_.BN2Str(await poolBNB.balanceOf(acc)), _.BN2Str(before.plus(units)), 'units')
        assert.equal(_.BN2Str(await sparta.balanceOf(poolBNB.address)), _.BN2Str(B.plus(b)), 'sparta balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolBNB.address)), _.BN2Str(T.plus(t)), 'wbnb balance')
    })
}
async function addLiquidity(acc, b, t) {
    it(`It should addLiquidity TKN from ${acc}`, async () => {
        let token = token1.address
        // console.log(token.address);
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolTKN.totalSupply()))
        let before = _.getBN(await poolTKN.balanceOf(acc))
        let units = math.calcLiquidityUnits(b, B, t, T, poolUnits)
        await sparta.approve(router.address, _.BN2Str(10000*10**18), {from:acc})
         let tx = await router.addLiquidity(b, t, token, { from: acc, value:t})
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(B.plus(b)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.plus(t)))
        assert.equal(_.BN2Str((await poolTKN.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
        assert.equal(_.BN2Str(await poolTKN.balanceOf(acc)), _.BN2Str(before.plus(units)), 'units')
        assert.equal(_.BN2Str(await sparta.balanceOf(poolTKN.address)), _.BN2Str(B.plus(b)), 'sparta balance')
        assert.equal(_.BN2Str(await token1.balanceOf(poolTKN.address)), _.BN2Str(T.plus(t)), 'wbnb balance')
    })
}
async function addLiquidityAsym(acc, b) {

    it(`It should addLiquidity ASYM BNB from ${acc}`, async () => {
        let token = wbnb.address
        // let poolData = await utils.getPoolData(token);
        // var B = _.getBN(poolData.baseAmount)
        // var T = _.getBN(poolData.tokenAmount)
        // poolUnits = _.getBN((await poolBNB.totalSupply()))
        // let before = _.getBN(await poolBNB.balanceOf(acc))
        // let units = math.calcLiquidityUnits(b, B, t, T, poolUnits)
        let tx = await router.addLiquiditySingle(b,false, token,{from: acc, value:b})
    })
}
async function removeLiquidityBNB(bp, acc) {

    it(`It should removeLiquidity BNB for ${acc}`, async () => {
        let token = _.BNB
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        let totalUnits = _.getBN((await poolBNB.totalSupply()))
        let addLiquidityUnits = _.getBN(await poolBNB.balanceOf(acc))
        let share = (addLiquidityUnits.times(bp)).div(10000)
        let b = _.floorBN((B.times(share)).div(totalUnits))
        let t = _.floorBN((T.times(share)).div(totalUnits))
        await poolBNB.approve(router.address, _.BN2Str(100000*10**18),{from:acc})
        let tx = await router.removeLiquidity(bp, token, { from: acc})
        poolData = await utils.getPoolData(token);
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputBase), _.BN2Str(_.floorBN(b)), 'outputBase')
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputToken), _.BN2Str(_.floorBN(t)), 'outputToken')
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')
        assert.equal(_.BN2Str((await poolBNB.totalSupply())), totalUnits.minus(share), 'poolUnits')
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Int(B.minus(b)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.minus(t)))
        assert.equal(_.BN2Str(await sparta.balanceOf(poolBNB.address)), _.BN2Int(B.minus(b)), 'sparta balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolBNB.address)), _.BN2Str(T.minus(t)), 'wbnb balance')
        assert.equal(_.BN2Str(await poolBNB.balanceOf(acc)), _.BN2Str(addLiquidityUnits.minus(share)), 'addLiquidityrUnits')
    })
}
async function removeLiquidityBNBASYM(bp, acc) {
    it(`It should removeLiquidity asym BNB for ${acc}`, async () => {
        let token = _.BNB
        let addLiquidityUnits = _.getBN(await poolBNB.balanceOf(acc))

        let tx = await router.removeLiquiditySingle(addLiquidityUnits,true, token,{ from: acc})
        

    })
}

