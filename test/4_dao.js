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

var base; var token1;  var token2; var addr1; var addr2;
var utils; var utils2; var router; var router2; var Dao; var Dao2;
var poolETH; var poolTKN1; var poolTKN2;
var acc0; var acc1; var acc2; var acc3;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

contract('SPT', function (accounts) {

    constructor(accounts)
    createPool()
    stakeTKN1(acc1)
    swapPassR1(acc0, _.BN2Str(_.one * 10))
    lockFail()
    lockETH(acc0)
    lockTKN(acc1)

    voteRouter(acc0)
    tryToMove()
    swapFail(acc0, _.BN2Str(_.one * 10))
    swapPassR2(acc0, _.BN2Str(_.one * 10))

    voteUtils(acc0)
    tryToMove()
    swapFail(acc0, _.BN2Str(_.one * 10))
    swapPassR2(acc0, _.BN2Str(_.one * 10))

    // voteDao(acc0)
    // tryToMoveDao()
    // swapPassR2(acc0, _.BN2Str(_.one * 10))

})


//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
        base = await BASE.new()
        utils = await UTILS.new(base.address)
        Dao = await DAO.new(base.address)
        router = await ROUTER.new(base.address)
        await base.changeDAO(Dao.address)
        await Dao.setGenesisAddresses(router.address, utils.address)
        // await Dao.purgeDeployer()
        // assert.equal(await Dao.DEPLOYER(), '0x0000000000000000000000000000000000000000', " deployer purged")
        console.log(await utils.BASE())
        console.log(await Dao.ROUTER())

        token1 = await TOKEN1.new();
        token2 = await TOKEN1.new();

        console.log(`Acc0: ${acc0}`)
        console.log(`base: ${base.address}`)
        console.log(`dao: ${Dao.address}`)
        console.log(`utils: ${utils.address}`)
        console.log(`router: ${router.address}`)
        console.log(`token1: ${token1.address}`)

        let supply = await token1.totalSupply()
        await base.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await token1.transfer(acc1, _.getBN(_.BN2Int(supply)/2))
        await token2.transfer(acc1, _.getBN(_.BN2Int(supply)/2))
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token2.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
    });
}

async function createPool() {
    it("It should deploy Eth Pool", async () => {
        var _pool = await router.createPool.call(_.BN2Str(_.one * 10), _.dot1BN, _.BNB, { value: _.dot1BN })
        await router.createPool(_.BN2Str(_.one * 10), _.dot1BN, _.BNB, { value: _.dot1BN })
        poolETH = await POOL.at(_pool)
        console.log(`Pools: ${poolETH.address}`)
        const baseAddr = await poolETH.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        assert.equal(_.BN2Str(await base.balanceOf(poolETH.address)), _.BN2Str(_.one * 10), 'base balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(poolETH.address)), _.BN2Str(_.dot1BN), 'ether balance')

        let supply = await base.totalSupply()
        await base.approve(poolETH.address, supply, { from: acc0 })
        await base.approve(poolETH.address, supply, { from: acc1 })
    })

    it("It should deploy TKN1 Pools", async () => {

        await token1.approve(router.address, '-1', { from: acc0 })
        var _pool = await router.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        await router.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        poolTKN1 = await POOL.at(_pool)
        console.log(`Pools1: ${poolTKN1.address}`)
        const baseAddr = await poolTKN1.BASE()
        assert.equal(baseAddr, base.address, "address is correct")

        await base.approve(poolTKN1.address, '-1', { from: acc0 })
        await base.approve(poolTKN1.address, '-1', { from: acc1 })
        await token1.approve(poolTKN1.address, '-1', { from: acc0 })
        await token1.approve(poolTKN1.address, '-1', { from: acc1 })
    })
    it("It should deploy TKN2 Pools", async () => {

        await token2.approve(router.address, '-1', { from: acc0 })
        var _pool = await router.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token2.address)
        await router.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token2.address)
        poolTKN2 = await POOL.at(_pool)
        console.log(`Pools2: ${poolTKN2.address}`)
        const baseAddr = await poolTKN2.BASE()
        assert.equal(baseAddr, base.address, "address is correct")

        await base.approve(poolTKN2.address, '-1', { from: acc0 })
        await base.approve(poolTKN2.address, '-1', { from: acc1 })
        await token2.approve(poolTKN2.address, '-1', { from: acc0 })
        await token2.approve(poolTKN2.address, '-1', { from: acc1 })
    })
}

async function stakeTKN1(acc) {
    it("It should deposit", async () => {
        await router.stake(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address, { from: acc})
    })
}

async function lockFail() {
    it("It should revert for not pool", async () => {
        let balance = await token1.balanceOf(acc0)
        await token1.approve(Dao.address, balance)
        await truffleAssert.reverts(Dao.deposit(token1.address, balance, { from: acc0 }));
    })
    it("It should revert for no balance", async () => {
        let balance = await token1.balanceOf(acc1)
        await token1.approve(Dao.address, balance)
        await truffleAssert.reverts(Dao.deposit(token1.address, balance, { from: acc1 }));
    })
}

async function lockETH(acc) {
    it("It should deposit", async () => {
        let balance = await poolETH.balanceOf(acc)
        // await poolETH.approve(Dao.address, balance, { from: acc })
        await Dao.deposit(poolETH.address, balance, { from: acc })
        console.log(`isMember: ${await Dao.isMember(acc)}`)
        console.log(`mapMemberPool_balance: ${await Dao.mapMemberPool_balance(acc, poolETH.address)}`)
        console.log(`totalWeight: ${await Dao.totalWeight()}`)
        console.log(`mapMember_weight: ${await Dao.mapMember_weight(acc)}`)
    })
}

async function lockTKN(acc) {
    it("It should deposit", async () => {
        let balance = await poolTKN1.balanceOf(acc)
        // console.log(`balance: ${balance}`)
        // await poolTKN1.approve(Dao.address, balance, { from: acc })
        await Dao.deposit(poolTKN1.address, balance, { from: acc })
        console.log(`isMember: ${await Dao.isMember(acc)}`)
        console.log(`mapMemberPool_balance: ${await Dao.mapMemberPool_balance(acc, poolETH.address)}`)
        console.log(`totalWeight: ${await Dao.totalWeight()}`)
        console.log(`mapMember_weight: ${await Dao.mapMember_weight(acc)}`)
    })
}

async function voteRouter() {
    it("It should vote", async () => {
        router2 = await ROUTER.new(base.address)
        await router2.migrateRouterData(router.address);
        await router2.migrateTokenData(router.address);
        console.log(`router2: ${router2.address}`)
        await Dao.newAddressProposal(router2.address, 'ROUTER', { from: acc0 })
        let proposalID = _.BN2Str(await Dao.proposalID())
        await Dao.voteProposal(proposalID, { from: acc0 })
        console.log(`mapPID_type: ${await Dao.mapPID_type(proposalID)}`)
        console.log(`mapAddress_votes: ${await Dao.mapPID_votes(proposalID)}`)
        console.log(`mapAddressMember_votes: ${await Dao.mapPIDMember_votes(proposalID, acc0)}`)
        console.log(`hasQuorum: ${await Dao.hasQuorum(proposalID)}`)
        console.log(`proposedAddress: ${await Dao.mapPID_address(proposalID)}`)
        console.log(`mapPID_finalising: ${await Dao.mapPID_finalising(proposalID)}`)
        console.log(`mapPID_timeStart: ${await Dao.mapPID_timeStart(proposalID)}`)
    })
    it("It should vote again", async () => {
        let proposalID = _.BN2Str(await Dao.proposalID())
        await Dao.voteProposal(proposalID, { from: acc1 })
        console.log(`mapAddress_votes: ${await Dao.mapPID_votes(proposalID)}`)
        console.log(`mapAddressMember_votes: ${await Dao.mapPIDMember_votes(proposalID, acc0)}`)
        console.log(`hasQuorum: ${await Dao.hasQuorum(proposalID)}`)
        console.log(`proposedRouter: ${await Dao.mapPID_address(proposalID)}`)
        console.log(`mapPID_finalising: ${await Dao.mapPID_finalising(proposalID)}`)
        console.log(`mapPID_timeStart: ${await Dao.mapPID_timeStart(proposalID)}`)
    })
}

async function tryToMove() {
    it("It should move", async () => {
        let proposalID = _.BN2Str(await Dao.proposalID())
        await truffleAssert.reverts(Dao.finaliseProposal(proposalID));
        console.log(`mapAddress_votes: ${await Dao.mapPID_votes(proposalID)}`)
        console.log(`mapAddressMember_votes: ${await Dao.mapPIDMember_votes(proposalID, acc0)}`)
        console.log(`hasQuorum: ${await Dao.hasQuorum(proposalID)}`)
        console.log(`proposedRouter: ${await Dao.mapPID_address(proposalID)}`)
        console.log(`mapPID_finalising: ${await Dao.mapPID_finalising(proposalID)}`)
        console.log(`mapPID_timeStart: ${await Dao.mapPID_timeStart(proposalID)}`)
        console.log(`mapPID_finalised: ${await Dao.mapPID_finalised(proposalID)}`)
        console.log(`ROUTER: ${await Dao.ROUTER()}`)
    })
    it("It should try to move again", async () => {
        await sleep(2000)
        let proposalID = _.BN2Str(await Dao.proposalID())
        await Dao.finaliseProposal(proposalID);
        console.log(`mapAddress_votes: ${await Dao.mapPID_votes(proposalID)}`)
        console.log(`mapAddressMember_votes: ${await Dao.mapPIDMember_votes(proposalID, acc0)}`)
        console.log(`hasQuorum: ${await Dao.hasQuorum(proposalID)}`)
        console.log(`proposedRouter: ${await Dao.mapPID_address(proposalID)}`)
        console.log(`mapPID_finalising: ${await Dao.mapPID_finalising(proposalID)}`)
        console.log(`mapPID_timeStart: ${await Dao.mapPID_timeStart(proposalID)}`)
        console.log(`mapPID_finalised: ${await Dao.mapPID_finalised(proposalID)}`)
        console.log(`ROUTER: ${await Dao.ROUTER()}`)
    })
}

async function voteUtils() {
    it("It should vote", async () => {
        utils2 = await UTILS.new(base.address)
        console.log(`utils2: ${utils2.address}`)
        await Dao.newAddressProposal(utils2.address, 'UTILS', { from: acc0 })
        let proposalID = _.BN2Str(await Dao.proposalID())
        await Dao.voteProposal(proposalID, { from: acc0 })
        console.log(`mapPID_type: ${await Dao.mapPID_type(proposalID)}`)
        console.log(`mapAddress_votes: ${await Dao.mapPID_votes(proposalID)}`)
        console.log(`mapAddressMember_votes: ${await Dao.mapPIDMember_votes(proposalID, acc0)}`)
        console.log(`hasQuorum: ${await Dao.hasQuorum(proposalID)}`)
        console.log(`proposedAddress: ${await Dao.mapPID_address(proposalID)}`)
        console.log(`mapPID_finalising: ${await Dao.mapPID_finalising(proposalID)}`)
        console.log(`mapPID_timeStart: ${await Dao.mapPID_timeStart(proposalID)}`)
    })
    it("It should vote again", async () => {
        let proposalID = _.BN2Str(await Dao.proposalID())
        await Dao.voteProposal(proposalID, { from: acc1 })
        console.log(`mapPID_type: ${await Dao.mapPID_type(proposalID)}`)
        console.log(`mapAddress_votes: ${await Dao.mapPID_votes(proposalID)}`)
        console.log(`mapAddressMember_votes: ${await Dao.mapPIDMember_votes(proposalID, acc0)}`)
        console.log(`hasQuorum: ${await Dao.hasQuorum(proposalID)}`)
        console.log(`proposedAddress: ${await Dao.mapPID_address(proposalID)}`)
        console.log(`mapPID_finalising: ${await Dao.mapPID_finalising(proposalID)}`)
        console.log(`mapPID_timeStart: ${await Dao.mapPID_timeStart(proposalID)}`)
    })
}

// async function tryToMoveUtils() {
//     // it("It should move again", async () => {
//     //     await truffleAssert.reverts(Dao.moveAddress('UTILS'));
//     //     console.log(`mapAddress_votes: ${await Dao.mapAddress_votes(utils2.address)}`)
//     //     console.log(`mapAddressMember_votes: ${await Dao.mapAddressMember_votes(utils2.address, acc1)}`)
//     //     console.log(`hasQuorum: ${await Dao.hasQuorum(utils2.address)}`)
//     //     console.log(`proposedRouter: ${await Dao.proposedRouter()}`)
//     //     console.log(`proposedRouterChange: ${await Dao.proposedRouterChange()}`)
//     //     console.log(`routerChangeStart: ${await Dao.routerChangeStart()}`)
//     //     console.log(`routerHasMoved: ${await Dao.routerHasMoved()}`)
//     //     console.log(`UTILS: ${await Dao.UTILS()}`)
//     // })
//     it("It should try to move again", async () => {
//         await sleep(2000)
//         await Dao.moveAddress('UTILS')
//         console.log(`mapAddress_votes: ${await Dao.mapAddress_votes(utils2.address)}`)
//         console.log(`mapAddressMember_votes: ${await Dao.mapAddressMember_votes(utils2.address, acc1)}`)
//         console.log(`hasQuorum: ${await Dao.hasQuorum(utils2.address)}`)
//         console.log(`proposedRouter: ${await Dao.proposedRouter()}`)
//         console.log(`proposedRouterChange: ${await Dao.proposedRouterChange()}`)
//         console.log(`routerChangeStart: ${await Dao.routerChangeStart()}`)
//         console.log(`routerHasMoved: ${await Dao.routerHasMoved()}`)
//         console.log(`UTILS: ${await Dao.UTILS()}`)
//     })
// }

async function swapPassR1(acc, b) {

    it(`It should buy BNB with BASE from ${acc}`, async () => {
        console.log(`base: ${await utils.BASE()}`)
        console.log(`DAO: ${await base.DAO()}`)
        console.log(`ROUTER: ${await Dao.ROUTER()}`)
        await _passSwap(acc, b, router)
        await help.logPool(utils, _.BNB, 'BNB')
        
    })
}

async function swapPassR2(acc, b) {

    it(`It should buy BNB with BASE from ${acc}`, async () => {
        console.log(`base: ${await utils.BASE()}`)
        console.log(`DAO: ${await base.DAO()}`)
        console.log(`ROUTER: ${await Dao.ROUTER()}`)
        await _passSwap(acc, b, router2)
        await help.logPool(utils, _.BNB, 'BNB')

    })
}

async function _passSwap(acc, b, router) {

    it(`It should buy BNB with BASE from ${acc}`, async () => {
        let token = _.BNB
        let poolData = await utils.getPoolData(token);
        const B = _.getBN(poolData.baseAmt)
        const T = _.getBN(poolData.tokenAmt)
        console.log('start data', _.BN2Str(B), _.BN2Str(T))

        let t = math.calcSwapOutput(b, B, T)
        let fee = math.calcSwapFee(b, B, T)
        console.log(_.BN2Str(t), _.BN2Str(T), _.BN2Str(B), _.BN2Str(b), _.BN2Str(fee))
        
        let tx = await router.buy(b, _.BNB)
        poolData = await utils.getPoolData(token);

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(b))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(t))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str(poolData.tokenAmt), _.BN2Str(T.minus(t)))
        assert.equal(_.BN2Str(poolData.baseAmt), _.BN2Str(B.plus(b)))

        assert.equal(_.BN2Str(await web3.eth.getBalance(poolETH.address)), _.BN2Str(T.minus(t)), 'ether balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolETH.address)), _.BN2Str(B.plus(b)), 'base balance')

        
        
    })
}

async function swapFail(acc, b) {
    it("It should revert for old router", async () => {
        await truffleAssert.reverts(router.buy(b, _.BNB));
    })
}

async function voteDao() {
    it("It should vote", async () => {
        Dao2 = await DAO.new(base.address)
        await Dao2.setGenesisAddresses(router2.address, utils.address)
        console.log(`Dao2: ${Dao2.address}`)
        await Dao.voteAddressChange(Dao2.address, 'DAO', { from: acc0 })
        console.log(`mapAddress_votes: ${await Dao.mapAddress_votes(Dao2.address)}`)
        console.log(`mapAddressMember_votes: ${await Dao.mapAddressMember_votes(Dao2.address, acc0)}`)
        console.log(`hasQuorum: ${await Dao.hasQuorum(Dao2.address)}`)
        console.log(`proposedDao: ${await Dao.proposedDao()}`)
        console.log(`proposedDaoChange: ${await Dao.proposedDaoChange()}`)
        console.log(`daoChangeStart: ${await Dao.daoChangeStart()}`)
    })
    it("It should vote again", async () => {
        await Dao.voteAddressChange(Dao2.address, 'DAO', { from: acc1 })
        console.log(`mapAddress_votes: ${await Dao.mapAddress_votes(Dao2.address)}`)
        console.log(`mapAddressMember_votes: ${await Dao.mapAddressMember_votes(Dao2.address, acc1)}`)
        console.log(`hasQuorum: ${await Dao.hasQuorum(Dao2.address)}`)
        console.log(`proposedDao: ${await Dao.proposedDao()}`)
        console.log(`proposedDaoChange: ${await Dao.proposedDaoChange()}`)
        console.log(`daoChangeStart: ${await Dao.daoChangeStart()}`)
    })
}

async function tryToMoveDao() {
    it("It should revert for address(0)", async () => {
        await truffleAssert.reverts(Dao.moveAddress('DAO'));
    })
    it("It should move again", async () => {
        await truffleAssert.reverts(Dao.moveAddress('DAO'));
        console.log(`mapAddress_votes: ${await Dao.mapAddress_votes(Dao2.address)}`)
        console.log(`mapAddressMember_votes: ${await Dao.mapAddressMember_votes(Dao2.address, acc1)}`)
        console.log(`hasQuorum: ${await Dao.hasQuorum(Dao2.address)}`)
        console.log(`proposedDao: ${await Dao.proposedDao()}`)
        console.log(`proposedDaoChange: ${await Dao.proposedDaoChange()}`)
        console.log(`daoChangeStart: ${await Dao.daoChangeStart()}`)
        console.log(`daoHasMoved: ${await Dao.daoHasMoved()}`)
        console.log(`DAO: ${await Dao.DAO()}`)
    })
    it("It should try to move again", async () => {
        await sleep(2000)
        await Dao.moveAddress('DAO')
        console.log(`mapAddress_votes: ${await Dao.mapAddress_votes(Dao2.address)}`)
        console.log(`mapAddressMember_votes: ${await Dao.mapAddressMember_votes(Dao2.address, acc1)}`)
        console.log(`hasQuorum: ${await Dao.hasQuorum(Dao2.address)}`)
        console.log(`proposedDao: ${await Dao.proposedDao()}`)
        console.log(`proposedDaoChange: ${await Dao.proposedDaoChange()}`)
        console.log(`daoChangeStart: ${await Dao.daoChangeStart()}`)
        console.log(`daoHasMoved: ${await Dao.daoHasMoved()}`)
        console.log(`DAO: ${await Dao.DAO()}`)
    })
}