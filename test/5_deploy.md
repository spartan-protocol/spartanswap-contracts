/*
################################################
Upgrades
################################################
*/

const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');

var VPOOL = artifacts.require("./VPool.sol");
var VFACTORY = artifacts.require("./VFactory.sol");
var TOKEN = artifacts.require("Token1");
var MATH = artifacts.require("MathContract");

var vPool; var vFactory; var token1; var POOL; var spartan;
var acc0; var acc1; var acc2; var acc3;

contract('SPARTA', function (accounts) {
    constructor(accounts)
})


//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]

    it("constructor events", async () => {

        spartan = await TOKEN.new();
        token1 = await TOKEN.new();
        coreMath = await MATH.new()

        vFactory = await VFACTORY.new(spartan.address, coreMath.address)

        console.log(`Acc0: ${acc0}`)
        console.log(`vFactory: ${vFactory.address}`)
        console.log(`spartan: ${spartan.address}`)
        console.log(`token1: ${token1.address}`)
        console.log(`coreMath: ${coreMath.address}`)

        let supply = await spartan.totalSupply()
        await spartan.approve(vFactory.address, supply, { from: acc0 })
        
        POOL = await vFactory.deployPool.call(_.BN2Str(_.one * 10), _.dot1BN, _.BNB, { value: _.dot1BN })
        await vFactory.deployPool(_.BN2Str(_.one * 10), _.dot1BN, _.BNB, { value: _.dot1BN })
        vPool = await VPOOL.at(POOL)
        
        console.log(`vPool: ${vPool.address}`)

        // await spartan.approve(vPool.address, supply, { from: acc0 })
        // await vFactory.stake()

        // let vpoolAddress = await vFactory.getPoolAddress(token1.address)
        // console.log(`vpoolAddress: ${vpoolAddress}`)

        // let BASE = await vPool.BASE()
        // console.log(`BASE: ${BASE}`)


        

    });
}





