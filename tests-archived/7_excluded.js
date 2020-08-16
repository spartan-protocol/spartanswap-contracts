var Sparta = artifacts.require("./Sparta.sol")
var Registry1 = artifacts.require("./Registry1.sol")
var Registry2 = artifacts.require("./Registry2.sol")
const BigNumber = require('bignumber.js')
var TruffleAssert = require('truffle-assertions')

var coin; var coinAddress; var regAddress1; var regAddress2;
var acc0; var acc1; var acc2;

const Emission = '2048'; 
const send1 = 1000;

const timeDelay = 1000;
const delay = ms => new Promise(res => setTimeout(res, ms));
function BN2Str(BN) { return (new BigNumber(BN)).toFixed() }

//######################################################################################
// Test adding new registries and excluded addresses
// It needs to acquire enough Sparta first
//######################################################################################

contract("Sparta", function(accounts) {
  constructor(accounts)
  sendEther(acc0)
  withdraws(acc0)
  testTransferFrom(acc0, acc1)
  addExcludedFail()
  addExcluded(acc0)
})

function constructor(accounts) {
  acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2];
  it("constructor events", async () => {
    let Sparta = artifacts.require("Sparta.sol");
    coin = await Sparta.new()
    coinAddress = coin.address;
    let Registry1 = artifacts.require("Registry1.sol");
    registry1 = await Registry1.new()
    regAddress1 = registry1.address;
    let Registry2 = artifacts.require("Registry2.sol");
    registry2 = await Registry2.new()
    regAddress2 = registry2.address;
    //console.log("regAddress2:", regAddress2) 
  });
}

function sendEther(_acc) {

    it("Acc0 sends Ether", async () => {
      
      for(var i = 0; i<=2; i++) {
        if(i == 3){
          _acc = acc1;
        }
        await delay(timeDelay)
        let _era = await coin.currentEra.call()
		    let _day = await coin.currentDay.call()
        let receipt = await coin.send(send1, { from: _acc})
        // console.log("blocknumber:", receipt.logs[0].blockNumber);
        // console.log("logs:%s - first:%s", receipt.logs.length, receipt.logs[0].event); 
        //console.log('Tx%s Sent in Era: %s Day: %s', i, _era, _day)
        // console.log('Emission:', _emission)
      }
    })
}

function withdraws(_acc) {

    it("Acc0 withdraws", async () => {

     let _era = 1; let _day = 1;
     var i = 0
     do {
       let receipt = await coin.withdrawShare(_era, _day, { from: _acc })
       i++
       _day++
       if(_day > 2) {
         _era++
         _day = 1;
       }
     }
     while (_era < 2); 
     let balBN = new BigNumber(await coin.balanceOf(_acc))
     //console.log('Final User Balance: ', balBN.toFixed())
})
}

function testTransferFrom(_acc, _spender) {
    it('Add Registry', async () => {
        let balBN = new BigNumber(await coin.balanceOf(_acc))
        //console.log('User Balance: ', balBN.toFixed())
        let r1 = await coin.approve(_spender, "1001", { from: _acc })
        let approval = BN2Str(await coin.allowance.call(_acc, _spender))
        //console.log('approval', approval)
        let rx = await coin.transferFrom(_acc, _spender, "1001", { from: _spender })  
        let balBN2 = new BigNumber(await coin.balanceOf(_acc))
        assert.equal(balBN2, balBN - 1001, "correct final balance")
    })
  }

function addExcludedFail() {
  it('Add Excluded Fail', async () => {

    // let acc1Bal0 = await coin.balanceOf(acc1);
    // console.log("Account1 Balance: ", acc1Bal0.toNumber());
    // let acc1Approval = await coin.allowance(acc1, coinAddress);
    // console.log("acc1Approval: ", acc1Approval.toNumber());
    // // let r1 = await coin.approve(_acc, "513", { from: _acc })
    // let rx = await coin.addExcluded(acc1, { from: acc1 })
    // let acc1Bal01 = await coin.balanceOf(acc1);
    // console.log("Account1 New Balance: ", acc1Bal01.toNumber());

    let acc0Bal1 = await coin.balanceOf(acc0);
    let acc1Bal1 = await coin.balanceOf(acc1);
    let coinBal1 = await coin.balanceOf(coinAddress);  
    // console.log("Account0 New Balance: ", acc0Bal1.toNumber()); console.log("Account1 New Balance: ", acc1Bal1.toNumber());
    // console.log("Coin Balance Start:", coinBal1.toNumber());
    assert.equal(acc0Bal1.toNumber(), "3095", "correct acc0 balance")
    assert.equal(acc1Bal1.toNumber(), "1000", "correct acc1 balance")
    assert.equal(coinBal1.toNumber(), "4095", "correct coin balance")

    let r = await coin.transfer(acc0, 1000, { from: acc1 })

    let acc0Bal2 = await coin.balanceOf(acc0);
    let acc1Bal2 = await coin.balanceOf(acc1);
    let coinBal2 = await coin.balanceOf(coinAddress);
    // console.log("Account0 New Balance: ", acc0Bal2.toNumber()); console.log("Account1 New Balance: ", acc1Bal2.toNumber());
    // console.log("Coin Balance End:", coinBal2.toNumber());
    assert.equal(acc0Bal2.toNumber(), "4094", "correct acc0 balance")
    assert.equal(acc1Bal2.toNumber(), "0", "correct acc1 balance")
    assert.equal(coinBal2.toNumber(), "4096", "correct acc1 balance")
  })

}

function addExcluded() {
  it('Add Excluded Pass', async () => {

    let acc0Bal0 = await coin.balanceOf(acc0);
    // console.log("Account0 Balance: ", acc0Bal0.toNumber());
    assert.equal(acc0Bal0.toNumber(), "4094", "correct acc0 balance")

    let rx = await coin.addExcluded(acc0, { from: acc0 })

    let acc0Bal1 = await coin.balanceOf(acc0);
    let acc1Bal1 = await coin.balanceOf(acc1);
    let coinBal1 = await coin.balanceOf(coinAddress);  
    // console.log("Account0 New Balance: ", acc0Bal1.toNumber()); console.log("Account1 New Balance: ", acc1Bal1.toNumber());
    // console.log("Coin Balance Start:", coinBal1.toNumber());
    assert.equal(acc0Bal1.toNumber(), "3966", "correct acc0 balance")
    assert.equal(acc1Bal1.toNumber(), "0", "correct acc1 balance")
    assert.equal(coinBal1.toNumber(), "4224", "correct coin balance")

    let r = await coin.transfer(acc1, 1000, { from: acc0 })

    let acc0Bal2 = await coin.balanceOf(acc0);
    let acc1Bal2 = await coin.balanceOf(acc1);
    let coinBal2 = await coin.balanceOf(coinAddress);
    // console.log("Account0 New Balance: ", acc0Bal2.toNumber()); console.log("Account1 New Balance: ", acc1Bal2.toNumber());
    // console.log("Coin Balance End:", coinBal2.toNumber());
    assert.equal(acc0Bal2.toNumber(), "2966", "correct acc0 balance")
    assert.equal(acc1Bal2.toNumber(), "1000", "correct acc1 balance")
    assert.equal(coinBal2.toNumber(), "4224", "correct coinbal balance")
  })
}
