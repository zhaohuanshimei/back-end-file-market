const { network } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    const uri = `{
        "description": "Friendly IPFS File Sharing Marketplace",
        "external_url": "https://front-end-web-address",
        "image": "ipfs://QmUiUggupq2m6pNg1fXCW7dVXPdSq9x9pt42GXmzaue6eK",
        "name": "FileNFT"
    }`

    const uirurl = "https://ipfs.io/ipfs/QmdPjb9vS2Ac6odh58oKePGX397VJumN1NpEck8SPpo3V9"

    log("----------------------------------------------------")
    arguments = [uirurl]
    const fileSvgNft = await deploy("FileNFT", {
        from: deployer,
        args: arguments,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    // Verify the deployment
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(fileSvgNft.address, arguments)
    }
}

module.exports.tags = ["all", "filenft", "main"]
