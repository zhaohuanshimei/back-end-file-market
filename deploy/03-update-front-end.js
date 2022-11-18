const {
    frontEndContractsFile,
    frontEndContractsFile2,
    frontEndAbiLocation,
    frontEndAbiLocation2,
} = require("../helper-hardhat-config")
require("dotenv").config()
const fs = require("fs")
const { network } = require("hardhat")

module.exports = async () => {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Writing to front end...")
        await updateContractAddresses()
        await updateAbi()
        console.log("Front end written!")
    }
}

async function updateAbi() {
    const nftMarketplace = await ethers.getContract("FileNFTMarketplace")
    fs.writeFileSync(
        `${frontEndAbiLocation}FileNftMarketplace.json`,
        nftMarketplace.interface.format(ethers.utils.FormatTypes.json)
    )
    const FileNFT = await ethers.getContract("FileNFT")
    fs.writeFileSync(
        `${frontEndAbiLocation}FileNFT.json`,
        FileNFT.interface.format(ethers.utils.FormatTypes.json)
    )
}

async function updateContractAddresses() {
    const chainId = network.config.chainId.toString()
    const nftMarketplace = await ethers.getContract("FileNFTMarketplace")
    const FileNft = await ethers.getContract("FileNFT")
    const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"))
    // if (chainId in contractAddresses) {
    //     if (!contractAddresses[chainId]["FileNFTMarketplace"].includes(nftMarketplace.address)) {
    //         contractAddresses[chainId]["FileNFTMarketplace"].push(nftMarketplace.address)
    //     }
    // } else {
    contractAddresses[chainId] = {
        FileNftMarketplace: [nftMarketplace.address],
        FileNFT: [FileNft.address],
    }
    // }

    // if (chainId in contractAddresses) {
    //     if (!contractAddresses[chainId]["FileNFT"].includes(FileNft.address)) {
    //         contractAddresses[chainId]["FileNFT"].push(FileNft.address)
    //     }
    // } else {

    // }
    fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses))
}

module.exports.tags = ["all", "frontend"]
