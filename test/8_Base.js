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
    baseParams()
    upgradeSparta(acc1) 
    burnFroms()
 
    
    Approve(acc1, _.BN2Str(25*_.one))
    increaseAllowance(acc1,  _.BN2Str(15*_.one))
    decreaseAllowance(acc1,  _.BN2Str(20*_.one))
    transferFrom(acc1) 
    approveMax(acc1)
    approveMax(acc1)
    approveAndTransfer(acc1)
    transferFromAfter(acc1) 

  
    upgradeSparta(acc2) 
    flipMInt() 
    daoMINT(acc3)
    flipEmission() 
    sFS()
     Emissions()
    feeONTransfer(_.BN2Str(20*_.one))
  //  approveAndTransfer(acc1)
    

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

        await Dao.setGenesisAddresses(utils.address, utils.address, utils.address, daoVault.address,utils.address, utils.address, acc3);
        await sparta.changeDAO(Dao.address)

        await base.transfer(acc1, _.getBN(_.BN2Str(10000 * _.one)))
        await base.transfer(acc0, _.getBN(_.BN2Str(10000 * _.one)))
        await base.transfer(acc2, _.getBN(_.BN2Str(10000 * _.one)))
        await token1.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))

    });
}

// test approve little
// test increase/decrease approvals
// then test transferFrom (should change approvals)

// test approve max
// then test approve max again
// then test transferFrom (should not change approvals)

async function baseParams(){
    it("Should deploy", async function() {
        expect(await sparta.name()).to.equal("Spartan Protocol Token V2");
        expect(await sparta.symbol()).to.equal("SPARTA");
        expect(_.BN2Str(await sparta.decimals())).to.equal('18');
        expect(_.BN2Str(await sparta.totalSupply())).to.equal('0');
        expect(_.BN2Str(await sparta.maxSupply())).to.equal(_.BN2Str(300000000 * _.one));
        expect(_.BN2Str(await sparta.emissionCurve())).to.equal('2048');
        expect(await sparta.emitting()).to.equal(false);
        // expect(_.BN2Str(await sparta.secondsPerEra())).to.equal('1');
        // console.log(BN2Str(await sparta.nextEraTime()));
         expect(await sparta.DAO()).to.equal(Dao.address);

        expect(_.BN2Str(await sparta.getDailyEmission())).to.equal(_.BN2Str('0'));
      });
}

async function burnFroms(){
it("Should transfer From", async function() {
    await sparta.approve(acc2, "1000", {from:acc1}) 
    expect(_.BN2Str(await sparta.allowance(acc1, acc2))).to.equal('1000');
    await sparta.transferFrom(acc1, acc2, "1000", {from:acc2})
    expect(_.BN2Str(await sparta.balanceOf(acc2))).to.equal('1000');
  });
  it("Should burn", async function() {
    await sparta.burn("500", {from:acc2})
    expect(_.BN2Str(await sparta.balanceOf(acc2))).to.equal('500');
    expect(_.BN2Str(await sparta.totalSupply())).to.equal(_.BN2Str('9999999999999999999500'));

  });
  it("Should burn from", async function() {
    await sparta.approve(acc2, "500", {from:acc2}) 
    expect(_.BN2Str(await sparta.allowance(acc2, acc2))).to.equal('500');
    await sparta.burnFrom(acc2, "500", {from:acc2})
    expect(_.BN2Str(await sparta.balanceOf(acc2))).to.equal('0');
    expect(_.BN2Str(await sparta.totalSupply())).to.equal(_.BN2Str('9999999999999999999000'));

  });
}
async function Approve(acc, amount) {
    it("It should approve amount", async () => {
       let allowance = _.getBN(await sparta.allowance(acc, vault.address , {from:acc}))
       await sparta.approve(vault.address, amount, {from:acc})
       let allowanceA = _.BN2Str(await sparta.allowance(acc, vault.address , {from:acc}))
       assert.equal(_.BN2Str(allowanceA), _.BN2Str(allowance.plus(amount)))

    })
}


async function Emissions(){
    it("Should emit properly", async function() {
        // console.log("Total Supply ",_.BN2Str(await sparta.totalSupply()))
        // console.log("maxSupply ", _.BN2Str(await sparta.maxSupply()))
  

        // console.log("Daily Emissions ",_.BN2Str(await sparta.getDailyEmission()))
        // console.log("Total Supply ",_.BN2Str(await sparta.totalSupply()))
        expect(_.BN2Str(await sparta.getDailyEmission())).to.equal(_.BN2Str('14667968749999999999999'));
         await sleep(10000)
        await sparta.transfer(acc0, _.BN2Str(100 * _.one), {from:acc1})
        await sparta.transfer(acc1, _.BN2Str(100 * _.one), {from:acc0})
        expect(_.BN2Str(await sparta.balanceOf(acc3))).to.equal(_.BN2Str('5014667968749999999999999'));
        expect(_.BN2Str(await sparta.getDailyEmission())).to.equal(_.BN2Str('14682292889404296874999'));
        
        await sleep(5000)
        await sparta.transfer(acc0, _.BN2Str(100 * _.one), {from:acc1})
        expect(_.BN2Str(await sparta.balanceOf(acc3))).to.equal(_.BN2Str('5014667968749999999999999'));
        expect(_.BN2Str(await sparta.getDailyEmission())).to.equal(_.BN2Str('14682292840576171874999'));
      });
    
      it("DAO changeEraDuration", async function() {
        await sparta.setParams('200','200',{from:acc0})
        expect(_.BN2Str(await sparta.secondsPerEra())).to.equal('200');
      });
}
async function feeONTransfer(amount) {
    it("It should subtract fee on transfer", async () => {
        let totalSupply = _.getBN(await sparta.totalSupply())
        let maxSupply = _.BN2Str(await sparta.totalSupply())
        let _feeOnTransfer = _.getBN(await sparta.feeOnTransfer())
        let dailyEmission = await sparta.getDailyEmission()
        
        let _fee = _.BN2Str(_.getBN(amount).times(_feeOnTransfer).div(10000)); 
        // let _fee2 = _.BN2Str(_.getBN(dailyEmission).times(_feeOnTransfer).div(10000))
        // console.log("fee",_.BN2Str(_fee))
        let finalAmount = _.BN2Str(_.getBN(amount).minus(_fee))
        // console.log("amoun",_.BN2Str(finalAmount))
        let balance2 = _.getBN(await sparta.balanceOf(acc2))
        let balance1 = _.getBN(await sparta.balanceOf(acc1))

        let tex = await sparta.transfer(acc2, amount, {from:acc1});  
        // console.log(tex.logs)
        // console.log("value-0-burn",_.BN2Str(tex.logs[0].args.value))
        // console.log("value-1-transfer",_.BN2Str(tex.logs[1].args.value))
        // console.log("value-2-mint",_.BN2Str(tex.logs[2].args.value))
        // console.log("emission-3",_.BN2Str(tex.logs[3].args.emission))

        // assert.equal(_.BN2Str(tex.logs[3].args.emission), _.BN2Str(dailyEmission))

        let totalSupplyA = _.BN2Str(await sparta.totalSupply())   
        let balance2A = _.BN2Str(await sparta.balanceOf(acc2))
        // console.log(_.BN2Str(balance2))
        let balance1A = _.BN2Str(await sparta.balanceOf(acc1))

        assert.equal(balance1A, _.BN2Str(balance1.minus(amount)) )  
        assert.equal(balance2A, _.BN2Str(balance2.plus((_.getBN(amount)).minus(_fee))))

        // console.log("totalSupplyA",_.BN2Str(totalSupplyA))
        // console.log("dailyEmission",_.BN2Str(dailyEmission))
        // console.log("_fee",_.BN2Str(_fee))

        assert.equal(totalSupplyA, _.BN2Str(totalSupply.minus(_fee)))

  
       
    })
}


async function increaseAllowance(acc, amount) {
    it("It should increase approval", async () => {
        let allowance = _.getBN(await sparta.allowance(acc, vault.address , {from:acc}))
        await sparta.increaseAllowance(vault.address, amount, {from:acc})
        let allowanceA = _.BN2Str(await sparta.allowance(acc, vault.address , {from:acc}))
        assert.equal(_.BN2Str(allowanceA), _.BN2Str(allowance.plus(amount)))
    })
}
async function decreaseAllowance(acc, amount) {
    it("It should decrease approval", async () => {
        let allowance = _.getBN(await sparta.allowance(acc, vault.address , {from:acc}))
        await sparta.decreaseAllowance(vault.address, amount, {from:acc})
        let allowanceA = _.BN2Str(await sparta.allowance(acc, vault.address , {from:acc}))
        assert.equal(_.BN2Str(allowanceA), _.BN2Str(allowance.minus(amount)))
    })
}

async function transferFrom(acc) {
    it("It should transferFrom", async () => {
        //console.log(_.BN2Str(await sparta.balanceOf(acc)))
        await vault.deposit(sparta.address,_.BN2Str(20*_.one), acc,{from:acc})
        assert.equal(_.BN2Str(await sparta.balanceOf(vault.address)), _.BN2Str(20*_.one))
        await truffleAssert.reverts(vault.deposit(sparta.address,_.BN2Str(20*_.one),acc, {from:acc}), "allowance err");
    })
}
async function approveMax(acc) {
    it("It should approveMax", async () => {
        await sparta.approve(vault.address, '115792089237316195423570985008687907853269984665640564039457584007913129639935', {from:acc})
        assert.equal(_.BN2Str(await sparta.allowance(acc, vault.address , {from:acc})), '115792089237316195423570985008687907853269984665640564039457584007913129639935')
    })
    it("It should approveMax again", async () => {
        await sparta.approve(vault.address, '115792089237316195423570985008687907853269984665640564039457584007913129639935', {from:acc})
        await vault.deposit(sparta.address,_.BN2Str(20*_.one), acc,{from:acc})
        assert.equal(_.BN2Str(await sparta.allowance(acc, vault.address , {from:acc})), '115792089237316195423570985008687907853269984665640564039457584007913129639935')
    })
}
async function transferFromAfter(acc) {
    it("It should transferFrom After", async () => {
        let allowance = _.getBN(await sparta.allowance(acc, vault.address , {from:acc}))
        // console.log("allowance ",_.BN2Str(allowance))
        let balance = _.getBN(await sparta.balanceOf(vault.address))
        await vault.deposit(sparta.address,_.BN2Str(20*_.one), acc,{from:acc})
        let allowanceA = _.BN2Str(await sparta.allowance(acc, vault.address , {from:acc}))
        assert.equal(_.BN2Str(await sparta.balanceOf(vault.address)), _.BN2Str( balance.plus(20*_.one)))
        assert.equal(_.BN2Str(allowanceA), _.BN2Str(allowance))
    })
}

async function upgradeSparta(acc) {
    it("It should upgrade sparta v1 - v2", async () => {
        let balance = _.BN2Str(await base.balanceOf(acc));
        let sbalance = _.BN2Str(await sparta.balanceOf(acc));
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
        let amount = _.BN2Str(10 * 10**6 * 10**18)
        await sparta.saveFallenSpartans(fSpartans.address, amount, {from:acc0});
        let sbalanceA = _.BN2Str(await sparta.balanceOf(fSpartans.address));
        assert.equal(_.BN2Str(sbalanceA), _.BN2Str(10 * 10**6 * 10**18))
    })
}
async function approveAndTransfer(acc) {
    it("It should approveAndTransfer", async () => {
        let basApproval = _.BN2Str(await sparta.allowance(acc,vault.address,  {from:acc}))

    // console.log(token1.address);

        let amount = _.getBN(await sparta.balanceOf(vault.address))
         await token1.approve(vault.address,_.BN2Str(10 * 10**6 * 10**18), {from:acc} )
     
    //    let deposit = web3Abi.encodeFunctionCall(
    //     {
    //         "constant": false,
    //         "inputs": [
    //             {
    //                "name": "token",
    //                "type": "address"
    //             },
    //             {
    //               "name": "amount",
    //               "type": "uint256"
    //             },
    //             {
    //                "name": "member",
    //                "type": "address"
    //             }
    //             ,
    //             {
    //                "name": "token2",
    //                "type": "address"
    //             }
    //         ],
    //         "name": "add",
    //         "outputs": [],
    //         "payable": false,
    //         "stateMutability": "nonpayable",
    //         "type": "function"
    //     }, [sparta.address, _.BN2Str(2**75), acc, token1.address]
    // );

        //    await sparta.approveAndCall(vault.address, _.BN2Str(1*_.one), deposit, {from:acc})


       await sparta.approveAndCall(vault.address, _.BN2Str(1*_.one), '0x000000000000000000000000a513E6E4b8f2a923D98304ec87F64353C4D5C8530000000000000000000000000000000000000000000000000de0b6b3a7640000', {from:acc})

           let basApprovalA = _.BN2Str(await sparta.allowance(acc,vault.address,  {from:acc}))
         console.log(basApprovalA/_.one);
        
        // console.log(_.BN2Str(1*_.one));


          assert.equal(_.BN2Str(await sparta.balanceOf(vault.address)), _.BN2Str(amount.plus(1*_.one)))
       
          let amount2 = _.getBN(await sparta.balanceOf(vault.address))

         await vault.deposit(sparta.address,_.BN2Str(1*_.one), acc,{from:acc})

         assert.equal(_.BN2Str(await sparta.balanceOf(vault.address)),_.BN2Str(amount2.plus(1*_.one)))

      
    })
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }