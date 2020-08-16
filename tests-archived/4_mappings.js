var Sparta = artifacts.require("./Sparta.sol")
const BigNumber = require('bignumber.js')

var coin; var coinAddress
var acc0; var acc1; var acc2;

const Emission = '2048'; 
const send1 = 1000;

const timeDelay = 1000;
const delay = ms => new Promise(res => setTimeout(res, ms));

//######################################################################################
// Sparta is sent in to test the mappings of the contract
// It should send in different eras and days then run an efficient loop to find them all
//######################################################################################

contract("Sparta", function(accounts) {
  constructor(accounts)
  sendEther()
  checkMappings()
})

function constructor(accounts) {
  acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2];
  it("constructor events", async () => {
    let Sparta = artifacts.require("Sparta.sol");
    coin = await Sparta.new()
    coinAddress = coin.address;
   // console.log("coin:", coinAddress) 
  });
}

function sendEther() {

    it("Acc0 sends Ether", async () => {
      let _acc = acc0;
      
      for(var i = 0; i<=7; i++) {
        if(i == 7){
          _acc = acc1;
        }
        await delay(timeDelay)
        let _era = await coin.currentEra.call()
		    let _day = await coin.currentDay.call()
        let receipt = await coin.send(send1, { from: _acc})
        // console.log("blocknumber:", receipt.logs[0].blockNumber);
        // console.log("logs:%s - first:%s", receipt.logs.length, receipt.logs[0].event); 
        console.log('Tx%s Sent in Era: %s Day: %s', i, _era, _day)
        // console.log('Emission:', _emission)
      }
    })
}

function checkMappings() {
  it('Check Mappings', async () => {

    let era = (new BigNumber(await coin.currentEra.call())).toFixed()
    console.log("lastest Era:", era)

    await getDays(acc0, era)
    // await getDays(acc1, era)
  })
}

async function getDays(acc, era){
  for (var i = 1; i < era; i++){
    let daysContributed = (new BigNumber(await coin.getDaysContributedForEra.call(acc, i))).toFixed()
    console.log("In Era: %s, days contributed: ", i, daysContributed)
    //assert.equal(daysContributed, "2", "correct days contributed")

    for(var j = 1; j <= daysContributed; j++){
      let day = (new BigNumber(await coin.mapMemberEra_Days.call(acc, i, j-1))).toFixed()
      console.log('day:%s for index:%s', day, j-1)
    }
  }
}

