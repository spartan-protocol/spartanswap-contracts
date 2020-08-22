const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');

var SPARTA = artifacts.require("./SpartaMinted.sol");
var SDAO = artifacts.require("./SDao.sol");
var SROUTER = artifacts.require("./SRouter.sol");
var SPOOL = artifacts.require("./SPool.sol");
var UTILS = artifacts.require("./Utils.sol");
var TOKEN1 = artifacts.require("./Token1.sol");

var sparta; var token1;  var token2; var addr1; var addr2;
var utils; var sRouter; var sRouter2; var sDao;
var sPoolETH; var sPoolTKN1; var sPoolTKN2;
var acc0; var acc1; var acc2; var acc3;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

contract('SPT', function (accounts) {

    constructor(accounts)
    createPool()
    stakeTKN1(acc1)
    lockFail()
    lockETH(acc0)
    lockTKN(acc1)
    voteRouter(acc0)
    tryToMove()

})


//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
        sparta = await SPARTA.new()
        utils = await UTILS.new()
        sDao = await SDAO.new(utils.address)
        sRouter = await SROUTER.new(sparta.address, sDao.address, utils.address)
        await utils.setGenesisDao(sDao.address)
        await sDao.setGenesisRouter(sRouter.address)
        assert.equal(await utils.DEPLOYER(), '0x0000000000000000000000000000000000000000', " deployer purged")
        assert.equal(await sDao.DEPLOYER(), '0x0000000000000000000000000000000000000000', " deployer purged")
        console.log(await utils.SDAO())
        console.log(await sDao.ROUTER())

        token1 = await TOKEN1.new();
        token2 = await TOKEN1.new();

        console.log(`Acc0: ${acc0}`)
        console.log(`sparta: ${sparta.address}`)
        console.log(`dao: ${sDao.address}`)
        console.log(`utils: ${utils.address}`)
        console.log(`sRouter: ${sRouter.address}`)
        console.log(`token1: ${token1.address}`)

        let supply = await token1.totalSupply()
        await sparta.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await sparta.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await sparta.approve(sRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await sparta.approve(sRouter.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await sparta.approve(sRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await token1.transfer(acc1, _.getBN(_.BN2Int(supply)/2))
        await token2.transfer(acc1, _.getBN(_.BN2Int(supply)/2))
        await token1.approve(sRouter.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token2.approve(sRouter.address, _.BN2Str(500000 * _.one), { from: acc1 })
    });
}

async function createPool() {
    it("It should deploy Eth Pool", async () => {
        var POOL = await sRouter.createPool.call(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        await sRouter.createPool(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        sPoolETH = await SPOOL.at(POOL)
        console.log(`Pools: ${sPoolETH.address}`)
        const spartanAddr = await sPoolETH.SPARTA()
        assert.equal(spartanAddr, sparta.address, "address is correct")
        assert.equal(_.BN2Str(await sparta.balanceOf(sPoolETH.address)), _.BN2Str(_.one * 10), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(sPoolETH.address)), _.BN2Str(_.dot1BN), 'ether balance')

        let supply = await sparta.totalSupply()
        await sparta.approve(sPoolETH.address, supply, { from: acc0 })
        await sparta.approve(sPoolETH.address, supply, { from: acc1 })
    })

    it("It should deploy TKN1 Pools", async () => {

        await token1.approve(sRouter.address, '-1', { from: acc0 })
        var POOL = await sRouter.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        await sRouter.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        sPoolTKN1 = await SPOOL.at(POOL)
        console.log(`Pools1: ${sPoolTKN1.address}`)
        const spartanAddr = await sPoolTKN1.SPARTA()
        assert.equal(spartanAddr, sparta.address, "address is correct")

        await sparta.approve(sPoolTKN1.address, '-1', { from: acc0 })
        await sparta.approve(sPoolTKN1.address, '-1', { from: acc1 })
        await token1.approve(sPoolTKN1.address, '-1', { from: acc0 })
        await token1.approve(sPoolTKN1.address, '-1', { from: acc1 })
    })
    it("It should deploy TKN2 Pools", async () => {

        await token2.approve(sRouter.address, '-1', { from: acc0 })
        var POOL = await sRouter.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token2.address)
        await sRouter.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token2.address)
        sPoolTKN2 = await SPOOL.at(POOL)
        console.log(`Pools2: ${sPoolTKN2.address}`)
        const spartanAddr = await sPoolTKN2.SPARTA()
        assert.equal(spartanAddr, sparta.address, "address is correct")

        await sparta.approve(sPoolTKN2.address, '-1', { from: acc0 })
        await sparta.approve(sPoolTKN2.address, '-1', { from: acc1 })
        await token2.approve(sPoolTKN2.address, '-1', { from: acc0 })
        await token2.approve(sPoolTKN2.address, '-1', { from: acc1 })
    })
}

async function stakeTKN1(acc) {
    it("It should lock", async () => {
        await sRouter.stake(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address, { from: acc})
    })
}

async function lockFail() {
    it("It should revert for not pool", async () => {
        let balance = await token1.balanceOf(acc0)
        await token1.approve(sDao.address, balance)
        await truffleAssert.reverts(sDao.lock(token1.address, balance, { from: acc0 }));
    })
    it("It should revert for no balance", async () => {
        let balance = await token1.balanceOf(acc1)
        await token1.approve(sDao.address, balance)
        await truffleAssert.reverts(sDao.lock(token1.address, balance, { from: acc1 }));
    })
}

async function lockETH(acc) {
    it("It should lock", async () => {
        let balance = await sPoolETH.balanceOf(acc)
        // await sPoolETH.approve(sDao.address, balance, { from: acc })
        await sDao.lock(sPoolETH.address, balance, { from: acc })
        console.log(`isMember: ${await sDao.isMember(acc)}`)
        console.log(`mapMemberPool_Balance: ${await sDao.mapMemberPool_Balance(acc, _.ETH)}`)
        console.log(`totalWeight: ${await sDao.totalWeight()}`)
        console.log(`mapMember_Weight: ${await sDao.mapMember_Weight(acc)}`)
    })
}

async function lockTKN(acc) {
    it("It should lock", async () => {
        let balance = await sPoolTKN1.balanceOf(acc)
        // console.log(`balance: ${balance}`)
        // await sPoolTKN1.approve(sDao.address, balance, { from: acc })
        await sDao.lock(sPoolTKN1.address, balance, { from: acc })
        console.log(`isMember: ${await sDao.isMember(acc)}`)
        console.log(`mapMemberPool_Balance: ${await sDao.mapMemberPool_Balance(acc, _.ETH)}`)
        console.log(`totalWeight: ${await sDao.totalWeight()}`)
        console.log(`mapMember_Weight: ${await sDao.mapMember_Weight(acc)}`)
    })
}

async function voteRouter() {
    it("It should vote", async () => {
        sRouter2 = await SROUTER.new(sparta.address, sDao.address, utils.address)
        console.log(`sRouter2: ${sRouter2.address}`)
        await sDao.voteRouterChange(sRouter2.address, { from: acc0 })
        console.log(`mapRouter_Votes: ${await sDao.mapRouter_Votes(sRouter2.address)}`)
        console.log(`mapRouterMember_Votes: ${await sDao.mapRouterMember_Votes(sRouter2.address, acc0)}`)
        console.log(`checkQuorumRouter: ${await sDao.checkQuorumRouter(sRouter2.address)}`)
        console.log(`proposedRouter: ${await sDao.proposedRouter()}`)
        console.log(`proposedRouterChange: ${await sDao.proposedRouterChange()}`)
        console.log(`routerChangeStart: ${await sDao.routerChangeStart()}`)
    })
    it("It should vote again", async () => {
        await sDao.voteRouterChange(sRouter2.address, { from: acc1 })
        console.log(`mapRouter_Votes: ${await sDao.mapRouter_Votes(sRouter2.address)}`)
        console.log(`mapRouterMember_Votes: ${await sDao.mapRouterMember_Votes(sRouter2.address, acc1)}`)
        console.log(`checkQuorumRouter: ${await sDao.checkQuorumRouter(sRouter2.address)}`)
        console.log(`proposedRouter: ${await sDao.proposedRouter()}`)
        console.log(`proposedRouterChange: ${await sDao.proposedRouterChange()}`)
        console.log(`routerChangeStart: ${await sDao.routerChangeStart()}`)
    })
}

async function tryToMove() {
    it("It should move again", async () => {
        await sDao.moveRouter()
        console.log(`mapRouter_Votes: ${await sDao.mapRouter_Votes(sRouter2.address)}`)
        console.log(`mapRouterMember_Votes: ${await sDao.mapRouterMember_Votes(sRouter2.address, acc1)}`)
        console.log(`checkQuorumRouter: ${await sDao.checkQuorumRouter(sRouter2.address)}`)
        console.log(`proposedRouter: ${await sDao.proposedRouter()}`)
        console.log(`proposedRouterChange: ${await sDao.proposedRouterChange()}`)
        console.log(`routerChangeStart: ${await sDao.routerChangeStart()}`)
    })
    it("It should try to move again", async () => {
        await sleep(2000)
        await sDao.moveRouter()
        console.log(`mapRouter_Votes: ${await sDao.mapRouter_Votes(sRouter2.address)}`)
        console.log(`mapRouterMember_Votes: ${await sDao.mapRouterMember_Votes(sRouter2.address, acc1)}`)
        console.log(`checkQuorumRouter: ${await sDao.checkQuorumRouter(sRouter2.address)}`)
        console.log(`proposedRouter: ${await sDao.proposedRouter()}`)
        console.log(`proposedRouterChange: ${await sDao.proposedRouterChange()}`)
        console.log(`routerChangeStart: ${await sDao.routerChangeStart()}`)
    })
}