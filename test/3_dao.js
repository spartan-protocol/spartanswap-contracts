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
    wrapBNB()
    createPoolWBNB()
    createPoolTKN1()
    addLiquidityTKN1(acc1,  _.BN2Str(40*_.one),  _.BN2Str(20*_.one))
    addLiquidityTKN1(acc0,  _.BN2Str(40*_.one),  _.BN2Str(20*_.one))
    addLiquidityBNB(acc1,  _.BN2Str(40*_.one),  _.BN2Str(20*_.one))
    addLiquidityBNB(acc0,  _.BN2Str(40*_.one),  _.BN2Str(20*_.one))
    addLiquidityBNB(acc2,  _.BN2Str(40*_.one),  _.BN2Str(20*_.one))
    addLiquidityTKN1(acc2,  _.BN2Str(20*_.one),  _.BN2Str(10*_.one))
    curatePools()
    lockWBNB(acc0, _.BN2Str(_.one * 1)) // 16% 
    lockTKN(acc1, _.BN2Str(_.one * 3)) // 50% 
    lockTKN(acc2, _.BN2Str(_.one * 2)) // 33% 
    rate()
    //  voteParam()
    voteAction()

    withdrawBNB(acc0)
    withdrawTKN1(acc1)
    withdrawTKN1(acc2)
    rate()
    //  voteRouter()
    //  voteDao() 
    deployerListBNB()
    deployerChangeSecondsPerYear(40)
    bondBNB(acc0,  _.BN2Str(_.one * 1))
    bondBNB(acc1, _.BN2Str(_.one * 3))
    bondBNB(acc2, _.BN2Str(_.one * 2))
    rateBond() 
    claimLP(acc0, 2000) 
    claimLP(acc1, 2000)
    claimLP(acc2, 20) 
    rate()
    lockWBNB(acc0, _.BN2Str(_.one * 1)) // 16% 
    lockTKN(acc1, _.BN2Str(_.one * 3)) // 50% 
    lockTKN(acc2, _.BN2Str(_.one * 2)) // 33% 
    rate()
    voteGrant()
    RemCuratePools()
    withdrawBNB(acc0)
    withdrawTKN1(acc1)
    withdrawTKN1(acc2)
    rate()
    rateBond()
    curatePools()
    lockWBNB(acc0, _.BN2Str(_.one * 1)) // 16% 
    lockTKN(acc0, _.BN2Str(_.one * 0.5)) // 16% 
    lockTKN(acc1, _.BN2Str(_.one * 3)) // 50% 
    lockTKN(acc2, _.BN2Str(_.one * 2)) // 33% 
    harvest()

})


function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
       //SPARTANPROTOCOLv2
       sparta = await SPARTA.new(acc0) // deploy sparta v2
       wbnb = await WBNB.new() // deploy wBNB 
       Dao = await DAO.new(sparta.address)     // deploy daoV2
       utils = await UTILS.new(sparta.address) // deploy utilsV2
       token1 = await TOKEN.new()   
       reserve = await RESERVE.new(sparta.address) // deploy reserve 
       daoVault = await DAOVAULT.new(sparta.address); // deploy daoVault
       bondVault = await BONDVAULT.new(sparta.address); // deploy bondVault
       router = await ROUTER.new(sparta.address, wbnb.address); // deploy router
       poolFactory = await POOLFACTORY.new(sparta.address,  wbnb.address) // deploy poolfactory
       synthFactory = await SYNTHFACTORY.new(sparta.address,  wbnb.address) // deploy synthFactory

       await Dao.setGenesisAddresses(router.address,utils.address,reserve.address);
       await Dao.setVaultAddresses(daoVault.address,bondVault.address, utils.address);
       await Dao.setFactoryAddresses(poolFactory.address,synthFactory.address);
       await sparta.changeDAO(Dao.address)

       await reserve.setIncentiveAddresses(router.address, utils.address,utils.address,Dao.address );
       await reserve.flipEmissions();    
       await sparta.flipEmissions();  
       await sparta.flipMinting();

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

       await sparta.approve(Dao.address, _.BN2Str(500000 * _.one), { from: acc0 })
       await sparta.approve(Dao.address, _.BN2Str(500000 * _.one), { from: acc1 })
       await sparta.approve(Dao.address, _.BN2Str(500000 * _.one), { from: acc2 })


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

    })
}
async function createPoolTKN1(SPT, token) {
    it("It should deploy TKN1 Pool", async () => {
        var _pool = await poolFactory.createPool.call(token1.address)
        await poolFactory.createPool(token1.address)
        poolTKN1 = await POOL.at(_pool)


    })
}
async function addLiquidityBNB(acc, b, t) {
    it(`It should addLiquidity BNB from ${acc}`, async () => {
        let token = wbnb.address
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolWBNB.totalSupply()))
        let units = math.calcLiquidityUnits(b, B, t, T, poolUnits)
        let tx = await router.addLiquidity(b, t, token, { from: acc})
    })
}
async function addLiquidityTKN1(acc, b, t) {
    it(`It should addLiquidity TKN from ${acc}`, async () => {
        let token = token1.address
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolTKN1.totalSupply()))
        let units = math.calcLiquidityUnits(b, B, t, T, poolUnits)
        let tx = await router.addLiquidity(b, t, token, { from: acc})
    })
}
async function curatePools() {
    it("Curate POOls", async () => {
        await poolFactory.addCuratedPool(wbnb.address);
        await poolFactory.addCuratedPool(token1.address);
       
    })
}
async function RemCuratePools() {
    it("Remove Curated POOls", async () => {
        await poolFactory.removeCuratedPool(wbnb.address);
        await poolFactory.removeCuratedPool(token1.address);
       
    })
}
async function lockTKN(acc, amount) {
    it("It should deposit", async () => {
        await poolTKN1.approve(Dao.address, _.BN2Str(1000000*_.one), {from:acc} )
        await Dao.deposit(poolTKN1.address, amount, { from: acc })
        let balancee = await poolWBNB.balanceOf(acc)
        // console.log(`balanceA: ${balancee}`)
        // console.log(`isMember: ${await Dao.isMember(acc)}`)
        // console.log(`mapMemberPool_balance: ${await daoVault.getMemberPoolBalance(acc, poolTKN1.address)}`)
        // console.log(`totalWeight: ${await daoVault.totalWeight()}`)
        // console.log(`getMemberWeight: ${await daoVault.getMemberWeight(acc)}`)
        // console.log(`rate: ${_.getBN(await daoVault.getMemberWeight(acc)).div(_.getBN(await daoVault.totalWeight()))}`)
    })
}
async function lockWBNB(acc, amount) {
    it("It should deposit", async () => {
         let balance = await poolWBNB.balanceOf(acc)
        // await poolWBNB.approve(Dao.address, balance, { from: acc })
        await poolWBNB.approve(Dao.address, _.BN2Str(1000000*_.one), {from:acc} )
        await Dao.deposit(poolWBNB.address, amount, { from: acc })
        // console.log(`balanceA: ${balance}`)
        // console.log(`isMember: ${await Dao.isMember(acc)}`)
        // console.log(`mapMemberPool_balance: ${await daoVault.getMemberPoolBalance(acc, poolWBNB.address)}`)
        // console.log(`totalWeight: ${await daoVault.totalWeight()}`)
        // console.log(`getMemberWeight: ${await daoVault.getMemberWeight(acc)}`)
        // console.log(`rate: ${_.getBN(await daoVault.getMemberWeight(acc)).div(_.getBN(await daoVault.totalWeight()))}`)
       
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

async function withdrawBNB(acc) {
    it("It should unlock", async () => {
        let balBefore = _.getBN(await poolWBNB.balanceOf(acc))
        let balBeforeD = _.getBN(await poolWBNB.balanceOf(daoVault.address))
        console.log(_.BN2Str(balBeforeD));
        await Dao.withdraw(poolWBNB.address,{from:acc});
        let balAfter = _.getBN(await poolWBNB.balanceOf(acc))
        assert.isAbove(_.BN2Int(balAfter), _.BN2Int(balBefore))
        console.log(_.BN2Str(balAfter));
    })
}
async function withdrawTKN1(acc) {
    it("It should unlock", async () => {
        let balBefore = _.getBN(await poolTKN1.balanceOf(acc))
        let balBeforeD = _.getBN(await poolTKN1.balanceOf(daoVault.address))
        console.log(_.BN2Str(balBeforeD));
        await Dao.withdraw(poolTKN1.address, {from:acc});
        let balAfter = _.getBN(await poolTKN1.balanceOf(acc))
        assert.isAbove(_.BN2Int(balAfter), _.BN2Int(balBefore))
        console.log(_.BN2Str(balAfter));
    })
}


async function rate() {
    it("It should check rates", async () => {
        let memberCombinedWeight0 = _.getBN(await daoVault.getMemberWeight(acc0)).plus(await bondVault.getMemberWeight(acc0));
        let memberCombinedWeight1 = _.getBN(await daoVault.getMemberWeight(acc1)).plus(await bondVault.getMemberWeight(acc1));
        let memberCombinedWeight2 = _.getBN(await daoVault.getMemberWeight(acc2)).plus(await bondVault.getMemberWeight(acc2));

        let memberCombinedTotal0 = _.getBN(await daoVault.totalWeight()).plus(await bondVault.totalWeight());
        let memberCombinedTotal1 = _.getBN(await daoVault.totalWeight()).plus(await bondVault.totalWeight());
        let memberCombinedTotal2 = _.getBN(await daoVault.totalWeight()).plus(await bondVault.totalWeight());
        
    
        console.log(`acc0 rate: ${memberCombinedWeight0} ${memberCombinedWeight0.div(memberCombinedTotal0)}`)
        console.log(`acc1 rate: ${memberCombinedWeight1} ${memberCombinedWeight1.div(memberCombinedTotal1)}`)
        console.log(`acc2 rate: ${memberCombinedWeight2} ${memberCombinedWeight2.div(memberCombinedTotal2)}`)
        //console.log(`acc3 rate: ${await Dao.getMemberWeight(acc3)} ${_.getBN(await Dao.getMemberWeight(acc3)).div(_.getBN(await Dao.totalWeight()))}`)

    })
}
async function rateBond() {
    it("It should check BOnd rates", async () => {
        console.log(`acc0 rate: ${await bondVault.getMemberWeight(acc0)} ${_.getBN(await bondVault.getMemberWeight(acc0)).div(_.getBN(await bondVault.totalWeight()))}`)
        console.log(`acc1 rate: ${await bondVault.getMemberWeight(acc1)} ${_.getBN(await bondVault.getMemberWeight(acc1)).div(_.getBN(await bondVault.totalWeight()))}`)
        console.log(`acc2 rate: ${await bondVault.getMemberWeight(acc2)} ${_.getBN(await bondVault.getMemberWeight(acc2)).div(_.getBN(await bondVault.totalWeight()))}`)
        //console.log(`acc3 rate: ${await Dao.getMemberWeight(acc3)} ${_.getBN(await Dao.getMemberWeight(acc3)).div(_.getBN(await Dao.totalWeight()))}`)

    })
}

async function voteParam() {
    it("It should vote, finalise curve", async () => {
        await Dao.newParamProposal('1012', 'CURVE', { from: acc0 })
        let proposalCount = _.BN2Str(await Dao.currentProposal())
        await Dao.voteProposal( { from: acc0 })
        assert.equal(_.BN2Str(await Dao.mapPID_votes(proposalCount)), _.BN2Str(await Dao.mapPIDMember_votes(proposalCount, acc0)))
        assert.equal(await Dao.mapPID_param(proposalCount), '1012')
        await truffleAssert.reverts(Dao.finaliseProposal(), "!finalising");
        await Dao.voteProposal( { from: acc1 })
        assert.equal(await Dao.hasQuorum(proposalCount), true)
        assert.equal(await Dao.mapPID_finalising(proposalCount), true)
        await truffleAssert.reverts(Dao.finaliseProposal(), "!cool off");
        await sleep(3100)
        await Dao.finaliseProposal()
        assert.equal(await sparta.emissionCurve(), '1012')
        assert.equal(_.BN2Str(await Dao.mapPID_votes(proposalCount)), '0')
        assert.equal(await Dao.mapPID_finalising(proposalCount), false)
        assert.equal(await Dao.mapPID_finalised(proposalCount), true)
    })
    it("It should vote, cancel, then revote DURATION", async () => {
        await Dao.newParamProposal('86000', 'DURATION', { from: acc0 })
        let proposalCount = _.BN2Str(await Dao.currentProposal())
        await Dao.voteProposal( { from: acc0 })
        assert.equal(_.BN2Str(await Dao.mapPID_votes(proposalCount)), _.BN2Str(await Dao.mapPIDMember_votes(proposalCount, acc0)))
        assert.equal(await Dao.mapPID_param(proposalCount), '86000')
        await truffleAssert.reverts(Dao.finaliseProposal(proposalCount), "!finalising");
        await Dao.voteProposal({ from: acc1 })
        assert.equal(await Dao.hasQuorum(proposalCount), true)
        assert.equal(await Dao.mapPID_finalising(proposalCount), true)
        await truffleAssert.reverts(Dao.finaliseProposal(proposalCount), "!cool off");
        await sleep(3100)
        await Dao.newParamProposal('2500', 'DURATION', { from: acc0 })
        let proposalID2 = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal({ from: acc0 })
        await truffleAssert.reverts(Dao.cancelProposal({ from: acc0 }), "!minority");
        await Dao.voteProposal({ from: acc1 })
        await Dao.cancelProposal({ from: acc1 })
        await sleep(3100)
        await Dao.finaliseProposal(proposalID2)
        assert.equal(await sparta.secondsPerEra(), '2500')
        assert.equal(await Dao.secondsPerEra(), '2500')
        assert.equal(_.BN2Str(await Dao.mapPID_votes(proposalID2)), '0')
        assert.equal(await Dao.mapPID_finalising(proposalID2), false)
        assert.equal(await Dao.mapPID_finalised(proposalID2), true)
    })
    it("It should vote, finalise COOL_OFF", async () => {
        await Dao.newParamProposal('2', 'COOL_OFF', { from: acc0 })
        let proposalCount = _.BN2Str(await Dao.currentProposal())
        await Dao.voteProposal( { from: acc0 })
        assert.equal(_.BN2Str(await Dao.mapPID_votes(proposalCount)), _.BN2Str(await Dao.mapPIDMember_votes(proposalCount, acc0)))
        assert.equal(await Dao.mapPID_param(proposalCount), '2')
        await truffleAssert.reverts(Dao.finaliseProposal(), "!finalising");
        await Dao.voteProposal( { from: acc1 })
        assert.equal(await Dao.hasQuorum(proposalCount), true)
        assert.equal(await Dao.mapPID_finalising(proposalCount), true)
        await truffleAssert.reverts(Dao.finaliseProposal(), "!cool off");
        await sleep(3100)
        await Dao.finaliseProposal()
        assert.equal(await Dao.coolOffPeriod(), '2')
        assert.equal(_.BN2Str(await Dao.mapPID_votes(proposalCount)), '0')
        assert.equal(await Dao.mapPID_finalising(proposalCount), false)
        assert.equal(await Dao.mapPID_finalised(proposalCount), true)
    })
    it("It should vote, finalise ERAS_TO_EARN", async () => {
        let bal = _.getBN(await sparta.balanceOf(router.address));
        console.log(_.BN2Str(bal)/_.one);
        await Dao.newParamProposal('10', 'ERAS_TO_EARN', { from: acc0 })
        let balA = _.getBN(await sparta.balanceOf(router.address));
        await Dao.voteProposal( { from: acc1 })
        await Dao.voteProposal( { from: acc2 })
        await sleep(3100)
        await Dao.finaliseProposal()
        assert.equal(_.BN2Str(await Dao.erasToEarn()), '10')
    })
}

async function voteAction() {
    it("It should vote, get sparta", async () => {
        let bondSpartaBaLb = _.BN2Str(await sparta.balanceOf(Dao.address));
         console.log(bondSpartaBaLb/_.one);
        await Dao.newActionProposal('GET_SPARTA', { from: acc0 })
        await Dao.voteProposal({ from: acc0 })
        await Dao.removeVote()
        await sleep(3100)
        await truffleAssert.reverts(Dao.finaliseProposal(), "!finalising");
        await Dao.voteProposal( { from: acc0 })
        await Dao.voteProposal( { from: acc1 })
        await sleep(3100)
        await Dao.finaliseProposal()
        // await sparta.mintFromDAO(_.BN2Str(1000*_.one), Dao.address)
        let bondSpartaBaL = _.BN2Str(await sparta.balanceOf(Dao.address));
        // console.log(bondSpartaBaL/_.one);

    })
}

async function voteGrant() {
    it("It should GRANT", async () => {
        await Dao.newGrantProposal(acc0, '1000', { from: acc1 })
        await Dao.voteProposal({ from: acc1 })
        await Dao.voteProposal({ from: acc2 })
        // await Dao.getProposalDetails(proposalCount)
        await sleep(3100)
        let balanceBefore = _.getBN(await sparta.balanceOf(acc0))
        await Dao.finaliseProposal()
        let balanceAfter = _.getBN(await sparta.balanceOf(acc0))
        assert.equal(_.BN2Str(balanceAfter.minus(balanceBefore)), '1000')
    })
}

async function voteUtils() {
    it("It should vote UTILS", async () => {
        utils2 = await UTILS.new(sparta.address, router.address, Dao.address)
        await Dao.newAddressProposal(utils2.address, 'UTILS', { from: acc0 })
        await Dao.voteProposal({ from: acc2 })
        await Dao.voteProposal({ from: acc1 })
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


