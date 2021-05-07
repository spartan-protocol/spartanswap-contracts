const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');
const web3Abi = require('web3-eth-abi');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');

var BASE = artifacts.require("./Base.sol");
var VAULT = artifacts.require("./TestVault.sol")
var DAO = artifacts.require("./Dao.sol");
var DAOVAULT = artifacts.require("./DaoVault.sol");
var SPARTA = artifacts.require("./Sparta.sol");
var FSPARTANS = artifacts.require("./FallenSpartans.sol");
var UTILS = artifacts.require("./Utils.sol");
var TOKEN = artifacts.require("./Token1.sol");


contract('ADD LIQUIDITY', function (accounts) {
    constructor(accounts)
    upgradeSparta(acc1) 
    upgradeSparta(acc2) 
    flipMInt() 
    daoMINT(acc3)
    flipEmission() 
    sFS()
    approveAndTransfer(acc1)
    

})

function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
        base = await BASE.new() // deploy sparta v1
        sparta = await SPARTA.new(base.address) // deploy sparta v2
        Dao = await DAO.new(base.address)     // deploy daoV2
        daoVault = await DAOVAULT.new(base.address);
        fSpartans = await FSPARTANS.new(sparta.address) // deploy fallen spartans
        utils = await UTILS.new(base.address) // deploy utilsV2
        vault = await VAULT.new(base.address) // deploy utilsV2
        token1 = await TOKEN.new()    

        await Dao.setGenesisAddresses(utils.address, utils.address, utils.address, daoVault.address,utils.address, utils.address, utils.address);
        await sparta.changeDAO(Dao.address)

        await base.transfer(acc1, _.getBN(_.BN2Str(123400 * _.one)))
        await base.transfer(acc2, _.getBN(_.BN2Str(1087680 * _.one)))
        await token1.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))

    });
}

async function upgradeSparta(acc) {
    it("It should upgrade sparta v1 - v2", async () => {
        let balance = _.BN2Str(await base.balanceOf(acc));
        let sbalance = _.BN2Str(await sparta.balanceOf(acc));
        await base.approve(sparta.address, _.BN2Str(20000000*_.one), {from:acc})
        await sparta.upgrade({from:acc});
        let balanceA = _.BN2Str(await base.balanceOf(acc));
        let sbalanceA = _.BN2Str(await sparta.balanceOf(acc));

        assert.equal(_.BN2Str(balanceA), _.BN2Str(sbalance))
        assert.equal(_.BN2Str(balance), _.BN2Str(sbalanceA))
    })
}
async function daoMINT(acc) {
    it("It should mint some sparta", async () => {
        // await base.approve(sparta.address, _.BN2Str(20000000*_.one), {from:acc})
        await sparta.daoMint(_.BN2Str(5 *10**6*_.one), acc,{from :acc0});
        let sbalanceA = _.BN2Str(await sparta.balanceOf(acc));
        assert.equal(_.BN2Str(sbalanceA), _.BN2Str(5 *10**6*_.one))
    })
}
async function flipMInt() {
    it("It should flip minting", async () => {
        // await base.approve(sparta.address, _.BN2Str(20000000*_.one), {from:acc})
        let minting = await sparta.minting()
        await sparta.flipMinting();
        let mintingA = await sparta.minting()
        assert.equal(minting, false)
        assert.equal(mintingA, true)
    
    })
}
async function flipEmission() {
    it("It should flip Emissions", async () => {
        // await base.approve(sparta.address, _.BN2Str(20000000*_.one), {from:acc})
        let minting = await sparta.emitting()
        await sparta.flipEmissions();
        let mintingA = await sparta.emitting()
        assert.equal(minting, false)
        assert.equal(mintingA, true)
    
    })
}
async function sFS() {
    it("It should save spartans", async () => {
        let sbalance = _.BN2Str(await sparta.balanceOf(fSpartans.address));
        await sparta.saveFS(fSpartans.address, {from:acc0});
        let sbalanceA = _.BN2Str(await sparta.balanceOf(fSpartans.address));
        assert.equal(_.BN2Str(sbalanceA), _.BN2Str(10 * 10**6 * 10**18))
    })
}
async function approveAndTransfer(acc) {
    it("It should approveAndTransfer", async () => {
        let basApproval = _.BN2Str(await sparta.allowance(acc,vault.address,  {from:acc}))
        console.log(basApproval/_.one);
     
       let deposit = web3Abi.encodeFunctionCall(
        {
            "constant": false,
            "inputs": [
                {
                   "name": "token",
                   "type": "address"
                },
                {
                  "name": "amount",
                  "type": "uint256"
                },
                {
                   "name": "member",
                   "type": "address"
                }
            ],
            "name": "deposit",
            "outputs": [],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        }, [sparta.address,_.BN2Str(1*_.one),acc]
    );

           await sparta.approveAndCall(vault.address,deposit,{from:acc})

           let basApprovalA = _.BN2Str(await sparta.allowance(acc,vault.address,  {from:acc}))
        console.log(basApprovalA/_.one);


          assert.equal(_.BN2Str(await sparta.balanceOf(vault.address)), _.BN2Str(1*_.one))

         await vault.deposit(sparta.address,_.BN2Str(1*_.one), acc,{from:acc})

         assert.equal(_.BN2Str(await sparta.balanceOf(vault.address)), _.BN2Str(2*_.one))

      
    })
}
