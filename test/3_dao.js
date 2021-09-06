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
var BONDVAULT = artifacts.require("./BondVault.sol");
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
contract('DAO', function (accounts) {
    constructor(accounts)
    createPoolBNB(acc0, 10000, 30)
    createPoolBUSD(acc0, 10000, 10000)
    addLiquidityBNB(acc1, 9)
    addLiquidityBUSD(acc1, 100)
    addLiquidityBNB(acc2, 10)
    addLiquidityBUSD(acc2, 1000)
    curatePools()
    RemCuratePools()
    curatePools()
    depositBNBSPP(acc0, 5)
    depositBNBSPP(acc1, 3)
    depositBNBSPP(acc2, 2)
    //  paramProposal(acc1)
    //  actionProposal(acc2)
    //  grantProposal(acc1)
    // voteUtils()
    // voteRouter()
    deployerListBUSD()
    deployerListBNB()
    voteReserve()
    voteRemoveCurated()
    // voteAddCurated()
    // voteListBond()
    // voteDeListBond()
    // voteListBond()
    voteBadReserve()
    cancelBadProposal()
    // voteDAO()
    // withdrawBNBSPP(acc1) 
    // withdrawBNBSPP(acc2) 
    // depositBUSDSPP(acc1, 5)
    // withdrawBUSDSPP(acc1) 
})


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
        bondVault = await BONDVAULT.new(sparta.address); // deploy daoVault
        router = await ROUTER.new(sparta.address, wbnb.address,); // deploy router
        poolFactory = await POOLFACTORY.new(sparta.address,  wbnb.address) // deploy poolfactory
        synthFactory = await SYNTHFACTORY.new(sparta.address,  wbnb.address) // deploy poolfactory
        await Dao.setGenesisAddresses(router.address,utils.address,reserve.address, utils.address);
        await Dao.setVaultAddresses(daoVault.address,bondVault.address, daoVault.address);
        await Dao.setFactoryAddresses(poolFactory.address,synthFactory.address);
        await Dao.setGenesisFactors(2, 30,6666);
        await Dao.setDaoFactors(1000,400,true, 3);
        await sparta.changeDAO(Dao.address)
     
        // await reserve.flipEmissions();    
        // await sparta.flipEmissions();  

        await sparta.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await sparta.transfer(reserve.address, _.getBN(_.BN2Str(100000 * _.one)))
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
async function curatePools() {
    it("Curate POOls", async () => {
        await poolFactory.addCuratedPool(_.BNB);
        await poolFactory.addCuratedPool(token1.address);
        assert.equal(_.BN2Str(await poolFactory.curatedPoolCount()),'2','Length correct')
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
async function RemCuratePools() {
    it("Remove Curated POOls", async () => {
        await poolFactory.removeCuratedPool(_.BNB);
        await poolFactory.removeCuratedPool(token1.address);
        assert.equal(_.BN2Str(await poolFactory.curatedPoolCount()),'0','Length correct')
    })
}
async function curatePools() {
    it("Curate POOls", async () => {
        await poolFactory.addCuratedPool(_.BNB);
        await poolFactory.addCuratedPool(token1.address);
        assert.equal(_.BN2Str(await poolFactory.curatedPoolCount()),'2','Length correct')
    })
}
async function depositBNBSPP(acc, x){
    it(`It should deposit BNB-SPP`, async () => {
        let asset = poolBNB.address
        let amount = _.getBN(x * _.one)
        let balanceB = _.getBN(await poolBNB.balanceOf(acc))
        let balanceDAOB = _.getBN(await poolBNB.balanceOf(daoVault.address))
        let totalPoolBal = _.getBN(await daoVault.mapTotalPool_balance(poolBNB.address))
        let poolBalMem = _.getBN(await daoVault.getMemberPoolBalance(poolBNB.address, acc))
        await poolBNB.approve(Dao.address, _.BN2Str(1000000*_.one), {from:acc} )
        await Dao.deposit(asset, amount, { from: acc })
        let balanceA = _.getBN(await poolBNB.balanceOf(acc))
        let balanceDAOA = _.getBN(await poolBNB.balanceOf(daoVault.address))
        assert.equal(_.BN2Str(balanceA), _.BN2Str(balanceB.minus(amount)))
        assert.equal(_.BN2Str(balanceDAOA), _.BN2Str(balanceDAOB.plus(amount)))
        assert.equal(await Dao.isMember(acc), true)
        assert.equal(_.BN2Str(await daoVault.mapTotalPool_balance(poolBNB.address)), _.BN2Str(totalPoolBal.plus(amount)))
        assert.equal(_.BN2Str(await daoVault.getMemberPoolBalance(poolBNB.address, acc)), _.BN2Str(poolBalMem.plus(amount)))
       
    })
}
async function depositBUSDSPP(acc, x){
    it(`It should deposit BUSD-SPP`, async () => {
        let asset = poolBUSD.address
        let amount = _.getBN(x * _.one)
        let balanceB = _.getBN(await poolBUSD.balanceOf(acc))
        let balanceDAOB = _.getBN(await poolBUSD.balanceOf(daoVault.address))
        let totalPoolBal = _.getBN(await daoVault.mapTotalPool_balance(poolBUSD.address))
        let poolBalMem = _.getBN(await daoVault.getMemberPoolBalance(poolBUSD.address, acc))
        await poolBUSD.approve(Dao.address, _.BN2Str(1000000*_.one), {from:acc} )
        await Dao.deposit(asset, amount, { from: acc })
        let balanceA = _.getBN(await poolBUSD.balanceOf(acc))
        let balanceDAOA = _.getBN(await poolBUSD.balanceOf(daoVault.address))
        assert.equal(_.BN2Str(balanceA), _.BN2Str(balanceB.minus(amount)))
        assert.equal(_.BN2Str(balanceDAOA), _.BN2Str(balanceDAOB.plus(amount)))
        assert.equal(await Dao.isMember(acc), true)
        assert.equal(_.BN2Str(await daoVault.mapTotalPool_balance(poolBUSD.address)), _.BN2Str(totalPoolBal.plus(amount)))
        assert.equal(_.BN2Str(await daoVault.getMemberPoolBalance(poolBUSD.address, acc)), _.BN2Str(poolBalMem.plus(amount)))
       
    })
}
async function withdrawBNBSPP(acc) {
    it("It should withdraw from dao Vault", async () => {
        let balBefore = _.getBN(await poolBNB.balanceOf(acc))
        let balBeforeD = _.getBN(await poolBNB.balanceOf(daoVault.address))
        let amountWithdraw = _.BN2Str(await daoVault.getMemberPoolBalance(poolBNB.address, acc))
        let total = _.getBN(await daoVault.mapTotalPool_balance(poolBNB.address))
        await Dao.withdraw(poolBNB.address,{from:acc});
        assert.equal(_.BN2Str(await poolBNB.balanceOf(acc)), _.BN2Str(balBefore.plus(amountWithdraw)))
        assert.equal(_.BN2Str(await poolBNB.balanceOf(daoVault.address)), _.BN2Str(balBeforeD.minus(amountWithdraw)))
        assert.equal(_.BN2Str(await daoVault.getMemberPoolBalance(poolBNB.address, acc)), _.BN2Str(0))
        assert.equal(_.BN2Str(await daoVault.mapTotalPool_balance(poolBNB.address)), _.BN2Str(total.minus(amountWithdraw)))
    })
}
async function withdrawBUSDSPP(acc) {
    it("It should withdraw BUSD-SPP from dao Vault", async () => {
        let balBefore = _.getBN(await poolBUSD.balanceOf(acc))
        let balBeforeD = _.getBN(await poolBUSD.balanceOf(daoVault.address))
        let amountWithdraw = _.BN2Str(await daoVault.getMemberPoolBalance(poolBUSD.address, acc))
        let total = _.getBN(await daoVault.mapTotalPool_balance(poolBUSD.address))
        await Dao.withdraw(poolBUSD.address,{from:acc});
        assert.equal(_.BN2Str(await poolBUSD.balanceOf(acc)), _.BN2Str(balBefore.plus(amountWithdraw)))
        assert.equal(_.BN2Str(await poolBUSD.balanceOf(daoVault.address)), _.BN2Str(balBeforeD.minus(amountWithdraw)))
        assert.equal(_.BN2Str(await daoVault.getMemberPoolBalance(poolBUSD.address, acc)), _.BN2Str(0))
        assert.equal(_.BN2Str(await daoVault.mapTotalPool_balance(poolBUSD.address)), _.BN2Str(total.minus(amountWithdraw)))
    })
}
async function paramProposal(acc) {
    it("It should vote, finalise COOL_OFF", async () => {
        await sparta.approve(Dao.address, _.BN2Str(100000*_.one), {from:acc})
        await Dao.newParamProposal('2', 'COOL_OFF', { from: acc})
        let currentProposal = _.BN2Str(await Dao.currentProposal())
        await Dao.voteProposal( { from: acc0 })
        let bnbUnits = _.getBN(await daoVault.getMemberPoolBalance(poolBNB.address, acc0))
        let busdUnits = _.getBN(await daoVault.getMemberPoolBalance(poolBUSD.address, acc0))
        await truffleAssert.reverts(Dao.finaliseProposal(), "!finalising");
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBNB.address)),_.BN2Str(bnbUnits))
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal,poolBUSD.address)),_.BN2Str(busdUnits))
        let bnbUnitss = _.getBN(await daoVault.getMemberPoolBalance(poolBNB.address, acc))
        let busdUnitss = _.getBN(await daoVault.getMemberPoolBalance(poolBUSD.address, acc))
        await Dao.voteProposal( { from: acc })
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBNB.address)),_.BN2Str(bnbUnits.plus(bnbUnitss)))
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal,poolBUSD.address)),_.BN2Str(busdUnits.plus(busdUnitss)))
        assert.equal(await Dao.hasQuorum(currentProposal), true)
        assert.equal(await Dao.mapPID_finalising(currentProposal), false)
        await Dao.pollVotes({from:acc0})
        assert.equal(await Dao.mapPID_finalising(currentProposal), true)
        await truffleAssert.reverts(Dao.finaliseProposal(), "!cooloff");
        await sleep(3100)
        await Dao.finaliseProposal()
        assert.equal(await Dao.coolOffPeriod(), '2')
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBNB.address)), '0')
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBUSD.address)), '0')
        assert.equal(await Dao.mapPID_finalising(currentProposal), false)
        assert.equal(await Dao.mapPID_finalised(currentProposal), true)
        assert.equal(await Dao.mapPID_open(currentProposal), false)
    })
    it("It should vote, finalise ERAS_TO_EARN", async () => {
        await Dao.newParamProposal('10', 'ERAS_TO_EARN', { from: acc })
        let currentProposal = _.BN2Str(await Dao.currentProposal())
        await Dao.voteProposal( { from: acc0 })
        let bnbUnits = _.getBN(await daoVault.getMemberPoolBalance(poolBNB.address, acc0))
        let busdUnits = _.getBN(await daoVault.getMemberPoolBalance(poolBUSD.address, acc0))
        await truffleAssert.reverts(Dao.finaliseProposal(), "!finalising");
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBNB.address)),_.BN2Str(bnbUnits))
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal,poolBUSD.address)),_.BN2Str(busdUnits))
        let bnbUnitss = _.getBN(await daoVault.getMemberPoolBalance(poolBNB.address, acc))
        let busdUnitss = _.getBN(await daoVault.getMemberPoolBalance(poolBUSD.address, acc))
        await Dao.voteProposal( { from: acc })
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBNB.address)),_.BN2Str(bnbUnits.plus(bnbUnitss)))
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal,poolBUSD.address)),_.BN2Str(busdUnits.plus(busdUnitss)))
        assert.equal(await Dao.hasQuorum(currentProposal), true)
        assert.equal(await Dao.mapPID_finalising(currentProposal), false)
        await Dao.pollVotes({from:acc0})
        assert.equal(await Dao.mapPID_finalising(currentProposal), true)
        await truffleAssert.reverts(Dao.finaliseProposal(), "!cooloff");
        await sleep(3100)
        await Dao.finaliseProposal()
        assert.equal(_.BN2Str(await Dao.erasToEarn()), '10')
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBNB.address)), '0')
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBUSD.address)), '0')
        assert.equal(await Dao.mapPID_finalising(currentProposal), false)
        assert.equal(await Dao.mapPID_finalised(currentProposal), true)
        assert.equal(await Dao.mapPID_open(currentProposal), false)
    })
}
async function actionProposal(acc) {
    it("It should vote, finalise GET_SPARTA", async () => {
            await sparta.approve(Dao.address, _.BN2Str(100000*_.one), {from:acc})
            await Dao.newActionProposal('GET_SPARTA', { from: acc })
            let currentProposal = _.BN2Str(await Dao.currentProposal())
            await Dao.voteProposal( { from: acc0 })
            let bnbUnits = _.getBN(await daoVault.getMemberPoolBalance(poolBNB.address, acc0))
            let busdUnits = _.getBN(await daoVault.getMemberPoolBalance(poolBUSD.address, acc0))
            await truffleAssert.reverts(Dao.finaliseProposal(), "!finalising");
            assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBNB.address)),_.BN2Str(bnbUnits))
            assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal,poolBUSD.address)),_.BN2Str(busdUnits))
            let bnbUnitss = _.getBN(await daoVault.getMemberPoolBalance(poolBNB.address, acc))
            let busdUnitss = _.getBN(await daoVault.getMemberPoolBalance(poolBUSD.address, acc))
            await Dao.voteProposal( { from: acc })
            assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBNB.address)),_.BN2Str(bnbUnits.plus(bnbUnitss)))
            assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal,poolBUSD.address)),_.BN2Str(busdUnits.plus(busdUnitss)))
            assert.equal(await Dao.hasQuorum(currentProposal), true)
            assert.equal(await Dao.mapPID_finalising(currentProposal), false)
            await sparta.flipMinting();
            await Dao.pollVotes({from:acc0})
            assert.equal(await Dao.mapPID_finalising(currentProposal), true)
            await truffleAssert.reverts(Dao.finaliseProposal(), "!cooloff");
            await sleep(3100)
            await Dao.finaliseProposal()
            assert.equal(_.BN2Str(await sparta.balanceOf(Dao.address)), _.BN2Str(_.oneBN.times(2500000)))
            assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBNB.address)), '0')
            assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBUSD.address)), '0')
            assert.equal(await Dao.mapPID_finalising(currentProposal), false)
            assert.equal(await Dao.mapPID_finalised(currentProposal), true)
            assert.equal(await Dao.mapPID_open(currentProposal), false)
    })
    it("It should vote, finalise FLIP_EMISSIONS", async () => {
        await sparta.approve(Dao.address, _.BN2Str(100000*_.one), {from:acc})
        await Dao.newActionProposal('FLIP_EMISSIONS', { from: acc })
        let currentProposal = _.BN2Str(await Dao.currentProposal())
        await Dao.voteProposal( { from: acc0 })
        let bnbUnits = _.getBN(await daoVault.getMemberPoolBalance(poolBNB.address, acc0))
        let busdUnits = _.getBN(await daoVault.getMemberPoolBalance(poolBUSD.address, acc0))
        await truffleAssert.reverts(Dao.finaliseProposal(), "!finalising");
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBNB.address)),_.BN2Str(bnbUnits))
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal,poolBUSD.address)),_.BN2Str(busdUnits))
        let bnbUnitss = _.getBN(await daoVault.getMemberPoolBalance(poolBNB.address, acc))
        let busdUnitss = _.getBN(await daoVault.getMemberPoolBalance(poolBUSD.address, acc))
        await Dao.voteProposal( { from: acc })
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBNB.address)),_.BN2Str(bnbUnits.plus(bnbUnitss)))
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal,poolBUSD.address)),_.BN2Str(busdUnits.plus(busdUnitss)))
        assert.equal(await Dao.hasQuorum(currentProposal), true)
        assert.equal(await Dao.mapPID_finalising(currentProposal), false)
        await sparta.flipMinting();
        await Dao.pollVotes({from:acc0})
        assert.equal(await Dao.mapPID_finalising(currentProposal), true)
        await truffleAssert.reverts(Dao.finaliseProposal(), "!cooloff");
        await sleep(3100)
        await Dao.finaliseProposal()
        assert.equal(await sparta.emitting(), true)
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBNB.address)), '0')
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBUSD.address)), '0')
        assert.equal(await Dao.mapPID_finalising(currentProposal), false)
        assert.equal(await Dao.mapPID_finalised(currentProposal), true)
        assert.equal(await Dao.mapPID_open(currentProposal), false)
})
}
async function grantProposal(acc) {
    it("It should vote and GRANT", async () => {
           await sparta.approve(Dao.address, _.BN2Str(100000*_.one), {from:acc})
           await Dao.newGrantProposal(acc0, '1000', { from: acc1 })
            let currentProposal = _.BN2Str(await Dao.currentProposal())
            await Dao.voteProposal( { from: acc0 })
            let bnbUnits = _.getBN(await daoVault.getMemberPoolBalance(poolBNB.address, acc0))
            let busdUnits = _.getBN(await daoVault.getMemberPoolBalance(poolBUSD.address, acc0))
            await truffleAssert.reverts(Dao.finaliseProposal(), "!finalising");
            assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBNB.address)),_.BN2Str(bnbUnits))
            assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal,poolBUSD.address)),_.BN2Str(busdUnits))
            let bnbUnitss = _.getBN(await daoVault.getMemberPoolBalance(poolBNB.address, acc))
            let busdUnitss = _.getBN(await daoVault.getMemberPoolBalance(poolBUSD.address, acc))
            await Dao.voteProposal( { from: acc })
            assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBNB.address)),_.BN2Str(bnbUnits.plus(bnbUnitss)))
            assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal,poolBUSD.address)),_.BN2Str(busdUnits.plus(busdUnitss)))
            assert.equal(await Dao.hasQuorum(currentProposal), true)
            assert.equal(await Dao.mapPID_finalising(currentProposal), false)
            await reserve.flipEmissions(); 
            await Dao.pollVotes({from:acc0})
            assert.equal(await Dao.mapPID_finalising(currentProposal), true)
            await truffleAssert.reverts(Dao.finaliseProposal(), "!cooloff");
            await sleep(3100)
            let balanceBefore = _.getBN(await sparta.balanceOf(acc0))
            await Dao.finaliseProposal()
            let balanceAfter = _.getBN(await sparta.balanceOf(acc0))
            assert.equal(_.BN2Str(balanceAfter.minus(balanceBefore)), '1000')
            assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBNB.address)), '0')
            assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBUSD.address)), '0')
            assert.equal(await Dao.mapPID_finalising(currentProposal), false)
            assert.equal(await Dao.mapPID_finalised(currentProposal), true)
            assert.equal(await Dao.mapPID_open(currentProposal), false)
    })
}
async function voteUtils() {
    it("It should vote UTILS", async () => {
        await sparta.approve(Dao.address, _.BN2Str(100000*_.one), {from:acc0})
        utils2 = await UTILS.new(sparta.address)
        await Dao.newAddressProposal(utils2.address, 'UTILS', { from: acc0 })
        await Dao.voteProposal({ from: acc2 })
        await Dao.voteProposal({ from: acc0 })
        await Dao.pollVotes({from:acc0})
        await sleep(4100)
        await Dao.finaliseProposal();
        assert.equal(await Dao.UTILS(), utils2.address)
    })
}
async function voteRouter() {
    it("It should vote ROUTER", async () => {
        await sparta.approve(Dao.address, _.BN2Str(100000*_.one), {from:acc0})
        router2 = await ROUTER.new(sparta.address, wbnb.address)
        await Dao.newAddressProposal(router2.address, 'ROUTER', { from: acc0 })
        await Dao.voteProposal({ from: acc2 })
        await Dao.voteProposal({ from: acc0 })
        await Dao.pollVotes({from:acc0})
        await sleep(3100)
        await Dao.finaliseProposal();
        assert.equal(await Dao.ROUTER(), router2.address)
    })
}
async function voteReserve() {
    it("It should vote RESERVE", async () => {
        await sparta.approve(Dao.address, _.BN2Str(100000*_.one), {from:acc0})
        reserve2 = await RESERVE.new(sparta.address)
        await Dao.newAddressProposal(reserve2.address, 'RESERVE', { from: acc0 })
        await Dao.voteProposal({ from: acc2 })
        await Dao.voteProposal({ from: acc0 })
        await Dao.pollVotes({from:acc0})
        await reserve.flipEmissions(); 
        await sleep(3100)
        let reserveBal = _.getBN(await sparta.balanceOf(reserve.address))
        await Dao.finaliseProposal();
        assert.equal(await Dao.RESERVE(), reserve2.address)
        assert.equal(_.BN2Str(await sparta.balanceOf(reserve2.address)),_.BN2Str(reserveBal))

    })
}
async function voteDAO() {
    it("It should vote DAO", async () => {
        await sparta.approve(Dao.address, _.BN2Str(100000*_.one), {from:acc0})
        Dao2 = await DAO.new(sparta.address)
        await Dao.newAddressProposal(Dao2.address, 'DAO', { from: acc0 })
        await Dao.voteProposal({ from: acc2 })
        await Dao.voteProposal({ from: acc0 })
        await Dao.pollVotes({from:acc0})
        await sleep(3100)
        await Dao.finaliseProposal();
        await Dao2.setGenesisAddresses(router.address,utils.address,reserve.address, utils.address);
        await Dao2.setVaultAddresses(daoVault.address,bondVault.address, daoVault.address);
        await Dao2.setFactoryAddresses(poolFactory.address,synthFactory.address);
        await Dao2.setGenesisFactors(2, 30,6666,1000,400,true);
        assert.equal(await Dao.DAO(), Dao2.address)
        assert.equal(await Dao.daoHasMoved(), true)
    })
}
async function voteRemoveCurated() {
    it("It should vote to REMOVE_CURATED_POOL", async () => {
        let token = token1.address
        await sparta.approve(Dao.address, _.BN2Str(100000*_.one), {from:acc0})
        Dao2 = await DAO.new(sparta.address)
        await Dao.newAddressProposal(token, 'REMOVE_CURATED_POOL', { from: acc0 })
        await Dao.voteProposal({ from: acc2 })
        await Dao.voteProposal({ from: acc0 })
        await Dao.pollVotes({from:acc0})
        await sleep(3100)
        await Dao.finaliseProposal();
        assert.equal(await poolFactory.isCuratedPool(poolBUSD.address), false)
    })
}
async function voteAddCurated() {
    it("It should vote to ADD_CURATED_POOL", async () => {
        let token = token1.address
        await sparta.approve(Dao.address, _.BN2Str(100000*_.one), {from:acc0})
        Dao2 = await DAO.new(sparta.address)
        await Dao.newAddressProposal(token, 'ADD_CURATED_POOL', { from: acc0 })
        await Dao.voteProposal({ from: acc2 })
        await Dao.voteProposal({ from: acc0 })
        await Dao.pollVotes({from:acc0})
        await sleep(3100)
        await Dao.finaliseProposal();
        assert.equal(await poolFactory.isCuratedPool(poolBUSD.address), true)
    })
}
async function voteListBond() {
    it("It should vote to LIST_BOND", async () => {
        let token = _.BNB
        await sparta.approve(Dao.address, _.BN2Str(100000*_.one), {from:acc0})
        Dao2 = await DAO.new(sparta.address)
        await Dao.newAddressProposal(token, 'LIST_BOND', { from: acc0 })
        await Dao.voteProposal({ from: acc2 })
        await Dao.voteProposal({ from: acc0 })
        await Dao.pollVotes({from:acc0})
        await sleep(3100)
        await Dao.finaliseProposal();
        assert.equal(await Dao.isListed(token), true)
    })
}
async function voteDeListBond() {
    it("It should vote to DELIST_BOND", async () => {
        let token = _.BNB
        await sparta.approve(Dao.address, _.BN2Str(100000*_.one), {from:acc0})
        Dao2 = await DAO.new(sparta.address)
        await Dao.newAddressProposal(token, 'DELIST_BOND', { from: acc0 })
        await Dao.voteProposal({ from: acc2 })
        await Dao.voteProposal({ from: acc0 })
        await Dao.pollVotes({from:acc0})
        await sleep(3100)
        await Dao.finaliseProposal();
        assert.equal(await Dao.isListed(token), false)
    })
}
async function voteBadReserve() {
    it("It should vote BAD RESERVE and fail", async () => {
        await sparta.approve(Dao.address, _.BN2Str(100000*_.one), {from:acc0})
        reserve3 = await RESERVE.new(sparta.address)
        await Dao.newAddressProposal(reserve3.address, 'RESERVE', { from: acc0 })
         let currentProposal = _.BN2Str(await Dao.currentProposal())
        await Dao.voteProposal({ from: acc2 })
        await Dao.voteProposal({ from: acc0 })
        await Dao.pollVotes({from:acc0})
        let votesBNB = _.getBN(await Dao.getProposalAssetVotes(currentProposal, poolBNB.address))
        let votesBUSD = _.getBN(await Dao.getProposalAssetVotes(currentProposal,poolBUSD.address))
        await Dao.unvoteProposal({ from: acc0 })
        let bnbUnits = _.getBN(await daoVault.getMemberPoolBalance(poolBNB.address, acc0))
        let busdUnits = _.getBN(await daoVault.getMemberPoolBalance(poolBUSD.address, acc0))
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBNB.address)),_.BN2Str(votesBNB.minus(bnbUnits)))
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal,poolBUSD.address)),_.BN2Str(votesBUSD.minus(busdUnits)))
        await sleep(3100)
        let reserveBal = _.getBN(await sparta.balanceOf(reserve2.address))
        await Dao.finaliseProposal();
        assert.equal(await Dao.RESERVE(), reserve2.address)
        assert.equal(_.BN2Str(await sparta.balanceOf(reserve2.address)),_.BN2Str(reserveBal))

    })
}
async function cancelBadProposal() {
    it("It should cancel Proposal", async () => {
        let currentProposal = _.BN2Str(await Dao.currentProposal())
        assert.equal(await Dao.mapPID_open(currentProposal), true)
        await Dao.cancelProposal()
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal, poolBNB.address)),_.BN2Str(0))
        assert.equal(_.BN2Str(await Dao.getProposalAssetVotes(currentProposal,poolBUSD.address)),_.BN2Str(0))
        assert.equal(await Dao.mapPID_open(currentProposal), false)
        assert.equal(await Dao.mapPID_finalising(currentProposal), false)
        await truffleAssert.reverts(Dao.voteProposal({ from: acc0 }), "!open"); 
        await truffleAssert.reverts(Dao.pollVotes({ from: acc0 }), "!open"); 
    })
}
async function deployerListBUSD(){
    it('List BUSD asset for bonding', async () =>{
        let asset = token1.address;
        await Dao.listBondAsset(asset);

    })
}
async function deployerListBNB(){
    it('List BNB asset for bonding', async () =>{
        let asset = _.BNB;
        await Dao.listBondAsset(asset);
    })
}
