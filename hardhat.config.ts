import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";

dotenv.config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      chainId: 11155111,
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [
        process.env.PRIVATE_KEY,
        process.env.PRIVATE_KEY2,
        process.env.PRIVATE_KEY3,
      ],
    },
    opStack: {
      chainId: 815815,
      url: process.env.OPSTACK_RPC_URL,
      accounts: [
        process.env.PRIVATE_KEY,
        process.env.PRIVATE_KEY2,
        process.env.PRIVATE_KEY3,
      ],
    },
  },
};
