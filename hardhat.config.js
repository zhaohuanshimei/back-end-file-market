require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

const PRIVATE_KEY_GOERLI = process.env.PRIVATE_KEY_GOERLI || ""
// const PRIVATE_KEY_GOERLI_2 = process.env.PRIVATE_KEY_GOERLI_2 || ""
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ""
const RPC_URL_GOERLI = process.env.RPC_URL_GOERLI || ""
const COINMARKETCAP = process.env.COINMARKETCAP || ""

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.8",
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
            blockConfirmations: 1,
        },
        goerli: {
            chainId: 5,
            blockConfirmations: 5,
            url: RPC_URL_GOERLI,
            accounts: [PRIVATE_KEY_GOERLI],
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
        player: {
            default: 1,
        },
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
        customChains: [
            {
                network: "goerli",
                chainId: 5,
                urls: {
                    apiURL: "http://api-goerli.etherscan.io/api", // https => http
                    browserURL: "https://goerli.etherscan.io",
                },
            },
        ],
    },
    gasReporter: {
        enabled: false,
        // enabled: true,
        currency: "USD",
        outputFile: "gas-report.txt",
        noColors: true,
        coinmarketcap: COINMARKETCAP,
        token: "ETH",
    },
    mocha: {
        timeout: 300000, // 300 seconds max
    },
}
