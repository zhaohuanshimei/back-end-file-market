const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const fs = require("fs")

const amount = "100000000000000000"

const cid = "QmUd8NTn1Rz8zWhuF572XhzrzNjYNTNm9ma4KRtf7Lb2Pr"
const password1 = "123"
const password2 = ""

// const uri = `{
//     "description": "Friendly IPFS File Sharing Marketplace",
//     "external_url": "https://front-end-web-address",
//     "image": "ipfs://QmUiUggupq2m6pNg1fXCW7dVXPdSq9x9pt42GXmzaue6eK",
//     "name": "FileNFT"
// }`

const uirurl = "https://ipfs.io/ipfs/QmdPjb9vS2Ac6odh58oKePGX397VJumN1NpEck8SPpo3V9"

// const fileNFTURI = ""

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("File SVG NFT Unit Tests", function () {
          let fileSvgNft, deployer

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              user = accounts[1]
              await deployments.fixture(["filenft"])
              fileSvgNft = await ethers.getContract("FileNFT")
          })

          it("emits an event and creates the NFT with the rigth amount", async function () {
              await expect(fileSvgNft.requestNFT(cid, password1, amount)).to.emit(
                  fileSvgNft,
                  "CreatedNFT"
              )
          })
          it("return uri", async function () {
              const uriFC = (await fileSvgNft.getFileURI(0)).toString()
              assert.equal(uirurl, uriFC)
          })

          it("can read CID and password form contrant", async function () {
              await fileSvgNft.requestNFT(cid, password1, amount)
              await fileSvgNft.requestNFT(cid, password2, amount)

              //   const cidFromContract = await fileSvgNft.readFileInfo(1)
              //   console.log(cidFromContract)

              const info0 = await fileSvgNft.readFileInfo(0)

              assert.equal(info0[0], cid)
              assert.equal(info0[1], password1)

              const info1 = await fileSvgNft.readFileInfo(1)

              assert.equal(info1[0], cid)
              assert.equal(info1[1], password2)
          })
          it("don't alow others to check the file info", async function () {
              await fileSvgNft.requestNFT(cid, password1, amount)

              fileSvgNft = await fileSvgNft.connect(user)
              //   const info0 = await fileSvgNft.readFileInfo(0)
              await expect(fileSvgNft.readFileInfo(0)).to.be.revertedWith("FileNFT__NoAccess")
          })
      })
