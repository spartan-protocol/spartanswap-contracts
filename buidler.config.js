usePlugin("@nomiclabs/buidler-truffle5");

module.exports = {
    networks: {
      buidlerevm: {
        gas: 12000000,
        blockGasLimit: 0x1fffffffffffff,
        allowUnlimitedContractSize: true,
        timeout: 1800000
      },
    },
    solc: {
      version: "0.6.8",
    },
    mocha: {
        timeout: 100000
      },
  };
