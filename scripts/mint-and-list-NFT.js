const { ethers, network } = require("hardhat")
const { moveBlocks } = require("../utils/move-blocks")
const fs = require("fs")

const PRICE = ethers.utils.parseEther("0")

async function mintAndList() {
    const cid = "Qmd4JPXw4iYeLVt1doZCo6vzFgzg7eZ3cymjNUG8cYSvWj"
    const password = "456"
    const amount = "3"

    const nftMarketplace = await ethers.getContract("FileNFTMarketplace")
    // const randomNumber = Math.floor(Math.random() * 2)
    let fileNft
    // if (randomNumber == 1) {
    //     fileNft = await ethers.getContract("fileNftTwo")
    // } else {
    fileNft = await ethers.getContract("FileNFT")
    // }
    console.log("Minting NFT...")

    const mintTx = await fileNft.requestNFT(cid, password, amount)
    const mintTxReceipt = await mintTx.wait(1)
    const tokenId = mintTxReceipt.events[0].args.id
    // console.log(mintTxReceipt.events[0])
    console.log((await fileNft.getFileURI(0)).toString())
    console.log(
        "--------------------------------------------------------------------------------------"
    )
    console.log("Approving NFT...")
    const approvalTx = await fileNft.setApprovalForAll(nftMarketplace.address, true)
    await approvalTx.wait(1)
    console.log("Listing NFT...")
    const tx = await nftMarketplace.listItem(tokenId, PRICE, amount)
    await tx.wait(1)
    console.log("NFT Listed!")
    if (network.config.chainId == 31337) {
        await moveBlocks(1, (sleepAmount = 1000))
    }
}

mintAndList()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
