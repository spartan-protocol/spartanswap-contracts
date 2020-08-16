let Sparta = artifacts.require("./Sparta.sol");
let Math = artifacts.require("./Math.sol");
let SpartaPools = artifacts.require("./SpartaPools1.sol");

module.exports = function(deployer, network) {
  deployer.deploy(Sparta);
  deployer.deploy(Math);
  deployer.deploy(SpartaPools);
};
