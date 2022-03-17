var CustomERC20 = artifacts.require("./CustomERC20.sol");

module.exports = function(deployer) {
  deployer.deploy(CustomERC20, "Custom Token", "CSTMN", 1000);
};
