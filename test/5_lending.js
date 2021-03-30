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
     addLiquidityBNB(acc0,_.BN2Str(10*_.one),  _.BN2Str(1*_.one)); //SPV2
     addLiquidityBNB(acc1,_.BN2Str(90*_.one),  _.BN2Str(9*_.one)); //SPV2
     addLiquidityTKN1(acc0,_.BN2Str(10*_.one),  _.BN2Str(1*_.one)); //SPV2
     addLiquidityTKN1(acc1,_.BN2Str(100*_.one),  _.BN2Str(10*_.one)); //SPV2
     curatePools()
     createSyntheticBNB()
     swapLayer1ToSynth(acc0,_.BN2Str(50*_.one))
    //  swapSynthToLayer1(acc1)
     BorrowTKNwithBASE(acc0,_.BN2Str(1*_.one))
     BorrowTKNwithSPT2BNB(acc0,_.BN2Str(1*_.one))
     BorrowTKNwithASYNTHBNB(acc0,_.BN2Str(1*_.one))
   
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
        await Dao.setGenesisAddresses(router.address, utils.address, lend.address, bond.address, daoVault.address,poolFactory.address, synthFactory.address); 
        await base.changeDAO(Dao.address)  

        await base.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(lend.address, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(router.address, _.getBN(_.BN2Str(100000 * _.one)))
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
        await wbnb.transfer(acc0, _.getBN(_.BN2Int(_.one * 30)))
        await wbnb.transfer(acc1, _.getBN(_.BN2Int(_.one * 30)))
        await wbnb.transfer(acc2, _.getBN(_.BN2Int(_.one * 30)))
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
    it("Swap BASE to Synthetic BNB", async () => {
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
    it("Borrow TKN with BASE", async () => {
        let input = _.getBN(x);
        let assetC = base.address;
        let assetD = token1.address;
        let baseBal = _.getBN(await base.balanceOf(acc))
        let tokenBal = _.getBN(await token1.balanceOf(acc))
        let reserve = _.getBN(await base.balanceOf(lend.address))
        let colRat = input.times(6666).div(10000)

        let poolDataTKN1 = await utils.getPoolData(assetD);
        const B = _.getBN(poolDataTKN1.baseAmount)
        const Z = _.getBN(poolDataTKN1.tokenAmount)
        let z = math.calcSwapOutput(colRat, B, Z)
        let memberDeets =await lend.getMemberDetails( acc, assetC, assetD)
        let mAC = _.getBN(memberDeets.assetCollateral);
        let mAD = _.getBN(memberDeets.assetDebt);
        // let mAB = memberDeets.timeBorrowed;
        // console.log(_.BN2Str(mAC),_.BN2Str(mAD), _.BN2Str(mAB) );

        await lend.drawDebt(input, assetC, assetD, {from:acc})
        let memberDeetsA =await lend.getMemberDetails( acc, assetC, assetD)
        let mACA = memberDeetsA.assetCollateral;
        let mADA = memberDeetsA.assetDebt;
        // let mABA = memberDeetsA.timeBorrowed;
        // console.log(_.BN2Str(mAC),_.BN2Str(mAD), _.BN2Str(mAB) );

        poolDataTKN1 = await utils.getPoolData(assetD);
        let baseBalA = _.getBN(await base.balanceOf(acc))
        let tokenBalA = _.getBN(await token1.balanceOf(acc))
        let reserveA = _.getBN(await base.balanceOf(lend.address))

        assert.equal(_.BN2Str(poolDataTKN1.baseAmount), _.BN2Str(B.plus(colRat)))
        assert.equal(_.BN2Str(poolDataTKN1.tokenAmount), _.BN2Str(Z.minus(z)))
        assert.equal(_.BN2Str(await token1.balanceOf(poolTKN1.address)), _.BN2Str(Z.minus(z)), 'token balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN1.address)), _.BN2Str(B.plus(colRat)), 'base balance')
        assert.equal(_.BN2Str(baseBalA), _.BN2Str(baseBal.minus(input)))
        assert.equal(_.BN2Str(tokenBalA), _.BN2Str(tokenBal.plus(z)))
        assert.equal(_.BN2Str(reserveA), _.BN2Str(reserve.plus(input).minus(colRat)))
        assert.equal(_.BN2Str(mACA), _.BN2Str(mAC.plus(input)))
        assert.equal(_.BN2Str(mADA), _.BN2Str(mAD.plus(z)))

    })
}
async function BorrowTKNwithSPT2BNB(acc, x) {
    it("Borrow TKN with SPT2s", async () => {
        let input = _.getBN(x);
        let assetC = poolWBNB.address;
        let assetD = token1.address;
        let baseBal = _.getBN(await poolWBNB.balanceOf(acc))
        let tokenBal = _.getBN(await token1.balanceOf(acc))
        let reserve = _.getBN(await base.balanceOf(lend.address))
        
        let colRatt = input.times(6666).div(10000)
        let colRat = _.getBN(await utils.calcAsymmetricValueBase(poolWBNB.address, colRatt))
        let lpsBal = _.getBN(await poolWBNB.balanceOf(lend.address))

        let poolDataTKN1 = await utils.getPoolData(assetD);
        const B = _.getBN(poolDataTKN1.baseAmount)
        const Z = _.getBN(poolDataTKN1.tokenAmount)
        let z = math.calcSwapOutput(colRat, B, Z)
        let memberDeets =await lend.getMemberDetails( acc, assetC, assetD)
        let mAC = _.getBN(memberDeets.assetCollateral);
        let mAD = _.getBN(memberDeets.assetDebt);
        // let mAB = memberDeets.timeBorrowed;
        // console.log(_.BN2Str(mAC),_.BN2Str(mAD), _.BN2Str(mAB) );

        await lend.drawDebt(input, assetC, assetD, {from:acc})
        let memberDeetsA =await lend.getMemberDetails( acc, assetC, assetD)
        let mACA = memberDeetsA.assetCollateral;
        let mADA = memberDeetsA.assetDebt;
        // let mABA = memberDeetsA.timeBorrowed;
        // console.log(_.BN2Str(mAC),_.BN2Str(mAD), _.BN2Str(mAB) );

        poolDataTKN1 = await utils.getPoolData(assetD);
        let baseBalA = _.getBN(await poolWBNB.balanceOf(acc))
        let tokenBalA = _.getBN(await token1.balanceOf(acc))
        let reserveA = _.getBN(await base.balanceOf(lend.address))
        let lpsBalA = _.getBN(await poolWBNB.balanceOf(lend.address))

        assert.equal(_.BN2Str(poolDataTKN1.baseAmount), _.BN2Str(B.plus(colRat)))
        assert.equal(_.BN2Str(poolDataTKN1.tokenAmount), _.BN2Str(Z.minus(z)))
        assert.equal(_.BN2Str(await token1.balanceOf(poolTKN1.address)), _.BN2Str(Z.minus(z)), 'token balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN1.address)), _.BN2Str(B.plus(colRat)), 'base balance')
        assert.equal(_.BN2Str(baseBalA), _.BN2Str(baseBal.minus(input)))
        assert.equal(_.BN2Str(tokenBalA), _.BN2Str(tokenBal.plus(z)))
        assert.equal(_.BN2Str(reserveA), _.BN2Str(reserve.minus(colRat)))
        assert.equal(_.BN2Str(mACA), _.BN2Str(mAC.plus(input)))
        assert.equal(_.BN2Str(mADA), _.BN2Str(mAD.plus(z)))
        assert.equal(_.BN2Str(lpsBalA), _.BN2Str(lpsBal.plus(input)))

    })
}
async function BorrowTKNwithASYNTHBNB(acc, x) {
    it("Borrow TKN with SYNTHS", async () => {
        let input = _.getBN(x);
        let assetC = synthBNB.address;
        let assetD = token1.address;
        let baseBal = _.getBN(await synthBNB.balanceOf(acc))
        let tokenBal = _.getBN(await token1.balanceOf(acc))
        let reserve = _.getBN(await base.balanceOf(lend.address))
        
        let colRatt = input.times(6666).div(10000)
        let colRat = _.getBN(await utils.calcSwapValueInBaseWithSYNTH(synthBNB.address, colRatt))
        let lpsBal = _.getBN(await synthBNB.balanceOf(lend.address))

        let poolDataTKN1 = await utils.getPoolData(assetD);
        const B = _.getBN(poolDataTKN1.baseAmount)
        const Z = _.getBN(poolDataTKN1.tokenAmount)
        let z = math.calcSwapOutput(colRat, B, Z)
        let memberDeets =await lend.getMemberDetails( acc, assetC, assetD)
        let mAC = _.getBN(memberDeets.assetCollateral);
        let mAD = _.getBN(memberDeets.assetDebt);
        // let mAB = memberDeets.timeBorrowed;
        // console.log(_.BN2Str(mAC),_.BN2Str(mAD), _.BN2Str(mAB) );

        await lend.drawDebt(input, assetC, assetD, {from:acc})
        let memberDeetsA =await lend.getMemberDetails( acc, assetC, assetD)
        let mACA = memberDeetsA.assetCollateral;
        let mADA = memberDeetsA.assetDebt;
        // let mABA = memberDeetsA.timeBorrowed;
        // console.log(_.BN2Str(mAC),_.BN2Str(mAD), _.BN2Str(mAB) );

        poolDataTKN1 = await utils.getPoolData(assetD);
        let baseBalA = _.getBN(await synthBNB.balanceOf(acc))
        let tokenBalA = _.getBN(await token1.balanceOf(acc))
        let reserveA = _.getBN(await base.balanceOf(lend.address))
        let lpsBalA = _.getBN(await synthBNB.balanceOf(lend.address))

        assert.equal(_.BN2Str(poolDataTKN1.baseAmount), _.BN2Str(B.plus(colRat)))
        assert.equal(_.BN2Str(poolDataTKN1.tokenAmount), _.BN2Str(Z.minus(z)))
        assert.equal(_.BN2Str(await token1.balanceOf(poolTKN1.address)), _.BN2Str(Z.minus(z)), 'token balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN1.address)), _.BN2Str(B.plus(colRat)), 'base balance')
        assert.equal(_.BN2Str(baseBalA), _.BN2Str(baseBal.minus(input)))
        assert.equal(_.BN2Str(tokenBalA), _.BN2Str(tokenBal.plus(z)))
        assert.equal(_.BN2Str(reserveA), _.BN2Str(reserve.minus(colRat)))
        assert.equal(_.BN2Str(mACA), _.BN2Str(mAC.plus(input)))
        assert.equal(_.BN2Str(mADA), _.BN2Str(mAD.plus(z)))
        assert.equal(_.BN2Str(lpsBalA), _.BN2Str(lpsBal.plus(input)))
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






