var Token1 = artifacts.require("./Token1.sol") 
var Token2 = artifacts.require("./Token2.sol") 

module.exports = function(deployer) {
  deployer.deploy(Token1);
  deployer.deploy(Token2);
};