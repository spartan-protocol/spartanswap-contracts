const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');

var BASE = artifacts.require("./BaseMinted.sol");
var DAO = artifacts.require("./Dao.sol");
var DAOV1 = artifacts.require("./DaoM.sol");
var ROUTER = artifacts.require("./Router.sol");
var ROUTERV1 = artifacts.require("./RouterM.sol");
var POOL = artifacts.require("./Pool.sol");
var POOLv1 = artifacts.require("./PoolM.sol");
var UTILS = artifacts.require("./Utils.sol");
var UTILSV1 = artifacts.require("./UtilsM.sol");
var synthRouter = artifacts.require("./synthRouter.sol");
var SYNTH = artifacts.require("./synth.sol");
var BOND = artifacts.require("./Bond.sol");
var BONDv2 = artifacts.require("./BondV2M.sol");
var BONDv3 = artifacts.require("./BondV3M.sol");
var TOKEN = artifacts.require("./Token1.sol");
var TOKEN2 = artifacts.require("./Token2.sol");
var PSFACTORY = artifacts.require("./PSFactory.sol");
var WBNB = artifacts.require("./WBNB");
var DAOVAULT = artifacts.require("./DaoVault.sol");
var UPGR = artifacts.require("./SPARTANUPGRADE.sol");

var base; var token1;  var token2; var wbnb;
var utils; var utils2; var router; var router2; var Dao; var Dao2;
var poolWBNB; var poolTKN1; var synthTNK2; var synthBNB;
var acc0; var acc1; var acc2; var acc3;
var allocation = 2500000;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
contract('UpgradeContracts', function (accounts) {
    constructor(accounts)
     wrapBNB()
     createPoolWBNBMain() // mainnet replica
     createPoolTKN2Main()
     addLiquidityMain(acc1, _.BN2Str(_.one * 90), _.BN2Str(_.one * 9)) // mainnet replica
     addLiquidityTKN2Main(acc0,  _.BN2Str(20*_.one),  _.BN2Str(10*_.one))
     curatePoolsMain();
     buyTOKENMain(acc0, _.BN2Str(_.one * 1))
     sellTOKENMain(acc0, _.BN2Str(_.one))
     removeLiquidityBNBMain(1000, acc0)
     checkLockSupply()
     burnBondv2()
     burnBondv3()
     deployerListBNB()
     deployerChangeSecondsPerYear(10)
     depositBNB(acc2)
     claimLPAndLock(acc2, 2000) 
     withdrawBNB(acc2)
     createPoolWBNB() // SPV2
     createPoolTKN1() // SPV2
     createPoolTKN2() // SPV2
     swapInDao();
     addLiquidityBNB(acc1,_.BN2Str(10*_.one),  _.BN2Str(1*_.one));
     addLiquidityBNB(acc1,_.BN2Str(100*_.one),  _.BN2Str(10*_.one));
     //claimLPAndLock(acc2, 2000) 

     buyTOKEN(acc0, _.BN2Str(_.one * 1))
     sellTOKEN(acc0, _.BN2Str(_.one))
     removeLiquidityBNB(5000, acc0)
     ShowBNBMPool()
     ShowBNBPool()
     moveliquidity(acc0)
     moveliquidity(acc1)
     upgradeBondUsers(acc2)
     ShowBNBMPool()
     ShowBNBPool()
   // addLiquidityBNB(acc1,_.BN2Str(200*_.one),  _.BN2Str(10*_.one)); // SPV2
    // addLiquidityTKN2(acc1,  _.BN2Str(20*_.one),  _.BN2Str(10*_.one)) // SPV2
    // curatePools() // SPV2
    // createSyntheticBNB() // SPV2
   
})

//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
        //mainnet Replica
        base = await BASE.new() // deploy base
        wbnb = await WBNB.new() // deploy wBNB
        utilsv1 = await UTILSV1.new(base.address) 
        Daov1 = await DAOV1.new(base.address)     
        routerv1 = await ROUTERV1.new(base.address, wbnb.address) //deploy router
        await base.changeDAO(Daov1.address)     
        bondv2 = await BONDv2.new(base.address)     //deploy new bond
        bondv3 = await BONDv3.new(base.address)     //deploy new bond

        token1 = await TOKEN.new()             //deploy token
        token2 = await TOKEN2.new() 
        await Daov1.setGenesisAddresses(routerv1.address, utilsv1.address);

        await base.listAsset(bondv3.address, _.BN2Str(allocation* _.one),_.BN2Str(18*_.one) ) // list bond
        await base.listAsset(bondv2.address, _.BN2Str(5000000* _.one),_.BN2Str(1*_.one) ) // list bond
  

        //SPARTANPROTOCOLv2
        utils = await UTILS.new(base.address, routerv1.address) // deploy utilsV2
        Dao = await DAO.new(base.address)     // deploy daoV2
        router = await ROUTER.new(base.address, wbnb.address) //deploy router
        daoVault = await DAOVAULT.new(base.address);
        synthRouter = await synthRouter.new(base.address, wbnb.address) //deploy synthRouter
        bond = await BOND.new(base.address, wbnb.address);     //deploy new bond
        psFactory = await PSFACTORY.new(base.address,  wbnb.address) 
        upgrade = await UPGR.new(base.address, routerv1.address) // deploy wBNB
       
       // await base.changeDAO(Dao.address)  
       let supply = await token1.totalSupply()
        await base.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(routerv1.address, _.getBN(_.BN2Str(100000 * _.one)))
        await base.approve(routerv1.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await base.approve(routerv1.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await base.approve(routerv1.address, _.BN2Str(500000 * _.one), { from: acc2 })
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
        await token1.approve(routerv1.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token1.approve(routerv1.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token1.approve(routerv1.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await token1.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token1.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token1.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await token2.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await token2.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token2.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await token2.approve(routerv1.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token2.approve(routerv1.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token2.approve(routerv1.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await token2.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token2.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token2.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await token2.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token2.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token2.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await wbnb.approve(bondv3.address, supply, {from:acc1}) // approve bond 
        await token1.approve(bondv3.address, supply, {from:acc1}) // approve bond 
        await base.approve(bondv3.address, supply, {from:acc1})
        await wbnb.approve(bondv2.address, supply, {from:acc1}) // approve bond 
        await token1.approve(bondv2.address, supply, {from:acc1}) // approve bond 
        await base.approve(bondv2.address, supply, {from:acc1})

    });
}
async function wrapBNB() {
    it("It should wrap", async () => {
        await web3.eth.sendTransaction({to: wbnb.address, value:_.BN2Str(_.one*100), from:acc0});
        await wbnb.transfer(acc0, _.getBN(_.BN2Int(_.one * 30)))
        await wbnb.transfer(acc1, _.getBN(_.BN2Int(_.one * 30)))
        await wbnb.transfer(acc2, _.getBN(_.BN2Int(_.one * 30)))
        await wbnb.approve(routerv1.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await wbnb.approve(routerv1.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await wbnb.approve(routerv1.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
    })
}
async function createPoolWBNB(SPT, token) {
    it("It should deploy BNB Pool", async () => {
        var _pool = await psFactory.createPool.call( wbnb.address)
        await psFactory.createPool(wbnb.address)
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
    })
}
async function createPoolTKN1(SPT, token) {
    it("It should deploy TKN1 Pool", async () => {
        var _pool = await psFactory.createPool.call(token1.address)
        await psFactory.createPool(token1.address)
        poolTKN1 = await POOL.at(_pool)
        //console.log(`Pools: ${poolTKN1.address}`)
        const baseAddr = await poolTKN1.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        let supply = await base.totalSupply()
        await base.approve(poolTKN1.address, supply, { from: acc0 })
        await base.approve(poolTKN1.address, supply, { from: acc1 })
        await poolTKN1.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await poolTKN1.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await poolTKN1.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })

    })
}
async function createPoolTKN2(SPT, token) {
    it("It should deploy TKN2 Pool", async () => {
        var _pool = await psFactory.createPool.call(token2.address)
        await psFactory.createPool(token2.address)
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
async function addLiquidityBNB(acc, b, t) {
    it(`It should addLiquidity BNB from ${acc}`, async () => {
        let token = wbnb.address
        let tx = await router.addLiquidity(b, t, token, { from: acc})
    })
}
async function addLiquidityTKN2(acc, b, t) {
    it(`It should addLiquidity TKN2 from ${acc}`, async () => {
        let token = token2.address
        let tx = await router.addLiquidity(b, t, token, { from: acc})
    })
}
async function curatePools() {
    it("Curate POOls", async () => {
        await psFactory.addCuratedPool(wbnb.address);
        await psFactory.addCuratedPool(token1.address);
        await psFactory.addCuratedPool(token2.address);
       
    })
}
async function createSyntheticBNB() {
    it("It should Create Synthetic BNB ", async () => {
        var _synth =  await psFactory.createSynth.call(wbnb.address);
        await psFactory.createSynth(wbnb.address);
        synthBNB = await SYNTH.at(_synth)
        await synthBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await synthBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await synthBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
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

//upgrade
async function swapInDao() {
    it("swap Dao", async () => {
       await base.changeDAO(Dao.address)  
       await Dao.setGenesisAddresses(router.address, utils.address, synthRouter.address, bond.address, daoVault.address,psFactory.address );
    })
}
async function moveliquidity(acc) {
    it("Upgrade Liquidity", async () => {
        let asset = wbnb.address;
        let tB = _.BN2Str(await poolWBNBM.balanceOf(acc))
       // console.log(tB/_.one)
        await upgrade.migrateLiquidity(asset,tB, {from: acc} )
        let tBA = _.BN2Str(await poolWBNB.balanceOf(acc))
        //console.log(tBA/_.one)
    })
}
async function upgradeBondUsers(acc) {
    it("Upgrade Bondv2 Users", async () => {
        let token = wbnb.address;
        let asset = _.BNB
        let tB = _.BN2Str(await poolWBNBM.balanceOf(acc))
        console.log(tB/_.one)
        await bondv2.claim(asset,{from:acc})
        await upgrade.upgradeBond(token, {from: acc} )
        let tBA = _.BN2Str(await poolWBNB.balanceOf(acc))
         console.log(tBA/_.one)
    })
}


//MainNet Replica
async function createPoolWBNBMain() {
    it("It should deploy BNB Pool", async () => {
        var _pool = await routerv1.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 1), wbnb.address)
        await routerv1.createPool(_.BN2Str(_.one * 10),_.BN2Str(_.one * 1), wbnb.address)
        poolWBNBM = await POOLv1.at(_pool)
        //console.log(`Pools: ${poolWBNB.address}`)
        const baseAddr = await poolWBNBM.BASE()
        assert.equal(baseAddr, base.address, "address is correct")

        let supply = await base.totalSupply()
        await base.approve(poolWBNBM.address, supply, { from: acc0 })
        await base.approve(poolWBNBM.address, supply, { from: acc1 })
    })
}
async function createPoolTKN2Main(SPT, token) {
    it("It should deploy TKN2 Pool", async () => {
        var _pool = await routerv1.createPool.call(_.BN2Str(_.one * 10), _.dot1BN, token2.address)
        await routerv1.createPool(_.BN2Str(_.one * 10), _.dot1BN, token2.address)
        poolTKN2M = await POOLv1.at(_pool)
        const baseAddr = await poolTKN2M.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
      
        let supply = await base.totalSupply()
        await base.approve(poolTKN2M.address, supply, { from: acc0 })
        await base.approve(poolTKN2M.address, supply, { from: acc1 })
   })
}
async function addLiquidityMain(acc, b, t) {

    it(`It should addLiquidity BNB from ${acc}`, async () => {
        let token = wbnb.address
        let poolData = await utilsv1.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolWBNBM.totalSupply()))
        //console.log('start data', _.BN2Str(B), _.BN2Str(T), _.BN2Str(poolUnits))

        let units = math.calcLiquidityUnits(b, B, t, T, poolUnits)
        // console.log(_.BN2Str(units), _.BN2Str(b), _.BN2Str(B), _.BN2Str(t), _.BN2Str(T), _.BN2Str(poolUnits))
        
        let tx = await routerv1.addLiquidity(b, t, token, { from: acc})
        poolData = await utilsv1.getPoolData(token);
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(B.plus(b)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.plus(t)))
        assert.equal(_.BN2Str(poolData.baseAmountPooled), _.BN2Str(B.plus(b)))
        assert.equal(_.BN2Str(poolData.tokenAmountPooled), _.BN2Str(T.plus(t)))
        assert.equal(_.BN2Str((await poolWBNBM.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
        assert.equal(_.BN2Str(await poolWBNBM.balanceOf(acc)), _.BN2Str(units), 'units')
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNBM.address)), _.BN2Str(B.plus(b)), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNBM.address)), _.BN2Str(T.plus(t)), 'wbnb balance')
    })
}
async function addLiquidityTKN2Main(acc, b, t) {
    it(`It should addLiquidity TKN2 from ${acc}`, async () => {
        let token = token2.address
        let tx = await routerv1.addLiquidity(b, t, token, { from: acc})
    })
}
async function curatePoolsMain() {
    it("Curate POOls", async () => {
        await routerv1.addCuratedPoolM(wbnb.address);
        await routerv1.addCuratedPoolM(token2.address);
        //await router.addCuratedPool(token2.address);
        //await router.challengLowestCuratedPool(token2.address);
        // let curatedP = await router.curatedPools(0);
        // // console.log(curatedP)
       
    })
}
async function buyTOKENMain(acc, x) {

    it(`It should buy WBNB with BASE from ${acc}`, async () => {
        let baseStart = _.getBN(await base.balanceOf(acc))
        let tokenStart = _.getBN(await wbnb.balanceOf(acc))
        let token = wbnb.address
        let poolData = await utilsv1.getPoolData(token);
        const X = _.getBN(poolData.baseAmount)
        const Y = _.getBN(poolData.tokenAmount)
        // await help.logPool(utils, token, 'WBNB')
        //console.log('start data', _.BN2Str(X), _.BN2Str(Y))

        let y = math.calcSwapOutput(x, X, Y)
        let fee = math.calcSwapFee(x, X, Y)
        // console.log(_.BN2Str(y), _.BN2Str(Y), _.BN2Str(X), _.BN2Str(x), _.BN2Str(fee))
        
        let tx = await routerv1.buy(x, token)
        // console.log(tx)
        poolData = await utilsv1.getPoolData(token);

        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(x))
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(y))
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(Y.minus(y)))
        
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNBM.address)), _.BN2Str(X.plus(x)), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNBM.address)), _.BN2Str(Y.minus(y)), 'wbnb balance')
        
        assert.equal(_.BN2Str(await base.balanceOf(acc)), _.BN2Str(baseStart.minus(x)), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(acc)), _.BN2Str(tokenStart.plus(y)), 'wbnb balance')
        // await help.logPool(utils, token, 'WBNB')
    })
}
async function sellTOKENMain(acc, x) {

    it(`It should sell WBNB to BASE from ${acc}`, async () => {
        
        let baseStart = _.getBN(await base.balanceOf(acc))
        let tokenStart = _.getBN(await wbnb.balanceOf(acc))

        let token = wbnb.address
        let poolData = await utilsv1.getPoolData(token);
        const X = _.getBN(poolData.tokenAmount)
        const Y = _.getBN(poolData.baseAmount)
        // await help.logPool(utils, token, 'WBNB')
        //console.log('start data', _.BN2Str(X), _.BN2Str(Y))

        let y = math.calcSwapOutput(x, X, Y)
        let fee = math.calcSwapFee(x, X, Y)
        // console.log(_.BN2Str(x), _.BN2Str(X), _.BN2Str(y), _.BN2Str(Y), _.BN2Str(fee))

        let tx = await routerv1.sell(x, token)
        // console.log(tx.receipt.logs)
        // console.log(tx.receipt.rawLogs)

        poolData = await utilsv1.getPoolData(token);

        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(x))
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(y))
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(Y.minus(y)))

        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNBM.address)), _.BN2Str(X.plus(x)), 'wbnb balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNBM.address)), _.BN2Str(Y.minus(y)), 'base balance')

        assert.equal(_.BN2Str(await wbnb.balanceOf(acc)), _.BN2Str(tokenStart.minus(x)), 'wbnb balance')
        assert.equal(_.BN2Str(await base.balanceOf(acc)), _.BN2Str(baseStart.plus(y)), 'base balance')
        
        // await help.logPool(utils, token, 'WBNB')
    })
}
async function removeLiquidityBNBMain(bp, acc) {

    it(`It should removeLiquidity BNB for ${acc}`, async () => {
        let token = wbnb.address
        let poolData = await utilsv1.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)

        let baseStart = _.getBN(await base.balanceOf(acc))
        let tokenStart = _.getBN(await wbnb.balanceOf(acc))
        let bnbStart = _.getBN(await web3.eth.getBalance(acc))

        let totalUnits = _.getBN((await poolWBNBM.totalSupply()))
        let addLiquidityUnits = _.getBN(await poolWBNBM.balanceOf(acc))
        let share = (addLiquidityUnits.times(bp)).div(10000)
        let b = _.floorBN((B.times(share)).div(totalUnits))
        let t = _.floorBN((T.times(share)).div(totalUnits))
        // let memberData = (await utils.getMemberData(token, acc))
        // let baseAmount = _.getBN(memberData.baseAmountPooled)
        // let tokenAmount = _.getBN(memberData.tokenAmountPooled)
        // let vs = _.floorBN((baseAmount.times(bp)).div(10000))
        // let aa = _.floorBN((tokenAmount.times(bp)).div(10000))
        //console.log(_.BN2Str(totalUnits), _.BN2Str(liquidityUnitss), _.BN2Str(share), _.BN2Str(b), _.BN2Str(t))
        //await poolWBNBM.approve(routerv1.address, totalUnits,{from:acc});
        let tx = await routerv1.removeLiquidity(bp, token, { from: acc})
        poolData = await utilsv1.getPoolData(token);
        // //console.log(tx.receipt.logs)
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputBase), _.BN2Str(_.floorBN(b)), 'outputBase')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputToken), _.BN2Str(_.floorBN(t)), 'outputToken')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await poolWBNBM.totalSupply())), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Int(B.minus(b)))
        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.minus(t)))
        // assert.equal(_.BN2Str(poolData.baseAmountPooled), _.BN2Int(B.minus(b)))
        // assert.equal(_.BN2Str(poolData.tokenAmountPooled), _.BN2Str(T.minus(t)))
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNBM.address)), _.BN2Int(B.minus(b)), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNBM.address)), _.BN2Str(T.minus(t)), 'wbnb balance')

        // let memberData2 = (await utils.getMemberData(token, acc))
        // assert.equal(_.BN2Str((memberData2.baseAmountPooled)), _.BN2Str(baseAmount.minus(vs)), '0')
        // assert.equal(_.BN2Str((memberData2.tokenAmountPooled)), _.BN2Str(tokenAmount.minus(aa)), '0')
        assert.equal(_.BN2Str(await poolWBNBM.balanceOf(acc)), _.BN2Str(addLiquidityUnits.minus(share)), 'addLiquidityrUnits')

        assert.equal(_.BN2Str(await base.balanceOf(acc)), _.BN2Str(baseStart.plus(b)), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(acc)), _.BN2Str(tokenStart.plus(t)), 'wbnb balance')
       // assert.isAtLeast(_.BN2Int(await web3.eth.getBalance(acc)), _.BN2Int(bnbStart.plus(t).minus(3*10**15)), 'bnb balance')
    })
}
async function checkLockSupply(){
    it("It should mint 1 BOND token", async () => {
        let lockSupply = await bondv2.totalSupply()
        assert.equal(lockSupply,_.BN2Str(_.one), '1 Lock exists')
})
}
async function burnBondv2(){
    it("Burn bond for Allocation", async () => {
        let lockBalBefore = await bondv2.balanceOf(bondv2.address)
        assert.equal(_.BN2Str(lockBalBefore), _.BN2Str(_.one), '1 bond exist')
        let spartaBalBefore = await base.balanceOf(bondv2.address)
        assert.equal(spartaBalBefore,'0', 'Sparta balance zero')
       
        let tx = await bondv2.burnBond()
        // let tx1 = await bondtwo.burnBond()
        let lockBalAfter = await bond.balanceOf(bondv2.address)
        assert.equal(lockBalAfter,'0',  'bond was burnt')
        let spartaBalAfter = await base.balanceOf(bondv2.address)

    })
}
async function burnBondv3(){
    it("Burn bond for Allocation", async () => {
        let lockBalBefore = await bondv3.balanceOf(bondv3.address)
        assert.equal(_.BN2Str(lockBalBefore), _.BN2Str(_.one), '1 bond exist')
        let spartaBalBefore = await base.balanceOf(bondv3.address)
        assert.equal(spartaBalBefore,'0', 'Sparta balance zero')
       
        let tx = await bondv3.burnBond()
        // let tx1 = await bondtwo.burnBond()
        let lockBalAfter = await bond.balanceOf(bondv3.address)
        assert.equal(lockBalAfter,'0',  'bond was burnt')
        let spartaBalAfter = await base.balanceOf(bondv3.address)
        assert.equal(_.BN2Str(spartaBalAfter/_.one),allocation, 'did it get 5m sparta')
    })
}
async function deployerListBNB(){
    it('deployer list bnb asset', async () =>{
        let deployer = acc0;
        let asset = _.BNB;
        await bondv2.listBondAsset(asset, {from:deployer});
        await bondv3.listBondAsset(asset, {from:deployer});

    })
}
async function deployerChangeSecondsPerYear(seconds){
    it(`Deployer change bond period to ${seconds} seconds`, async () => {
        await bondv2.changeBondingPeriod(seconds, {from:acc0});
        await bondv3.changeBondingPeriod(seconds, {from:acc0});
        let secondsPerYearA = _.BN2Str(await bondv3.bondingPeriodSeconds());
        assert.equal(secondsPerYearA, seconds, 'deployer change bond period in seconds')
    })
}
async function depositBNB(acc){
    it(`It should deposit and bond into dao `, async () => {
        let asset = _.BNB
        let amount = _.BN2Str(_.one)
        let poolData = await utilsv1.getPoolData(asset);
        let spartaAllocation = await utilsv1.calcTokenPPinBase(asset,amount)
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolWBNBM.totalSupply()))
        let units = _.getBN(await utilsv1.calcLiquidityUnits(spartaAllocation, B, amount, T, poolUnits))
        DEPOTime = _.getBN((new Date())/1000)
       let tx = await bondv3.deposit(asset, amount,{from:acc, value:amount})
       let memberDetails = await bondv3.getMemberDetails(acc, asset);
       assert.equal(_.BN2Str(memberDetails.bondedLP), _.BN2Str(units), 'bonded LP')

        let poolData2 = await utilsv1.getPoolData(asset);
       let spartaAllocation2 = await utilsv1.calcValueInBase(asset,amount)
       var Bb = _.getBN(poolData2.baseAmount)
       var Tt = _.getBN(poolData2.tokenAmount)
       poolUnits2 = _.getBN((await poolWBNBM.totalSupply()))
       let units2 = _.getBN(await utilsv1.calcLiquidityUnits(spartaAllocation2, Bb, amount, Tt, poolUnits2))
       DEPOTime2 = _.getBN((new Date())/1000)
       let tx1 = await bondv2.deposit(asset, amount,{from:acc, value:amount})
       let memberDetails2 = await bondv2.getMemberDetails(acc, asset);
        assert.equal(_.BN2Str((await poolWBNBM.totalSupply())), _.BN2Str(poolUnits.plus(units).plus(units2)), 'poolUnits')
        //assert.equal(_.BN2Str(memberDetails2.bondedLP), _.BN2Str(units2.times(75).div(100)), 'bonded LP')

       
        
        
       
    })
}
async function claimLPAndLock(acc, ms){
    it(`It should claim and bond into DAO LPs after ${ms/1000} seconds`, async () => {
        await sleep(ms)
        let asset = _.BNB
        let now = _.getBN((new Date())/1000)
        let balBefore = _.getBN(await poolWBNBM.balanceOf(Daov1.address))
        let mbB = _.BN2Str(await poolWBNBM.balanceOf(acc))
        let spBONDBal = _.getBN(await poolWBNBM.balanceOf(Dao.address))
       // console.log("accbondv2",mbB);
         await bondv2.claim(asset,{from:acc})
        // //let accBal = _.getBN(await poolWBNBM.balanceOf(acc))
        // let mbA = _.BN2Str(await poolWBNBM.balanceOf(acc))
         let mDB = await bondv3.getMemberDetails(acc, asset);
         let BLPB = _.BN2Str(mDB.bondedLP)
        // console.log("accbondv2",mbA);
        //console.log("lockedbondv3B",BLPB);
        await bondv3.claimAndLock(asset,{from:acc})
        let mDA = await bond.getMemberDetails(acc, asset);
        let BLPA = _.BN2Str(mDA.bondedLP)
       // console.log("lockedbondv4A",BLPA);
        // let claimed = bondedLPB.minus(bondedLPAfter);
        // let balAfter = _.getBN(await poolWBNBM.balanceOf(Daov1.address))
        // assert.isAtLeast(_.BN2Int(balBefore.plus(accBal).plus(claimed)), _.BN2Int(balAfter))
        //  let spDaoBalA = _.getBN(await poolWBNBM.balanceOf(bond.address))
        //  console.log(_.BN2Int(spDaoBal));
        //  console.log(_.BN2Int(spDaoBalA));
    })
    
}
async function withdrawBNB(acc) {
    it("It should unlock", async () => {
        let balBefore = _.getBN(await poolWBNBM.balanceOf(acc))
        // let balBeforeD = _.getBN(await poolWBNB.balanceOf(daoVault.address))
        //console.log(_.BN2Str(balBeforeD));
        await Daov1.withdraw(poolWBNBM.address, {from:acc});
        let balAfter = _.getBN(await poolWBNBM.balanceOf(acc))
        assert.isAbove(_.BN2Int(balAfter), _.BN2Int(balBefore))
    })
}

//helpers
function ShowBNBMPool() {
    it("Show Old POOls", async () => {
    let tknA = _.BN2Str(await poolWBNBM.tokenAmount());
    let baseA = _.BN2Str(await poolWBNBM.baseAmount());
    let lptoken = _.BN2Str(await poolWBNBM.totalSupply());
    console.log('================= old POOL DEPTH ==================')
    console.log(`SPARTA - ${baseA/_.one}`);
    console.log(`BNB - ${tknA/_.one}`);
    console.log(`lps - ${lptoken/_.one}`);
})
}
function ShowBNBPool() {
    it("Show NEW POOL", async () => {
    let tknA = _.BN2Str(await poolWBNB.tokenAmount());
    let baseA = _.BN2Str(await poolWBNB.baseAmount());
    let lptoken = _.BN2Str(await poolWBNB.totalSupply());
    console.log('================= new POOL DEPTH ==================')
    console.log(`SPARTA - ${baseA/_.one}`);
    console.log(`BNB - ${tknA/_.one}`);
    console.log(`lps - ${lptoken/_.one}`);
})
}






