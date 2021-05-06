const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');

var BASE = artifacts.require("./Base.sol");
var SPARTA = artifacts.require("./Sparta.sol");
var FSPARTANS = artifacts.require("./FallenSpartans.sol");
var UTILS = artifacts.require("./Utils.sol");


contract('ADD LIQUIDITY', function (accounts) {

    constructor(accounts)
    upgradeSparta(acc1) 
    upgradeSparta(acc2) 
 

})

function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
        base = await BASE.new() // deploy sparta v1
        sparta = await SPARTA.new(base.address) // deploy sparta v2
        fSpartans = await FSPARTANS.new(sparta.address) // deploy fallen spartans
        utils = await UTILS.new(base.address) // deploy utilsV2

        await base.transfer(acc1, _.getBN(_.BN2Str(123400 * _.one)))
        await base.transfer(acc2, _.getBN(_.BN2Str(1087680 * _.one)))

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