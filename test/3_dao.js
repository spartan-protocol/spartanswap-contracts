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
    paramProposal(acc1)
    actionProposal(acc2)
    grantProposal(acc1)
    voteUtils()
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
        await Dao.setGenesisFactors(2, 30,6666,1000,400,true);
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
        let tx = await router.addLiquidity(inputToken, token, {from: acc, value:inputToken})
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
        let tx = await router.addLiquidity(inputToken, token, {from: acc})
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
        await Dao.voteProposal({ from: acc0 })git
        await Dao.pollVotes({from:acc0})
        await sleep(4100)
        await Dao.finaliseProposal();
        assert.equal(await Dao.UTILS(), utils2.address)
    })
}


async function voteRouter() {
    it("It should vote ROUTER", async () => {
        router2 = await ROUTER.new(sparta.address, wbnb.address)
        await Dao.newAddressProposal(router2.address, 'ROUTER', { from: acc0 })
        await Dao.voteProposal({ from: acc1 })
        await Dao.voteProposal({ from: acc2 })
        await sleep(3100)
        await Dao.finaliseProposal();
        assert.equal(await Dao.ROUTER(), router2.address)
    })
}

async function voteDao() {
    it("It should vote", async () => {
        Dao2 = await DAO.new(sparta.address)
        await Dao.newAddressProposal(Dao2.address, 'DAO', { from: acc0 })
        await Dao.voteProposal( { from: acc2 })
        await Dao.voteProposal( { from: acc1 })
        await sleep(4100)
        await Dao.finaliseProposal();
        assert.equal(await Dao.DAO(), Dao2.address)
        assert.equal(await Dao.daoHasMoved(), true)
    })
}


async function harvest() {
    it("It should send rewards and check", async () => {
        // await sparta.transfer(router.address, "10000000000000000000")
        let now = _.getBN((new Date())/1000)
        let lastTime = _.getBN(await Dao.mapMember_lastTime(acc1))
       // console.log(`acc1 rate: ${await daoVault.getMemberWeight(acc1)} ${_.getBN(await daoVault.getMemberWeight(acc1)).div(_.getBN(await daoVault.totalWeight()))}`)
        let calcCurrentReward = _.getBN(await Dao.calcCurrentReward(acc1))
        let calcReward = _.getBN(await Dao.calcReward(acc1))
     
        assert.exists(_.BN2Str(lastTime.minus(now)))
        assert.exists(_.BN2Str(calcCurrentReward))
        assert.exists(_.BN2Str(calcReward))
        

        let lastTime2 = _.getBN(await Dao.mapMember_lastTime(acc0))
        let calcCurrentReward2 = _.getBN(await Dao.calcCurrentReward(acc0))
        let calcReward2 = _.getBN(await Dao.calcReward(acc0))
        assert.exists(_.BN2Str(lastTime2.minus(now)))
        assert.exists(_.BN2Str(calcCurrentReward2))
        assert.exists(_.BN2Str(calcReward2))

        let lastTime3 = _.getBN(await Dao.mapMember_lastTime(acc2))
        let calcCurrentReward3 = _.getBN(await Dao.calcCurrentReward(acc2))
        let calcReward3 = _.getBN(await Dao.calcReward(acc2))
        assert.exists(_.BN2Str(lastTime3.minus(now)))
        assert.exists(_.BN2Str(calcCurrentReward3))
        assert.exists(_.BN2Str(calcReward3))

    })
    it("It should harvest acc0", async () => {
        let balBefore = _.getBN(await sparta.balanceOf(acc0))
       console.log(_.BN2Str(balBefore)/_.one);
        await sleep(6300)
        await Dao.harvest({from:acc0});
        let balAfter = _.getBN(await sparta.balanceOf(acc0))
        console.log(_.BN2Str(balAfter)/_.one);
    })
    it("It should harvest acc1", async () => {
        let balBefore = _.getBN(await sparta.balanceOf(acc1))
        await sleep(6300)
        await Dao.harvest({from:acc1});
        let balAfter = _.getBN(await sparta.balanceOf(acc1))
        
    })
    it("It should harvest acc2", async () => {
        let balBefore = _.getBN(await sparta.balanceOf(acc2))
        await sleep(6300)
        await Dao.harvest({from:acc2});
        let balAfter = _.getBN(await sparta.balanceOf(acc2))
        
    })


}

async function claimLP(acc, ms){
    it(`It should claim  ${ms/1000} seconds`, async () => {
        await sleep(ms)
        let asset = _.BNB
        let balBefore = _.getBN(await poolWBNB.balanceOf(bondVault.address))
        let memberDetailsBefore = await bondVault.getMemberDetails(acc, asset);
        let bondedLPBefore = _.getBN(memberDetailsBefore.bondedLP)
        let memberDetails = await bondVault.getMemberDetails(acc, asset);
        let claimRate = _.BN2Str(memberDetailsBefore.claimRate)

        let accBal = _.getBN(await poolWBNB.balanceOf(acc))
        await Dao.claimAllForMember(acc,{from:acc})
        let memberDetailsAfter = await bondVault.getMemberDetails(acc, asset);
        let bondedLPAfter = _.getBN(memberDetailsAfter.bondedLP)
        let balAfter = _.getBN(await poolWBNB.balanceOf(bondVault.address))
        let accBall = _.getBN(await poolWBNB.balanceOf(acc))
       
        // console.log("vault LP balance ",_.BN2Str(balBefore)); 
        
        // console.log("bondedLPBefore ",_.BN2Str(memberDetails.bondedLP)); 
        // console.log("claimRate ",_.BN2Str(claimRate)); 
        // console.log("accBal ",_.BN2Str(accBal)); 

        // console.log("member bondedLPAfter ",_.BN2Str(bondedLPAfter)); 
        // console.log("vault balAfter ",_.BN2Str(balAfter)); 
        // console.log("accBall  ",_.BN2Str(accBall)); 

        let memberDetailsAfterb = await bondVault.getMemberDetails(acc, asset);
        let bondedLPAfterb = _.getBN(memberDetailsAfterb.bondedLP)
        let balAfterb = _.getBN(await poolWBNB.balanceOf(bondVault.address))
        let accBallb = _.getBN(await poolWBNB.balanceOf(acc))
    
        // console.log("member bondedLPAfter ",_.BN2Str(bondedLPAfterb)); 
        // console.log("vault balAfter ",_.BN2Str(balAfterb)); 
        // console.log("accBall  ",_.BN2Str(accBallb)); 


    })
    
}
async function claimLPTNK(acc, ms){
    it(`It should claim vesting Token LPs after ${ms/1000} seconds`, async () => {
        await sleep(ms)
        let asset = token1.address
        let balBefore = _.getBN(await poolTKN1.balanceOf(bondVault.address))
        let now = _.getBN((new Date())/1000)
        let memberDetailsBefore = await bondVault.getMemberDetails(acc, asset);
        let bondedLPBefore = _.BN2Int(memberDetailsBefore.bondedLP)
        let claimRate = _.BN2Str(memberDetailsBefore.claimRate)
        
        await Dao.claimForMember(asset,{from:acc})
        let calcClaimable = _.floorBN(now.minus(DEPOTime).times(claimRate))
        let memberDetailsAfter = await bondVault.getMemberDetails(acc, asset);
        let bondedLPAfter = _.getBN(memberDetailsAfter.bondedLP)
        let balAfter = _.getBN(await poolTKN1.balanceOf(bondVault.address))
        let accBall = _.getBN(await poolWBNB.balanceOf(acc))
        console.log("vault LP balance ",_.BN2Str(balBefore)); 
        console.log("member bondedLPBefore ",_.BN2Str(bondedLPBefore)); 
        console.log("claimRate ",_.BN2Str(claimRate)); 
       

        console.log("member bondedLPAfter ",_.BN2Str(bondedLPAfter)); 
        console.log("vault balAfter ",_.BN2Str(balAfter)); 
        console.log("accBall  ",_.BN2Str(accBall)); 
    })
    
}
async function depositNONEListedAsset(){
    it('should fail to deposit none listed asset', async () =>{
        let attacker = acc3;
        let amount = _.BN2Str(_.one)
        let tnk = token1.address;
        try {
            await Dao.deposit(tnk, amount,{from:attacker})
            assert.fail("The transaction should reject attacker");
        }
        catch (err) {
            assert.include(err.message, "revert", "revert must be listed");
        }

    })
}

async function deployerListTKN(){
    it('deployer list TKN asset', async () =>{
        let deployer = acc0;
        let asset = token1.address;
        await Dao.listBondAsset(asset, {from:deployer});

    })
}
async function deployerListBNB(){
    it('deployer list bnb asset', async () =>{
        let deployer = acc0;
        let asset = _.BNB;
        await Dao.listBondAsset(asset, {from:deployer});
    })
}

async function deployerChangeSecondsPerYear(seconds){
    it(`Deployer change bond period to ${seconds} seconds`, async () => {
        await Dao.changeBondingPeriod(seconds, {from:acc0});
        let secondsPerYearA = _.BN2Str(await Dao.bondingPeriodSeconds());
        assert.equal(secondsPerYearA, seconds, 'deployer change bond period in seconds')
    })
}
async function bondBNB(acc, amount){
    it(`It should bond  `, async () => {
        let asset = _.BNB
        console.log(_.BN2Str(await sparta.feeOnTransfer()))
        let poolData = await utils.getPoolData(asset);
        let spartaAllocation = await utils.calcSwapValueInBase(asset,amount)
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolWBNB.totalSupply()))
        let units = _.getBN(await utils.calcLiquidityUnits(spartaAllocation, B, amount, T, poolUnits))
        DEPOTime = _.getBN((new Date())/1000)
       await Dao.bond(asset, amount,{from:acc, value:amount})
       let memberDetails = await bondVault.getMemberDetails(acc, asset);
        // console.log("bondedLPBefore ",_.BN2Str(memberDetails.bondedLP)); 
       assert.equal(_.BN2Str(memberDetails.bondedLP), _.BN2Str(units), 'bonded LP')
        assert.equal(_.BN2Str((await poolWBNB.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
    })
}
async function depositTKN(acc, amount){
    it(`It should deposit tkn`, async () => {
        let asset = token1.address
        let poolData = await utils.getPoolData(asset);
        let spartaAllocation = await utils.calcSwapValueInBase(asset,amount)
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolTKN1.totalSupply()))
        let units = _.getBN(await utils.calcLiquidityUnits(spartaAllocation, B, amount, T, poolUnits))
        DEPOTime = _.getBN((new Date())/1000)
        let lockLPBalB =  _.getBN(await poolTKN1.balanceOf(bondVault.address))
        await token1.approve(Dao.address, _.BN2Str(10000*_.one), {from:acc})
        await Dao.deposit(asset, amount,{from:acc})
        let memberDetails = await bondVault.getMemberDetails(acc, asset);
        let lockLPBal =  _.BN2Str(await poolTKN1.balanceOf(bondVault.address))
        assert.equal(lockLPBal, _.BN2Str(lockLPBalB.plus(units)), 'got LP')
        assert.equal(_.BN2Str((await poolTKN1.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
        assert.equal(_.BN2Str(memberDetails.bondedLP), _.BN2Str(units.plus(lockLPBalB)), 'bonded LP')

    })
}


