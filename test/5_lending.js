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

var SYNTH = artifacts.require("./synth.sol");
var LEND = artifacts.require("./SpartanLend.sol");
var LENDROUTER = artifacts.require("./lendRouter.sol");
var RESERVE = artifacts.require("./Reserve.sol");
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
contract('Test Lending', function (accounts) {
    constructor(accounts)
     wrapBNB()
     createPoolWBNB()
     createPoolTKN1()
     addLiquidityBNB(acc0,_.BN2Str(1000*_.one),  _.BN2Str(50*_.one)); //SPV2
     addLiquidityBNB(acc1,_.BN2Str(1500*_.one),  _.BN2Str(70*_.one)); //SPV2
     addLiquidityTKN1(acc0,_.BN2Str(1500*_.one),  _.BN2Str(60*_.one)); //SPV2
     addLiquidityTKN1(acc1,_.BN2Str(1500*_.one),  _.BN2Str(60*_.one)); //SPV2
     curatePools()
     createSyntheticBNB()
     swapLayer1ToSynth(acc0,_.BN2Str(500*_.one))
    //  swapSynthToLayer1(acc1)
     BorrowTKNwithBASE(acc0,_.BN2Str(100*_.one))
      BorrowTKNwithSPT2BNB(acc0,_.BN2Str(100*_.one))
       BorrowTKNwithASYNTHBNB(acc0,_.BN2Str(10*_.one))

      swapBASEToBNB(acc1, _.BN2Str(10*_.one))// wbnb swaps
    // swapTKNtoBASE(acc1, _.BN2Str(10*_.one))// wbnb swaps
     addLiquidityTKN1(acc0,_.BN2Str(1100*_.one),  _.BN2Str(0*_.one)); //SPV2
      _checkliquidate(acc0);
      zapLiquidity(acc1)
       swapBASEToBNB(acc1, _.BN2Str(10*_.one))// wbnb swaps
      addLiquidityTKN1(acc0,_.BN2Str(1100*_.one),  _.BN2Str(0*_.one)); //SPV2
     _checkliquidate(acc0);
     //swapTKNtoBASE(acc1, _.BN2Str(10*_.one))// wbnb swaps
    // //  ShowTKNPool()
       payInterestForTKNBASE(acc0)
      // _checkliquidate(acc0);
       payInterestForTKNSPT(acc0)
       swapBASEtoTKN(acc1, _.BN2Str(10*_.one))// wbnb swaps
    //    _checkliquidate(acc0);
       payInterestForTKNSYNTH(acc0)
        addLiquidityTKN1(acc0,_.BN2Str(1100*_.one),  _.BN2Str(0*_.one)); //SPV2
      _checkliquidate(acc0);
       swapTKNtoBASE(acc1, _.BN2Str(10*_.one))// wbnb swaps
    //    _checkliquidate(acc0);
   
    //    _checkliquidate(acc0);

      RepayTKNgetBase(acc0, "25517773151982793")
      RepayTKNgetSPT2BNB(acc0, "796480116002472")
      RepayTKNgetSynthBNB(acc0, "3730536262086436")

     
    //  ShowTKNPool()
})

//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("Constructor events", async () => {
        base = await BASE.new() // deploy base
        wbnb = await WBNB.new() // deploy wBNB
        token1 = await TOKEN.new()             //deploy token
        Dao = await DAO.new(base.address)     // deploy daoV2
        utils = await UTILS.new(base.address, base.address, Dao.address) // deploy utilsV2
        router = await ROUTER.new(base.address, wbnb.address, Dao.address) //deploy router
        daoVault = await DAOVAULT.new(base.address, Dao.address);
        bondVault = await BONDVault.new(base.address, Dao.address)  //deploy new bond
        bond = await BOND.new(base.address, wbnb.address, Dao.address, bondVault.address);
        poolFactory = await POOLFACTORY.new(base.address,  wbnb.address, Dao.address) 
        synthFactory = await SYNTHFACTORY.new(base.address,  wbnb.address, Dao.address) 
        daoVault = await DAOVAULT.new(base.address, Dao.address);
        lendRouter = await LENDROUTER.new(base.address);
        lend = await LEND.new(base.address, lendRouter.address);
        SPReserve = await RESERVE.new(base.address) // deploy base 
        await Dao.setGenesisAddresses(router.address, utils.address, lend.address, bond.address, daoVault.address,poolFactory.address, synthFactory.address, SPReserve.address); 
        await base.changeDAO(Dao.address)  
        await SPReserve.setIncentiveAddresses(router.address, lend.address,utils.address);
        await SPReserve.start();

        await base.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
       
         await base.transfer(SPReserve.address, _.getBN(_.BN2Str(100000 * _.one)))
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
        await web3.eth.sendTransaction({to: wbnb.address, value:_.BN2Str(_.one*100), from:acc1});
        await web3.eth.sendTransaction({to: wbnb.address, value:_.BN2Str(_.one*100), from:acc2});
        await wbnb.transfer(acc0, _.getBN(_.BN2Int(_.one * 100)), {from:acc0})
        await wbnb.transfer(acc1, _.getBN(_.BN2Int(_.one * 100)), {from:acc1})
        await wbnb.transfer(acc2, _.getBN(_.BN2Int(_.one * 100)), {from:acc2})
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
        let synth = await synthFactory.getSynth(wbnb.address);
        let result = await synthFactory.isSynth(synth);
        assert.equal(result, true);
        await synthBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await synthBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await synthBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
    })
}
async function swapSynthToLayer1(acc, ) {
    it("Swap Synthetic BNB To BASE", async () => {
        let x = _.getBN(await synthBNB.balanceOf(acc))
        let input = x.div(2);
        // console.log(_.BN2Str(input));
        let synthIN = synthBNB.address;
        let token = await synthBNB.LayerONE();
        let tsP = _.getBN(await poolWBNB.totalSupply());
        let tsS = _.getBN(await synthBNB.totalSupply());
        // console.log(_.BN2Str(tsS));
        let baseBal = _.getBN(await base.balanceOf(acc))
        let sythPoolBal = _.getBN(await poolWBNB.balanceOf(synthBNB.address))
        // console.log(_.BN2Str(sythPoolBal))
        let lpClaim = _.BN2Str((input.times(sythPoolBal)).div(tsS))
        let poolData = await utils.getPoolData(token);
        var X = _.getBN(poolData.baseAmount)
        var Y = _.getBN(poolData.tokenAmount)
        let baseSwapAmount = math.calcSwapOutput(input, Y, X);

        await router.swapSynthToBase(input,synthIN,{from:acc});
        poolData = await utils.getPoolData(token);
        // var B = _.getBN(poolData.baseAmount)
        // var T = _.getBN(poolData.tokenAmount)
        let sythPoolBalA = _.getBN(await poolWBNB.balanceOf(synthBNB.address))
        let tsPA = _.getBN(await poolWBNB.totalSupply());
        let tsSA = _.getBN(await synthBNB.totalSupply());
        assert.equal(_.BN2Str((sythPoolBalA)), _.BN2Str(sythPoolBal.minus(lpClaim)), 'poolUnits')
        assert.equal(_.BN2Str((tsPA)), _.BN2Str(tsP.minus(lpClaim)), 'poolUnits burnt')
        assert.equal(_.BN2Str((tsSA)), _.BN2Str(tsS.minus(input)), 'synthunits burnt')

        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(Y))
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(X.minus(baseSwapAmount)))
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(Y), 'wbnb balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(X.minus(baseSwapAmount)), 'base balance')
        assert.equal(_.BN2Str(await base.balanceOf(acc)), _.BN2Str(baseBal.plus(baseSwapAmount)))
        assert.equal(_.BN2Str(await synthBNB.balanceOf(acc)), _.BN2Str(x.minus(input)))
        


    })
}
async function swapLayer1ToSynth(acc, x) {
    it("Swap SPARTA to SP-sBNB ", async () => {
        let synthOUT = synthBNB.address;
        let synthStart = _.BN2Str(await synthBNB.balanceOf(acc));
        let token = await synthBNB.LayerONE();
        let poolDataWBNB = await utils.getPoolData(token);
        const X = _.getBN(poolDataWBNB.baseAmount)
        const Y = _.getBN(poolDataWBNB.tokenAmount)
        let tS = _.getBN(await poolWBNB.totalSupply())

        let lpsAsym = math.calcLiquidityUnitsAsym(x, X, tS)
       
        await router.swapBaseToSynth(x,synthOUT,{from:acc});
        let lpBal = _.getBN(await poolWBNB.balanceOf(synthBNB.address))
        let synthBal = _.getBN(await synthBNB.balanceOf(acc))
        poolDataWBNB = await utils.getPoolData(token);
        const Xx = _.getBN(poolDataWBNB.baseAmount)
        const Yy = _.getBN(poolDataWBNB.tokenAmount)
        let tSA = _.getBN(await poolWBNB.totalSupply())
        
        let baseAmount = math.calcShare(lpsAsym, tSA, Xx);
        let tokenAmount = math.calcShare(lpsAsym, tSA, Yy);
        let baseSwapAmount = math.calcSwapOutput(baseAmount, Xx, Yy);
        let synthsAmount = tokenAmount.plus(baseSwapAmount)

        assert.equal(_.BN2Str(poolDataWBNB.tokenAmount), _.BN2Str(Y))
        assert.equal(_.BN2Str(poolDataWBNB.baseAmount), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(Y), 'wbnb balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(X.plus(x)), 'base balance')
        assert.equal(_.BN2Str(tSA), _.BN2Str(tS.plus(lpsAsym)),'lp units');
        assert.equal(_.BN2Str(lpBal), _.BN2Str(lpsAsym),'lp units');
        assert.equal(_.BN2Str(synthBal), _.BN2Str(_.floorBN(synthsAmount)))
        let synthTs = _.getBN(await synthBNB.totalSupply())
        assert.equal(_.BN2Str(synthTs), _.BN2Str(_.floorBN(synthsAmount)))
        

    })
}
async function BorrowTKNwithBASE(acc, x) {
    it("Borrow USDs with SPARTA", async () => {
        let input = _.getBN(x);
        let assetC = base.address;
        let assetD = token1.address;
        let baseBal = _.getBN(await base.balanceOf(acc))
        let tokenBal = _.getBN(await token1.balanceOf(acc))
        let reserve = _.getBN(await base.balanceOf(SPReserve.address))
        let colRat = input.times(6666).div(10000)

        let poolDataTKN1 = await utils.getPoolData(assetD);
        const B = _.getBN(poolDataTKN1.baseAmount)
        const Z = _.getBN(poolDataTKN1.tokenAmount)
        let z = math.calcSwapOutput(colRat, B, Z)
        // let memberDeets =await lend.getMemberDetails( acc, assetC, assetD)
        // let mAC = _.getBN(memberDeets.assetCollateral);
        // let mAD = _.getBN(memberDeets.assetDebt);
        // let mAB = memberDeets.timeBorrowed;
        // console.log(_.BN2Str(mAC),_.BN2Str(mAD), _.BN2Str(mAB) );

        await lend.borrow(input, assetC, assetD, {from:acc})
        let memberDeetsA =await lend.getMemberDetails( acc, assetC, assetD)
        let mACA = memberDeetsA.assetCurrentCollateral;
        let mADA = memberDeetsA.assetDebt;
        // let mABA = memberDeetsA.timeBorrowed;
        //  console.log(_.BN2Str(mACA),_.BN2Str(mADA) );

        poolDataTKN1 = await utils.getPoolData(assetD);
        let baseBalA = _.getBN(await base.balanceOf(acc))
        let tokenBalA = _.getBN(await token1.balanceOf(acc))
        let reserveA = _.getBN(await base.balanceOf(SPReserve.address))

        assert.equal(_.BN2Str(poolDataTKN1.baseAmount), _.BN2Str(B.plus(colRat)))
        assert.equal(_.BN2Str(poolDataTKN1.tokenAmount), _.BN2Str(Z.minus(z)))
        assert.equal(_.BN2Str(await token1.balanceOf(poolTKN1.address)), _.BN2Str(Z.minus(z)), 'token balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN1.address)), _.BN2Str(B.plus(colRat)), 'base balance')
        assert.equal(_.BN2Str(baseBalA), _.BN2Str(baseBal.minus(input)))
        assert.equal(_.BN2Str(tokenBalA), _.BN2Str(tokenBal.plus(z)))
        assert.equal(_.BN2Str(reserveA), _.BN2Str(reserve.minus(colRat)))
        // assert.equal(_.BN2Str(mACA), _.BN2Str(mAC.plus(input)))
        // assert.equal(_.BN2Str(mADA), _.BN2Str(mAD.plus(z)))

    })
}
async function BorrowTKNwithSPT2BNB(acc, x) {
    it("Borrow USDs with SP-pBNB", async () => {
        let input = _.getBN(x);
        let assetC = poolWBNB.address;
        let assetD = token1.address;
        let baseBal = _.getBN(await poolWBNB.balanceOf(acc))
        let tokenBal = _.getBN(await token1.balanceOf(acc))
        let reserve = _.getBN(await base.balanceOf(SPReserve.address))
        
        let colRatt = input.times(6666).div(10000)
        let colRat = _.getBN(await utils.calcAsymmetricValueBase(poolWBNB.address, colRatt))
        let lpsBal = _.getBN(await poolWBNB.balanceOf(lend.address))

        let poolDataTKN1 = await utils.getPoolData(assetD);
        const B = _.getBN(poolDataTKN1.baseAmount)
        const Z = _.getBN(poolDataTKN1.tokenAmount)
        let z = math.calcSwapOutput(colRat, B, Z)
        // let memberDeets =await lend.getMemberDetails( acc, assetC, assetD)
        // let mAC = _.getBN(memberDeets.assetCollateral);
        // let mAD = _.getBN(memberDeets.assetDebt);
        // let mAB = memberDeets.timeBorrowed;
        // console.log(_.BN2Str(mAC),_.BN2Str(mAD), _.BN2Str(mAB) );

        await lend.borrow(input, assetC, assetD, {from:acc})
        let memberDeetsA =await lend.getMemberDetails( acc, assetC, assetD)
        let mACA = memberDeetsA.assetCurrentCollateral;
        let mADA = memberDeetsA.assetDebt;
        // let mABA = memberDeetsA.timeBorrowed;
        // console.log(_.BN2Str(mAC),_.BN2Str(mAD), _.BN2Str(mAB) );

        poolDataTKN1 = await utils.getPoolData(assetD);
        let baseBalA = _.getBN(await poolWBNB.balanceOf(acc))
        let tokenBalA = _.getBN(await token1.balanceOf(acc))
        let reserveA = _.getBN(await base.balanceOf(SPReserve.address))
        let lpsBalA = _.getBN(await poolWBNB.balanceOf(lend.address))

        assert.equal(_.BN2Str(poolDataTKN1.baseAmount), _.BN2Str(B.plus(colRat)))
        assert.equal(_.BN2Str(poolDataTKN1.tokenAmount), _.BN2Str(Z.minus(z)))
        assert.equal(_.BN2Str(await token1.balanceOf(poolTKN1.address)), _.BN2Str(Z.minus(z)), 'token balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN1.address)), _.BN2Str(B.plus(colRat)), 'base balance')
        assert.equal(_.BN2Str(baseBalA), _.BN2Str(baseBal.minus(input)))
        assert.equal(_.BN2Str(tokenBalA), _.BN2Str(tokenBal.plus(z)))
        assert.equal(_.BN2Str(reserveA), _.BN2Str(reserve.minus(colRat)))
        // assert.equal(_.BN2Str(mACA), _.BN2Str(mAC.plus(input)))
        // assert.equal(_.BN2Str(mADA), _.BN2Str(mAD.plus(z)))
        assert.equal(_.BN2Str(lpsBalA), _.BN2Str(lpsBal.plus(input)))

    })
}
async function BorrowTKNwithASYNTHBNB(acc, x) {
    it("Borrow USDs with SP-sBNB", async () => {
        let input = _.getBN(x);
        let assetC = synthBNB.address;
        let assetD = token1.address;
        let baseBal = _.getBN(await synthBNB.balanceOf(acc))
        let tokenBal = _.getBN(await token1.balanceOf(acc))
        let reserve = _.getBN(await base.balanceOf(SPReserve.address))
        
        let colRatt = input.times(6666).div(10000)
        let colRat = _.getBN(await utils.calcSwapValueInBaseWithSYNTH(synthBNB.address, colRatt))
        let lpsBal = _.getBN(await synthBNB.balanceOf(lend.address))

        let poolDataTKN1 = await utils.getPoolData(assetD);
        const B = _.getBN(poolDataTKN1.baseAmount)
        const Z = _.getBN(poolDataTKN1.tokenAmount)
        let z = math.calcSwapOutput(colRat, B, Z)
        // let memberDeets =await lend.getMemberDetails( acc, assetC, assetD)
        // let mAC = _.getBN(memberDeets.assetCollateral);
        // let mAD = _.getBN(memberDeets.assetDebt);
        // let mAB = memberDeets.timeBorrowed;
        // console.log(_.BN2Str(mAC),_.BN2Str(mAD), _.BN2Str(mAB) );
      
        await lend.borrow(input, assetC, assetD, {from:acc})
        let memberDeetsA =await lend.getMemberDetails( acc, assetC, assetD)
        let mACA = memberDeetsA.assetCurrentCollateral;
        let mADA = memberDeetsA.assetDebt;
        // let mABA = memberDeetsA.timeBorrowed;
        // console.log(_.BN2Str(mAC),_.BN2Str(mAD), _.BN2Str(mAB) );

        poolDataTKN1 = await utils.getPoolData(assetD);
        let baseBalA = _.getBN(await synthBNB.balanceOf(acc))
        let tokenBalA = _.getBN(await token1.balanceOf(acc))
        let reserveA = _.getBN(await base.balanceOf(SPReserve.address))
        let lpsBalA = _.getBN(await synthBNB.balanceOf(lend.address))

        assert.equal(_.BN2Str(poolDataTKN1.baseAmount), _.BN2Str(B.plus(colRat)))
        assert.equal(_.BN2Str(poolDataTKN1.tokenAmount), _.BN2Str(Z.minus(z)))
        assert.equal(_.BN2Str(await token1.balanceOf(poolTKN1.address)), _.BN2Str(Z.minus(z)), 'token balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN1.address)), _.BN2Str(B.plus(colRat)), 'base balance')
        assert.equal(_.BN2Str(baseBalA), _.BN2Str(baseBal.minus(input)))
        assert.equal(_.BN2Str(tokenBalA), _.BN2Str(tokenBal.plus(z)))
        assert.equal(_.BN2Str(reserveA), _.BN2Str(reserve.minus(colRat)))
        // assert.equal(_.BN2Str(mACA), _.BN2Str(mAC.plus(input)))
        // assert.equal(_.BN2Str(mADA), _.BN2Str(mAD.plus(z)))
        assert.equal(_.BN2Str(lpsBalA), _.BN2Str(lpsBal.plus(input)))
    })
}

async function RepayTKNgetBase(acc, x) {
    it("Return USDs & get SPARTA collateral", async () => {
        let input = _.getBN(x);
        let assetC = base.address;
        let assetD = token1.address;
        let baseBal = _.getBN(await base.balanceOf(acc))
        let tokenBal = _.getBN(await token1.balanceOf(acc))
        let reserve = _.getBN(await base.balanceOf(SPReserve.address))

        let poolDataTKN1 = await utils.getPoolData(assetD);
        const B = _.getBN(poolDataTKN1.baseAmount)
        const Z = _.getBN(poolDataTKN1.tokenAmount)
        let z = math.calcSwapOutput(x, Z, B)
        let memberDeets =await lend.getMemberDetails(acc, assetC, assetD)
        let mAC = _.getBN(memberDeets.assetCurrentCollateral);
        let mAD = _.getBN(memberDeets.assetDebt);
        // let mAB = memberDeets.timeBorrowed;
        //   console.log(_.BN2Str(mAC)/_.one,_.BN2Str(mAD) );

        await sleep(3100)
        await token1.approve(lend.address, _.BN2Str(500000*_.one))
        await lend.payBack(x, assetC, assetD, {from:acc})
        let removedCollateral = _.getBN(input.times(mAC).div(mAD))


        poolDataTKN1 = await utils.getPoolData(assetD);
        let baseBalA = _.getBN(await base.balanceOf(acc))
        let tokenBalA = _.getBN(await token1.balanceOf(acc))
        let reserveA = _.getBN(await base.balanceOf(SPReserve.address))
        let memberDeetsA =await lend.getMemberDetails(acc, assetC, assetD)
        let mACA = memberDeetsA.assetCurrentCollateral;
        let mADA = memberDeetsA.assetDebt;
        //    console.log(_.BN2Str(mACA)/_.one,_.BN2Str(mADA)/_.one);
     
        assert.equal(_.BN2Str(poolDataTKN1.baseAmount), _.BN2Str(B.minus(z)))
        assert.equal(_.BN2Str(poolDataTKN1.tokenAmount), _.BN2Str(Z.plus(x)))
        assert.equal(_.BN2Str(await token1.balanceOf(poolTKN1.address)), _.BN2Str(Z.plus(x)), 'token balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN1.address)), _.BN2Str(B.minus(z)), 'base balance')
        assert.equal(_.BN2Str(baseBalA), _.BN2Str(_.floorBN(baseBal.plus(removedCollateral))))
        assert.equal(_.BN2Str(tokenBalA), _.BN2Str(tokenBal.minus(x)))
        // assert.equal(_.BN2Str(reserveA), _.BN2Str((reserve.plus(z).minus(removedCollateral))))
        // assert.equal(_.BN2Str(mACA), _.BN2Str(mAC.minus(removedCollateral)))
        assert.equal(_.BN2Str(mADA), _.BN2Str(mAD.minus(x)))
    
    })
}
async function RepayTKNgetSPT2BNB(acc, x) {
    it("Return USDs & receive BNB-SPP collateral", async () => {
        let input = _.getBN(x);
        let assetC = poolWBNB.address;
        let assetD = token1.address;
        let baseBal = _.getBN(await poolWBNB.balanceOf(acc))
        let tokenBal = _.getBN(await token1.balanceOf(acc))
        let reserve = _.getBN(await base.balanceOf(SPReserve.address))

        let poolDataTKN1 = await utils.getPoolData(assetD);
        const B = _.getBN(poolDataTKN1.baseAmount)
        const Z = _.getBN(poolDataTKN1.tokenAmount)
        let z = math.calcSwapOutput(x, Z, B)
        let memberDeets =await lend.getMemberDetails(acc, assetC, assetD)
        let mAC = _.getBN(memberDeets.assetCurrentCollateral);
        let mAD = _.getBN(memberDeets.assetDebt);
        // let mAB = memberDeets.timeBorrowed;
        //    console.log(_.BN2Str(mAC)/_.one,_.BN2Str(mAD) );

        await sleep(3100)
        await token1.approve(lend.address, _.BN2Str(500000*_.one))
        await lend.payBack(x, assetC, assetD, {from:acc})
        let removedCollateral = _.getBN(input.times(mAC).div(mAD))


        poolDataTKN1 = await utils.getPoolData(assetD);
        let baseBalA = _.getBN(await poolWBNB.balanceOf(acc))
        let tokenBalA = _.getBN(await token1.balanceOf(acc))
        let reserveA = _.getBN(await base.balanceOf(SPReserve.address))
        let memberDeetsA =await lend.getMemberDetails( acc, assetC, assetD)
        let mACA = memberDeetsA.assetCurrentCollateral;
        let mADA = memberDeetsA.assetDebt;
        //    console.log(_.BN2Str(mACA)/_.one,_.BN2Str(mADA)/_.one);
     
        assert.equal(_.BN2Str(poolDataTKN1.baseAmount), _.BN2Str(B.minus(z)))
        assert.equal(_.BN2Str(poolDataTKN1.tokenAmount), _.BN2Str(Z.plus(x)))
        assert.equal(_.BN2Str(await token1.balanceOf(poolTKN1.address)), _.BN2Str(Z.plus(x)), 'token balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN1.address)), _.BN2Str(B.minus(z)), 'base balance')
        assert.equal(_.BN2Str(baseBalA), _.BN2Str(_.floorBN(baseBal.plus(removedCollateral))))
        assert.equal(_.BN2Str(tokenBalA), _.BN2Str(tokenBal.minus(x)))
        assert.equal(_.BN2Str(reserveA), _.BN2Str((reserve.plus(z))))
        // assert.equal(_.BN2Str(mACA), _.BN2Str(mAC.minus(removedCollateral)))
        assert.equal(_.BN2Str(mADA), _.BN2Str(mAD.minus(x)))
    
    })
}
async function RepayTKNgetSynthBNB(acc, x) {
    it("Return USDs & recieve BNB-SPS collateral", async () => {
        let input = _.getBN(x);
        let assetC = synthBNB.address;
        let assetD = token1.address;
        let baseBal = _.getBN(await synthBNB.balanceOf(acc))
        let tokenBal = _.getBN(await token1.balanceOf(acc))
        let reserve = _.getBN(await base.balanceOf(SPReserve.address))

        let poolDataTKN1 = await utils.getPoolData(assetD);
        const B = _.getBN(poolDataTKN1.baseAmount)
        const Z = _.getBN(poolDataTKN1.tokenAmount)
        let z = math.calcSwapOutput(x, Z, B)
        let memberDeets =await lend.getMemberDetails(acc, assetC, assetD)
        let mAC = _.getBN(memberDeets.assetCurrentCollateral);
        let mAD = _.getBN(memberDeets.assetDebt);
        // let mAB = memberDeets.timeBorrowed;
        //   console.log(_.BN2Str(mAC)/_.one,_.BN2Str(mAD) );

        await sleep(3100)
        await token1.approve(lend.address, _.BN2Str(500000*_.one))
        await lend.payBack(x, assetC, assetD, {from:acc})
        let removedCollateral = _.getBN(input.times(mAC).div(mAD))


        poolDataTKN1 = await utils.getPoolData(assetD);
        let baseBalA = _.getBN(await synthBNB.balanceOf(acc))
        let tokenBalA = _.getBN(await token1.balanceOf(acc))
        let reserveA = _.getBN(await base.balanceOf(SPReserve.address))
        let memberDeetsA =await lend.getMemberDetails( acc, assetC, assetD)
        let mACA = memberDeetsA.assetCurrentCollateral;
        let mADA = memberDeetsA.assetDebt;
        //    console.log(_.BN2Str(mACA)/_.one,_.BN2Str(mADA)/_.one);
     
        assert.equal(_.BN2Str(poolDataTKN1.baseAmount), _.BN2Str(B.minus(z)))
        assert.equal(_.BN2Str(poolDataTKN1.tokenAmount), _.BN2Str(Z.plus(x)))
        assert.equal(_.BN2Str(await token1.balanceOf(poolTKN1.address)), _.BN2Str(Z.plus(x)), 'token balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN1.address)), _.BN2Str(B.minus(z)), 'base balance')
        assert.equal(_.BN2Str(baseBalA), _.BN2Str(_.floorBN(baseBal.plus(removedCollateral))))
        assert.equal(_.BN2Str(tokenBalA), _.BN2Str(tokenBal.minus(x)))
        assert.equal(_.BN2Str(reserveA), _.BN2Str((reserve.plus(z))))
        // assert.equal(_.BN2Str(mACA), _.BN2Str(mAC.minus(removedCollateral)))
        assert.equal(_.BN2Str(mADA), _.BN2Str(mAD.minus(x)))
    
    })
}

async function payInterestForTKNBASE(acc, x) {
    it("Pay Interest - collateral BASE", async () => {
        let assetC = base.address;
        let assetD = token1.address;
        let poolDataTKN1 = await utils.getPoolData(assetD);
        const B = _.getBN(poolDataTKN1.baseAmount)
        const Z = _.getBN(poolDataTKN1.tokenAmount)
        let baseBal = _.getBN(await base.balanceOf(poolTKN1.address))
        let baseBa = _.getBN(await base.balanceOf(SPReserve.address))
        let tokenBal = _.getBN(await token1.balanceOf(acc))
        // let reserve = _.getBN(await lend.reserve())

        let collateralDebt = _.getBN(await lend.mapAddress_totalDebt(assetC,assetD))
        let collateralAmount = _.getBN(await lend.mapAddress_totalCollateral(assetC,assetD))
        //  console.log("collateral",_.BN2Str(collateralAmount));
        let interestAmount = _.getBN(collateralDebt.times(10**18).div(Z));
        let IRperDay = _.BN2Str(interestAmount.div(365).times(1));
        let _percentAmount =  _.BN2Str(collateralAmount.times(IRperDay).div(10**18));
        // console.log("_percentAmount ", _.BN2Str(_percentAmount))

        let z = math.calcSwapOutput(_percentAmount, B, Z)
        await sleep(6000)
        await lend.checkInterest(assetC);
        let collateralDebtA = _.getBN(await lend.mapAddress_totalDebt(assetC,assetD))
        let collateralAmountA = _.getBN(await lend.mapAddress_totalCollateral(assetC,assetD))
        // let reserveA = _.getBN(await lend.reserve())

        assert.equal(_.BN2Str(await base.balanceOf(poolTKN1.address)), _.BN2Str(baseBal.plus(_percentAmount)));
        // assert.equal(_.BN2Str(reserve), _.BN2Str(reserveA));
        assert.equal(_.BN2Str(await base.balanceOf(SPReserve.address)), _.BN2Str(baseBa));
        assert.equal(_.BN2Str(collateralAmountA), _.BN2Str(collateralAmount.minus(_percentAmount)));
        assert.equal(_.BN2Str(collateralDebtA), _.BN2Str(collateralDebt.minus(z)));
       

    })
}
async function payInterestForTKNSPT(acc, x) {
    it("Pay Interest - collateral BNB-SPT", async () => {
        let assetC = poolWBNB.address;
        let assetD = token1.address;
        let poolDataTKN1 = await utils.getPoolData(assetD);
        const B = _.getBN(poolDataTKN1.baseAmount)
        const Z = _.getBN(poolDataTKN1.tokenAmount)
       

        let baseBal = _.getBN(await base.balanceOf(poolTKN1.address))
        let lps = _.getBN(await poolWBNB.balanceOf(lend.address))
        let baseBa = _.getBN(await base.balanceOf(SPReserve.address))
        let tokenBal = _.getBN(await poolWBNB.totalSupply())
        // let reserve = _.getBN(await lend.reserve())

        let collateralDebt = _.getBN(await lend.mapAddress_totalDebt(assetC,assetD))
        let collateralAmount = _.getBN(await lend.mapAddress_totalCollateral(assetC,assetD))
        //  console.log("collateral",_.BN2Str(collateralAmount));
        let interestAmount = _.getBN(collateralDebt.times(10**18).div(Z));
        let IRperDay = _.BN2Str(interestAmount.div(365).times(1));
        let _percentAmount =  _.BN2Str(collateralAmount.times(IRperDay).div(10**18));
      //   console.log("_percentAmount ", _.BN2Str(_percentAmount))

        // console.log(_.BN2Str(_percentAmount))
        
        

        let poolDataBNB = await utils.getPoolData(wbnb.address);
        const X =  _.getBN(poolDataBNB.baseAmount)
        const Y =  _.getBN(poolDataBNB.tokenAmount)
     
        let shareB = _.getBN(math.calcShare(_percentAmount,tokenBal, X))
        let shareT = _.getBN(math.calcShare(_percentAmount,tokenBal, Y))
        let z = _.BN2Str(await utils.calcSwapOutput(_.BN2Str(shareT),_.BN2Str(Y.minus(shareT)),_.BN2Str(X.minus(shareB))))
        // console.log("shareB ",_.BN2Str(shareB))
        // console.log("shareT ",_.BN2Str(shareT))
        // console.log("z ",_.BN2Str(z))
        let final = _.BN2Str(shareB.plus(z));
        let y = math.calcSwapOutput(final,B,Z)

        
        // console.log("Final ",_.BN2Str(final))
        await sleep(6000)
        await lend.checkInterest(assetC);
        
        let collateralDebtA = _.getBN(await lend.mapAddress_totalDebt(assetC,assetD))
        let collateralAmountA = _.getBN(await lend.mapAddress_totalCollateral(assetC,assetD))
        // let reserveA = _.getBN(await lend.reserve())
        let lpsA = _.getBN(await poolWBNB.balanceOf(lend.address))

        assert.equal(_.BN2Str(await base.balanceOf(poolTKN1.address)), _.BN2Str(baseBal.plus(final)));
        // assert.equal(_.BN2Str(reserve), _.BN2Str(reserveA));
        assert.equal(_.BN2Str(collateralAmountA), _.BN2Str(collateralAmount.minus(_percentAmount)));
        assert.equal(_.BN2Str(collateralDebtA), _.BN2Str(collateralDebt.minus(y)));
        assert.equal(_.BN2Str(lpsA), _.BN2Str(lps.minus(_percentAmount)));

    })
}
async function payInterestForTKNSYNTH(acc, x) {
    it("Pay Interest - collateral BNB-SPS", async () => {
        let assetC = synthBNB.address;
        let assetD = token1.address;
        let poolDataTKN1 = await utils.getPoolData(assetD);
        const B = _.getBN(poolDataTKN1.baseAmount)
        const Z = _.getBN(poolDataTKN1.tokenAmount)

        let poolDataBNB = await utils.getPoolData(wbnb.address);
        const X = _.getBN(poolDataBNB.baseAmount)
        const Y = _.getBN(poolDataBNB.tokenAmount)
        let synthBal = _.getBN(await synthBNB.balanceOf(lend.address))
        let baseBa = _.getBN(await base.balanceOf(poolTKN1.address))
        let tokenBal = _.getBN(await token1.balanceOf(acc))
        // let reserve = _.getBN(await lend.reserve())

        let collateralDebt = _.getBN(await lend.mapAddress_totalDebt(assetC,assetD))
        let collateralAmount = _.getBN(await lend.mapAddress_totalCollateral(assetC,assetD))
        //  console.log("collateral",_.BN2Str(collateralAmount));
        let interestAmount = _.getBN(collateralDebt.times(10**18).div(Z));
        let IRperDay = _.BN2Str(interestAmount.div(365).times(1));
        let _percentAmount =  _.BN2Str(collateralAmount.times(IRperDay).div(10**18));
        // console.log("_percentAmount ", _.BN2Str(_percentAmount))
        let z = math.calcSwapOutput(_percentAmount, Y, X)
        let a = math.calcSwapOutput(z, B, Z)
        //  console.log("base boght",_.BN2Str(z));
        await sleep(6000)

        await lend.checkInterest(assetC);
        let collateralDebtA = _.getBN(await lend.mapAddress_totalDebt(assetC,assetD))
        let collateralAmountA = _.getBN(await lend.mapAddress_totalCollateral(assetC,assetD))
        // let reserveA = _.getBN(await lend.reserve())

        assert.equal(_.BN2Str(await synthBNB.balanceOf(lend.address)), _.BN2Str(synthBal.minus(_percentAmount)));
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN1.address)), _.BN2Str(baseBa.plus(z)));
        // assert.equal(_.BN2Str(reserve), _.BN2Str(reserveA));
        assert.equal(_.BN2Str(collateralAmountA), _.BN2Str(collateralAmount.minus(_percentAmount)));
        assert.equal(_.BN2Str(collateralDebtA), _.BN2Str(collateralDebt.minus(a)));


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
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(Y.minus(y)), 'base balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN1.address)), _.BN2Str(B.plus(y)), 'base balance')
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
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN1.address)), _.BN2Str(Y.minus(y)), 'base balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(B.plus(y)), 'base balance')
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
    })
}
async function swapBASEToBNB(acc, x) {
    it(`It should buy BNB with BASE from ${acc}`, async () => {
        // console.log("routerBal ", _.BN2Str(await base.balanceOf(router.address)))
        await sleep(10000)
        // console.log('begin');
        let token = wbnb.address
        let tx = await router.swap(x, base.address, token, {from:acc})
        // console.log("routerBal after", _.BN2Str(await base.balanceOf(router.address)))

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
        let fromTOKEN = token1.address 
        let toTOKEN = wbnb.address
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
async function swapTKNtoBASE(acc, x) {
    it(`It should swap TKN to BASE from ${acc}`, async () => {
        let token = token1.address
        await sleep(10000);
        let tx = await router.swap(x, token, base.address, {from:acc})
    })
}
async function swapBASEtoTKN(acc, x) {
    it(`It should swap TKN to BASE from ${acc}`, async () => {
        let token = token1.address
        let tx = await router.swap(x,base.address,token, {from:acc})
    })
}
async function _checkliquidate(acc) {
    it(`It should check liquidation`, async () => {


        let tx = await lend.checkliquidate(base.address, {from:acc});
    })
}



//helpers
function ShowBNBPool() {
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
function ShowTKNPool() {
    it("Show NEW POOL", async () => {
    let tknA = _.BN2Str(await poolTKN1.tokenAmount());
    let baseA = _.BN2Str(await poolTKN1.baseAmount());
    let lptoken = _.BN2Str(await poolTKN1.totalSupply());
    console.log('================= new POOL DEPTH ==================')
    console.log(`SPARTA - ${baseA/_.one}`);
    console.log(`TKN - ${tknA/_.one}`);
    console.log(`lps - ${lptoken/_.one}`);
})
}






