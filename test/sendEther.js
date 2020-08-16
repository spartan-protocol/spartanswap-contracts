var Sparta = artifacts.require("./Token1.sol")

var acc0; var acc1; var acc7;
var send1 = 2*(10**18)

contract("Sparta", function(accounts) {
  constructor(accounts)
  sendEther(acc7, acc0)
})

function constructor(accounts) {
  acc0 = accounts[0]; acc1 = accounts[1]; acc7 = accounts[7];
  it("constructor events", async () => {
    let Sparta = artifacts.require("Sparta.sol");
  });
}

function sendEther(_from, _to) {

    it("Acc0 sends Ether", async () => {
      let receipt = await web3.eth.sendTransaction({ from: _from, to: _to, value:send1})
    })
}
