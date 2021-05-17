const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');
const web3Abi = require('web3-eth-abi');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');

var DAO = artifacts.require("./Dao.sol");
var SPARTA = artifacts.require("./Sparta.sol");
var FSPARTANS = artifacts.require("./FallenSpartans.sol");
var UTILS = artifacts.require("./Utils.sol");
var TOKEN = artifacts.require("./Token1.sol");
var RESERVE = artifacts.require("./Reserve.sol");
var DAOVAULT = artifacts.require("./DaoVault.sol");

contract('DAO DEPOSIT', function (accounts) {
    constructor(accounts)
    deposit(acc)
 
    

})


function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
        sparta = await SPARTA.new(acc0) // deploy sparta v2
        Dao = await DAO.new(sparta.address)     // deploy daoV2
        fSpartans = await FSPARTANS.new(sparta.address) // deploy fallen spartans
        utils = await UTILS.new(sparta.address) // deploy utilsV2
        token1 = await TOKEN.new()    
        reserve = await RESERVE.new(sparta.address) // deploy reserve 
        daoVault = await DAOVAULT.new(sparta.address); // deploy daoVault

        await Dao.setGenesisAddresses(utils.address,reserve.address, daoVault.address);
        await sparta.changeDAO(Dao.address)

        await sparta.transfer(acc1, _.getBN(_.BN2Str(10000 * _.one)))
        await sparta.transfer(acc2, _.getBN(_.BN2Str(10000 * _.one)))
        await token1.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))

    });

} 

function deposit(acc){
    it("constructor events", async () => {

    });
}