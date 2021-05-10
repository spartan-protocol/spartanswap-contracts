require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-etherscan");

// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.getAddress());
  }
});

module.exports = {
  // networks:{
  //   mainnet: { ... }
  // },
  BscScan:{
    apiKey: "BAX9E1UW6KPU2EA7GQW2ZNZ78GA7IJ72D1"  
  },
  solidity: {
    compilers: [
      {
        version: "0.8.3",
      },
    ],
  },
};
