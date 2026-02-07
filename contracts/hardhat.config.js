require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0000000000000000000000000000000000000000000000000000000000000000";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.20",
    networks: {
        bsc: {
            url: "https://bsc-dataseed.binance.org/",
            chainId: 56,
            accounts: [PRIVATE_KEY]
        },
        bscTestnet: {
            url: "https://data-seed-prebsc-1-s1.binance.org:8545",
            chainId: 97,
            accounts: [PRIVATE_KEY]
        },
        hardhat: {
            forking: {
                url: "https://bsc-dataseed.binance.org/",
            }
        }
    },
    etherscan: {
        apiKey: BSCSCAN_API_KEY
    }
};
