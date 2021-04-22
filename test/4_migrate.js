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
var RESERVE = artifacts.require("./Reserve.sol");
var ROUTERV1 = artifacts.require("./RouterM.sol");
var POOL = artifacts.require("./Pool.sol");
var POOLv1 = artifacts.require("./PoolM.sol");
var UTILS = artifacts.require("./Utils.sol");
var UTILSV1 = artifacts.require("./UtilsM.sol");

var SYNTH = artifacts.require("./synth.sol");
var BOND = artifacts.require("./Bond.sol");
var BONDVault = artifacts.require("./BondVault.sol");
var BONDv2 = artifacts.require("./BondV2M.sol");
var BONDv3 = artifacts.require("./BondV3M.sol");
var TOKEN = artifacts.require("./Token1.sol");
var TOKEN2 = artifacts.require("./Token2.sol");
var POOLFACTORY = artifacts.require("./poolFactory.sol");
var SYNTHFACTORY = artifacts.require("./synthFactory.sol");
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
contract('Test GLOBAL MIGRATION', function (accounts) {
    constructor(accounts)
     wrapBNB()

     //=========== SPV1 ===========//
     createPoolWBNBMain() 
     createPoolTKN1Main()
     addLiquidityMain(acc1, _.BN2Str(_.one * 100), _.BN2Str(_.one * 10)) 
     addLiquidityTKN1Main(acc0,  _.BN2Str(50*_.one),  _.BN2Str(20*_.one))
     curatePoolsMain();
     buyTOKENMain(acc0, _.BN2Str(_.one * 1))
     sellTOKENMain(acc0, _.BN2Str(_.one))
     removeLiquidityBNBMain(1000, acc0)
     checkLockSupply()
     burnBondv2()
     burnBondv3()
     deployerListBNB()
     depositBNB(acc2)
     depositINTOBOND(acc1)
     //claimLPAndLock(acc2, 3000)  //SPV2

     //=========== SPV2 ===========//

      createPoolWBNB() // SPV2
      createPoolTKN1() // SPV2
      addLiquidityBNB(acc0,_.BN2Str(10*_.one),  _.BN2Str(1*_.one)); //SPV2
      addLiquidityBNB(acc1,_.BN2Str(90*_.one),  _.BN2Str(9*_.one)); //SPV2
      addLiquidityTKN1(acc0,_.BN2Str(10*_.one),  _.BN2Str(1*_.one)); //SPV2
      addLiquidityTKN1(acc0,_.BN2Str(40*_.one),  _.BN2Str(10*_.one)); //SPV2
      curatePools() // SPV2
      deployerListBNBSPV2()
    //   buyTOKEN(acc0, _.BN2Str(_.one * 1)) //SPV2
    //   sellTOKEN(acc0, _.BN2Str(_.one))
    //   swapBASE(acc0, _.BN2Str(_.one))
    //   swapTOKEN(acc0, _.BN2Str(_.one * 1))
      removeLiquidityBNB(5000, acc0) //SPV2
      zapLiquidity(acc1)
      //revenue() // SPV2
    //  ShowBNBMPool()
    //  ShowBNBPool()


      //=========== SPV2 MIGRATION ===========//
      swapInDao()
      deployerChangeSecondsPerYear(1)
      moveliquidity(acc0) //SP2UP
      moveliquidity(acc1) //SP2UP
      moveBONDv3(acc1)
      upgradeBondUsers(acc1) //SP2UP
 
      
      
       lockTKN(acc0, _.BN2Str(_.one * 1)) // SPV2
       withdraw(acc0) // SPV2
    //  createSyntheticBNB() // SPV2
       bondv4Seconds(1)
       bondv4Claim(acc1, 2000)
   
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
        await Daov1.setGenesisAddresses(routerv1.address, utilsv1.address);

        await base.listAsset(bondv3.address, _.BN2Str(allocation* _.one),_.BN2Str(18*_.one) ) // list bond
        await base.listAsset(bondv2.address, _.BN2Str(5000000* _.one),_.BN2Str(1*_.one) ) // list bond
  

        //SPARTANPROTOCOLv2
        Dao = await DAO.new(base.address)     // deploy daoV2
        utils = await UTILS.new(base.address, routerv1.address, Dao.address) // deploy utilsV2
        router = await ROUTER.new(base.address, wbnb.address, Dao.address) //deploy router
        daoVault = await DAOVAULT.new(base.address, Dao.address);
        bondVault = await BONDVault.new(base.address, Dao.address)  //deploy new bond
        bond = await BOND.new(base.address, wbnb.address, Dao.address, bondVault.address);
        SPReserve = await RESERVE.new(base.address) // deploy base 
       
        poolFactory = await POOLFACTORY.new(base.address,  wbnb.address, Dao.address) 
        synthFactory = await SYNTHFACTORY.new(base.address,  wbnb.address, Dao.address) 
        upgrade = await UPGR.new(base.address, routerv1.address, bondv3.address, Dao.address) // deploy wBNB
        await Dao.setGenesisAddresses(router.address, utils.address, utils.address, bond.address, daoVault.address,poolFactory.address, synthFactory.address, SPReserve.address);
        // Dao2 = await DAO.new(base.address)     // deploy daoV3

        await SPReserve.setIncentiveAddresses(router.address, utils.address,utils.address);
        await SPReserve.start();
    
       
       // await base.changeDAO(Dao.address)  
       let supply = await token1.totalSupply()
        await base.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(routerv1.address, _.getBN(_.BN2Str(100000 * _.one)))
        await base.approve(routerv1.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await base.approve(routerv1.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await base.approve(routerv1.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await base.transfer(SPReserve.address, _.getBN(_.BN2Str(100000 * _.one)))
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await token1.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.approve(routerv1.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token1.approve(routerv1.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token1.approve(routerv1.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await wbnb.approve(bondv3.address, supply, {from:acc1}) // approve bond 
        await token1.approve(bondv3.address, supply, {from:acc1}) // approve bond 

       
        await wbnb.approve(bondv2.address, supply, {from:acc1}) // approve bond 
        await token1.approve(bondv2.address, supply, {from:acc1}) // approve bond 
      

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
async function createPoolTKN1(SPT, token) {
    it("It should deploy TKN1 Pool", async () => {
        var _pool = await poolFactory.createPool.call(token1.address)
        await poolFactory.createPool(token1.address)
        poolTKN1 = await POOL.at(_pool)
        //console.log(`Pools: ${poolTKN1.address}`)
        const baseAddr = await poolTKN1.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        let supply = await base.totalSupply()
        await base.approve(poolTKN1.address, supply, { from: acc0 })
        await base.approve(poolTKN1.address, supply, { from: acc1 })


    })
}
async function addLiquidityBNB(acc, b, t) {
    it(`It should addLiquidity BNB from ${acc}`, async () => {
        let token = wbnb.address
        let tx = await router.addLiquidity(b, t, token, { from: acc})
    })
}
async function addLiquidityTKN1(acc, b, t) {
    it(`It should addLiquidity TKN2 from ${acc}`, async () => {
        let token = token1.address
        let tx = await router.addLiquidity(b, t, token, { from: acc})
    })
}
async function curatePools() {
    it("Curate POOls", async () => {
        await poolFactory.addCuratedPool(wbnb.address);
        await poolFactory.addCuratedPool(token1.address);

       
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
        
        let tx = await router.swap(x, base.address, token)
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

        let tx = await router.swap(x, token, base.address)
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
        // assert.equal(_.BN2Str(await wbnb.balanceOf(acc)), _.BN2Str(tokenStart.plus(t)), 'wbnb balance')
        assert.isAtLeast(_.BN2Int(await web3.eth.getBalance(acc)), _.BN2Int(bnbStart.plus(t).minus(3*10**15)), 'bnb balance')
    })
}
async function zapLiquidity(acc) {
    it("zap liquidity", async () => {
        let SPT2BNB = _.BN2Str(await poolWBNB.balanceOf(acc))
        let SPT2TKN = _.BN2Str(await poolTKN1.balanceOf(acc))
        // let baseP = _.BN2Str(await base.balanceOf(poolWBNB.address))
        // let wbnb = _.BN2Str(await wbnb.balanceOf(poolWBNB.address))
        // let TOKEN = _.BN2Str(await token1.balanceOf(poolTKN1.address))
        // let base = _.BN2Str(await base.balanceOf(poolTKN1.address))
        // console.log("SPT2BNB bal",SPT2BNB/_.one )
        // console.log("SPT2BTC bal",SPT2TKN/_.one )
        let fromTOKEN = wbnb.address
        let toTOKEN = token1.address
        // console.log("BASE BALANCE wbnbP",baseP/_.one )
        // console.log("WBNB BALANCE wbnbP", wbnb/_.one)
        // console.log("BASE BALANCE tokenP", base/_.one)
        // console.log("TOKEN BALANCE tokenP", TOKEN/_.one)
        let tx = await router.zapLiquidity(SPT2BNB, fromTOKEN, toTOKEN, {from:acc})
        // let basePA = _.BN2Str(await base.balanceOf(poolWBNB.address))
        // let wbnbA = _.BN2Str(await wbnb.balanceOf(poolWBNB.address))
        // let TOKENA = _.BN2Str(await token1.balanceOf(poolTKN1.address))
        // let baseA = _.BN2Str(await base.balanceOf(poolTKN1.address))
        // let SPT2BNBa = _.BN2Str(await poolWBNB.balanceOf(acc))
        // let SPT2TKNa = _.BN2Str(await poolTKN1.balanceOf(acc))
        // console.log("SPT2BNB bal",SPT2BNBa/_.one )
        // console.log("SPT2BTC bal",SPT2TKNa/_.one )
        // console.log("Fee in Sparta", fee/_.one)
        // console.log("BASE BALANCE wbnb A",basePA/_.one )
        // console.log("WBNB BALANCE A", wbnbA/_.one)
        // console.log("BASE BALANCE A", baseA/_.one)
        // console.log("TOKEN BALANCE A", TOKENA/_.one)
       
    })
}

//upgrade
async function swapInDao() {
    it("swap Dao", async () => {
        // console.log("giv me",token1.address);
       await base.changeDAO(Dao.address)  
      
    })
}
async function moveliquidity(acc) {
    it("Upgrade Liquidity", async () => {
       
        let tB = _.BN2Str(await poolWBNBM.balanceOf(acc))
        // console.log("bnbLP balance",tB/_.one)
        let tkn1 = _.BN2Str(await poolTKN1M.balanceOf(acc))
        // console.log("give balance",tkn1/_.one)
        await upgrade.migrateLiquidity({from: acc})
        let tBA = _.BN2Str(await poolWBNB.balanceOf(acc))
        // console.log("bnbLP balance After",tBA/_.one)
        let tkn1A = _.BN2Str(await poolTKN1.balanceOf(acc))
        // console.log("givlp balance After",tkn1A/_.one)
        
    })
}
async function moveBONDv3(acc) {
    it("Upgrade BOND", async () => {
  
        let mDB = await bondv3.getMemberDetails(acc, token1.address);
        let BLPB = _.BN2Str(mDB.bondedLP)
        // console.log("lockedbondv3tkn1",BLPB/_.one);
  
        let mDB1b = await bondv3.getMemberDetails(acc, _.BNB);
        let BLPB3 = _.BN2Str(mDB1b.bondedLP)
        // console.log("lockedbondv3bnb",BLPB3/_.one);
        await upgrade.upgradeBONDv3({from: acc})
        let mDA = await bondv3.getMemberDetails(acc, token1.address);
        let BLPA = _.BN2Str(mDA.bondedLP)
        //  console.log("lockedToken1V3",BLPA/_.one);
         let mDB1ba = await bondv3.getMemberDetails(acc, _.BNB);
        let BLPB3a = _.BN2Str(mDB1ba.bondedLP)
        //  console.log("lockedbondv3bnb",BLPB3a/_.one);
         let mDB1bad = await bondVault.getMemberDetails(acc, _.BNB);
        let BLPB3ad = _.BN2Str(mDB1bad.bondedLP)
        //  console.log("lockedbondv4bnb",BLPB3ad/_.one);
         let mDB1badt = await bondVault.getMemberDetails(acc, token1.address);
        let BLPB3adt = _.BN2Str(mDB1badt.bondedLP)
        //  console.log("lockedbondv4TKN1",BLPB3adt/_.one);
        
        
    })
}
async function upgradeBondUsers(acc) {
    it("Upgrade Bondv2 Users", async () => {
        let token = wbnb.address;
        let asset = _.BNB
        let tB = _.BN2Str(await poolWBNBM.balanceOf(acc))
        // console.log(tB/_.one)
        let mDB1b = await bondv2.getMemberDetails(acc, _.BNB);
        let BLPB3 = _.BN2Str(mDB1b.bondedLP)
        // console.log("lockedbondv2bnb",BLPB3/_.one);
        await bondv2.claim(asset,{from:acc})
        let mDB1b4 = await bondv2.getMemberDetails(acc, _.BNB);
        let BLPB33 = _.BN2Str(mDB1b4.bondedLP)
        // console.log("lockedbondv2bnb",BLPB33/_.one);
        let tBd = _.BN2Str(await poolWBNBM.balanceOf(acc))
        // console.log(tBd/_.one)
        await upgrade.upgradeBond(token, {from: acc} )
        let tBA = _.BN2Str(await poolWBNB.balanceOf(acc))
        //  console.log(tBA/_.one)
         let mDB1bad = await bondVault.getMemberDetails(acc, asset);
        let BLPB3ad = _.BN2Str(mDB1bad.bondedLP)
        //  console.log("lockedbondv4bnb",BLPB3ad/_.one);
    })
}
async function deployerListBNBSPV2(){
    it('deployer list asset', async () =>{
        let deployer = acc0;
        let asset = _.BNB;
        await bond.listBondAsset(asset, {from:deployer});
        await bond.listBondAsset(token1.address, {from:deployer});

    })
}
async function bondv4Seconds(seconds) {
    it("Enable Bond", async () => {
        await bond.changeBondingPeriod(seconds, {from:acc0});
        let secondsPerYearA = _.BN2Str(await bond.bondingPeriodSeconds());
        assert.equal(secondsPerYearA, seconds, 'deployer change bond period in seconds')
    })
}
async function bondv4Claim(acc, ms) {
    it("Claim all bondv4", async () => {
        let asset = _.BNB
        await sleep(ms)
        let mDb = await bondVault.getMemberDetails(acc, asset);
        let BLPb = _.BN2Str(mDb.bondedLP)
        // console.log("acc locked bnb",BLPb/_.one);
        let mDA11 = await bondVault.getMemberDetails(acc, token1.address);
        let BLPA11 = _.BN2Str(mDA11.bondedLP)
        // console.log("acc locked tkn1",BLPA11/_.one);

        let spBONDBal = _.BN2Str(await poolWBNB.balanceOf(acc))
        // console.log("acc bnb",spBONDBal/_.one);
        let spBONDBal1 = _.BN2Str(await poolTKN1.balanceOf(acc))
        // console.log("acc tkn1",spBONDBal1/_.one);

        
        await bond.claimAllForMember(acc,{from:acc})
        let mDA = await bondVault.getMemberDetails(acc, asset);
         let BLPA = _.BN2Str(mDA.bondedLP)
        //  console.log("acc locked bnb",BLPA/_.one);
         let mDA1 = await bondVault.getMemberDetails(acc, token1.address);
         let BLPA1 = _.BN2Str(mDA1.bondedLP)
        //  console.log("acc locked tkn1",BLPA1/_.one);
        
         let b = _.BN2Str(await poolWBNB.balanceOf(acc))
        // console.log("acc lp bnb",b/_.one);
        let b1 = _.BN2Str(await poolTKN1.balanceOf(acc))
        // console.log("acc lp tkn1",b1/_.one);

    })
}
async function revenue() {
    it("Revenue", async () => {
        let feeRev = _.BN2Str(await router.map30DPoolRevenue(poolWBNB.address))
        let feeRev30 = _.BN2Str(await router.mapPast30DPoolRevenue(poolWBNB.address))
        let feeRev2 = _.BN2Str(await poolWBNB.map30DPoolRevenue())
        let feeRev302 = _.BN2Str(await poolWBNB.mapPast30DPoolRevenue())
        let feeRev30Array = _.BN2Str(await poolWBNB.revenueArray(0))
        let feeRev30Array1 = _.BN2Str(await poolWBNB.revenueArray(1))
        console.log("Div30",feeRev/_.one)
        console.log("Div30P",feeRev30/_.one)
        console.log("TotFee30Current",feeRev2/_.one)
        console.log("TotFee30Past",feeRev302/_.one)
        console.log("RevFee30Past",feeRev30Array/_.one)
        console.log("RevFee30S",feeRev30Array1/_.one)
    })
}
async function lockTKN(acc, amount) {
    it("It should deposit", async () => {
        let balance = await poolWBNB.balanceOf(acc)
        // console.log(`balance: ${balance}`)
        // await poolTKN1.approve(Dao.address, balance, { from: acc })
        await Dao.deposit(poolWBNB.address, balance, { from: acc })
        let balancee = await poolWBNB.balanceOf(acc)
        // console.log(`balanceA: ${balancee}`)
        // console.log(`isMember: ${await Dao.isMember(acc)}`)
        // console.log(`mapMemberPool_balance: ${await daoVault.mapMemberPool_balance(acc, poolWBNB.address)}`)
        // console.log(`totalWeight: ${await daoVault.totalWeight()}`)
        // console.log(`mapMember_weight: ${await daoVault.mapMember_weight(acc)}`)
        // console.log(`rate: ${_.getBN(await daoVault.mapMember_weight(acc)).div(_.getBN(await daoVault.totalWeight()))}`)
    })
}
async function withdraw(acc) {
    it("Withdraw from DAO", async () => {
        let bal = _.getBN(await daoVault.mapMemberPool_balance(acc, poolWBNB.address));
        let amount = bal.times(50).div(100);
        await Dao.withdraw(poolWBNB.address,{from:acc})
        // console.log(`mapMemberPool_balance: ${await daoVault.mapMemberPool_balance(acc, poolWBNB.address)}`)
        let balancee = await poolWBNB.balanceOf(acc)
        // console.log(`balanceAA: ${balancee}`)
        // console.log(`totalWeight: ${await daoVault.totalWeight()}`)
        // console.log(`mapMember_weight: ${await daoVault.mapMember_weight(acc)}`)
        // console.log(`rate: ${_.getBN(await daoVault.mapMember_weight(acc)).div(_.getBN(await daoVault.totalWeight()))}`)
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
        let _fee = math.calcSwapFee(x, X, Y)
        let fee =  _.floorBN((_fee.times(X)).div(Y));
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




//MainNet Replica
async function createPoolWBNBMain() {
    it("It should deploy BNB Pool", async () => {
        var _pool = await routerv1.createPool.call(_.BN2Str(_.one * 0), _.BN2Str(_.one * 0), wbnb.address)
        await routerv1.createPool(_.BN2Str(_.one * 0),_.BN2Str(_.one * 0), wbnb.address)
        poolWBNBM = await POOLv1.at(_pool)
        //console.log(`Pools: ${poolWBNB.address}`)
        const baseAddr = await poolWBNBM.BASE()
        assert.equal(baseAddr, base.address, "address is correct")

        let supply = await base.totalSupply()
        await base.approve(poolWBNBM.address, supply, { from: acc0 })
        await base.approve(poolWBNBM.address, supply, { from: acc1 })
    })
}
async function createPoolTKN1Main(SPT, token) {
    it("It should deploy TKN1 Pool", async () => {
        var _pool = await routerv1.createPool.call(_.BN2Str(_.one * 0), _.BN2Str(_.one * 0), token1.address)
        await routerv1.createPool(_.BN2Str(_.one * 0),_.BN2Str(_.one * 0), token1.address)
        poolTKN1M = await POOLv1.at(_pool)
        const baseAddr = await poolTKN1M.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
      
        let supply = await base.totalSupply()
        await base.approve(poolTKN1M.address, supply, { from: acc0 })
        await base.approve(poolTKN1M.address, supply, { from: acc1 })
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
async function addLiquidityTKN1Main(acc, b, t) {
    it(`It should addLiquidity TKN2 from ${acc}`, async () => {
        let token = token1.address
        let tx = await routerv1.addLiquidity(b, t, token, { from: acc})
    })
}
async function curatePoolsMain() {
    it("Curate POOls", async () => {
        await routerv1.addCuratedPoolM(wbnb.address);
        await routerv1.addCuratedPoolM(token1.address);
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
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputBase), _.BN2Str(_.floorBN(b)), 'outputBase')
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputToken), _.BN2Str(_.floorBN(t)), 'outputToken')
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

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
        await bondv3.listBondAsset(token1.address, {from:deployer});


    })
}
async function deployerChangeSecondsPerYear(seconds){
    it(`Enable BOND`, async () => {
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
async function depositINTOBOND(acc){
    it(`It should deposit and bond into dao `, async () => {
        // let asset = token1.address
         let amount = _.BN2Str(_.one)
        // let poolData = await utilsv1.getPoolData(asset);
        // let spartaAllocation = await utilsv1.calcTokenPPinBase(asset,amount)
        // var B = _.getBN(poolData.baseAmount)
        // var T = _.getBN(poolData.tokenAmount)
        // poolUnits = _.getBN((await poolWBNBM.totalSupply()))
        // let units = _.getBN(await utilsv1.calcLiquidityUnits(spartaAllocation, B, amount, T, poolUnits))
        // DEPOTime = _.getBN((new Date())/1000)
        await bondv3.deposit(token1.address, amount,{from:acc})
        await bondv3.deposit(_.BNB, amount,{from:acc, value:amount})
        await bondv2.deposit(_.BNB, amount,{from:acc, value:amount})
    //    let memberDetails = await bondv3.getMemberDetails(acc, asset);
    //    assert.equal(_.BN2Str(memberDetails.bondedLP), _.BN2Str(units), 'bonded LP')
       
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
        console.log("accbondv2",mbB);
         await bondv2.claim(asset,{from:acc})
        // //let accBal = _.getBN(await poolWBNBM.balanceOf(acc))
      
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






