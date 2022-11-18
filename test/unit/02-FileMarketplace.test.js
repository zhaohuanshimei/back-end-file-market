const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const fs = require("fs")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("File Nft Marketplace Unit Tests", function () {
          let nftMarketplace, nftMarketplaceContract, fileNft, fileNftContract
          const PRICE = ethers.utils.parseEther("0")
          const REPRICE = ethers.utils.parseEther("0.1")

          const TOKEN_ID = 0
          const TOKEN_ID2 = 1
          const TOKEN_LISTED_SMALLER_THEN_BALANCE = "50000000000000000"
          const TOKEN_LISTED_SMALLER_THEN_BALANCE_MINUS_1 = "49999999999999999"
          const TOKEN_LISTED_LARGER_THEN_BALANCE = "130000000000000000"

          const cid = "QmUd8NTn1Rz8zWhuF572XhzrzNjYNTNm9ma4KRtf7Lb2Pr"
          const password = "123"
          const amount = "100000000000000000"

          beforeEach(async () => {
              accounts = await ethers.getSigners() // could also do with getNamedAccounts
              deployer = accounts[0]
              user = accounts[1]
              await deployments.fixture(["main"])
              nftMarketplaceContract = await ethers.getContract("FileNFTMarketplace")
              nftMarketplace = nftMarketplaceContract.connect(deployer)
              fileNftContract = await ethers.getContract("FileNFT")
              fileNft = await fileNftContract.connect(deployer)
              await fileNft.requestNFT(cid, password, amount)
              await fileNft.setApprovalForAll(nftMarketplaceContract.address, true)
          })

          describe("listItem", function () {
              it("revert error when has substandard amount", async function () {
                  await expect(nftMarketplace.listItem(TOKEN_ID, REPRICE, "0")).to.be.revertedWith(
                      "FileNFTMarketplace__ListAmountMustBeAboveZero()"
                  )
              })
              it("emits an event after listing an item", async function () {
                  expect(
                      await nftMarketplace.listItem(
                          TOKEN_ID,
                          PRICE,
                          TOKEN_LISTED_SMALLER_THEN_BALANCE
                      )
                  ).to.emit("ItemListed")
              })
              it("exclusively lists items that haven't been listed", async function () {
                  await nftMarketplace.listItem(TOKEN_ID, PRICE, TOKEN_LISTED_SMALLER_THEN_BALANCE)
                  const error = `FileNFTMarketplace__AlreadyListed("${deployer.address}", ${TOKEN_ID})`
                  await expect(
                      nftMarketplace.listItem(TOKEN_ID, PRICE, TOKEN_LISTED_SMALLER_THEN_BALANCE)
                  ).to.be.revertedWith(error)
              })
              it("exclusively allows owners to list", async function () {
                  nftMarketplace = await nftMarketplaceContract.connect(user)
                  await fileNft.setApprovalForAll(user.address, true)
                  await expect(
                      nftMarketplace.listItem(TOKEN_ID, PRICE, TOKEN_LISTED_SMALLER_THEN_BALANCE)
                  ).to.be.revertedWith("FileNFTMarketplace__NotApprovedForMarketplace()")
              })
              it("needs approvals to list item", async function () {
                  await fileNft.setApprovalForAll(nftMarketplaceContract.address, false)
                  await expect(
                      nftMarketplace.listItem(TOKEN_ID, PRICE, TOKEN_LISTED_SMALLER_THEN_BALANCE)
                  ).to.be.revertedWith("NotApprovedForMarketplace")
              })
              it("listing with max amount do not larger than the owner's NFT balance", async function () {
                  await nftMarketplace.listItem(TOKEN_ID, PRICE, TOKEN_LISTED_LARGER_THEN_BALANCE)
                  const listing = await nftMarketplace.getListing(deployer.address, TOKEN_ID)
                  assert(listing.price.toString() == PRICE.toString())
                  assert(listing.amount.toString() == amount)
              })
              it("Updates listing with seller price and amount", async function () {
                  await nftMarketplace.listItem(TOKEN_ID, PRICE, TOKEN_LISTED_SMALLER_THEN_BALANCE)
                  const listing = await nftMarketplace.getListing(deployer.address, TOKEN_ID)
                  assert(listing.price.toString() == PRICE.toString())
                  assert(listing.amount.toString() == TOKEN_LISTED_SMALLER_THEN_BALANCE)
              })
          })
          describe("cancelListing", function () {
              it("reverts if there is no listing", async function () {
                  const error = `FileNFTMarketplace__NotListed("${deployer.address}", ${TOKEN_ID})`
                  await expect(nftMarketplace.cancelListing(TOKEN_ID)).to.be.revertedWith(error)
              })
              it("reverts if anyone but the owner tries to call", async function () {
                  await nftMarketplace.listItem(TOKEN_ID, PRICE, TOKEN_LISTED_SMALLER_THEN_BALANCE)
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  await fileNft.setApprovalForAll(user.address, true)
                  const error = `FileNFTMarketplace__NotListed("${user.address}", ${TOKEN_ID})`
                  await expect(nftMarketplace.cancelListing(TOKEN_ID)).to.be.revertedWith("error")
              })
              it("emits event and removes listing", async function () {
                  await nftMarketplace.listItem(TOKEN_ID, PRICE, TOKEN_LISTED_SMALLER_THEN_BALANCE)
                  expect(await nftMarketplace.cancelListing(TOKEN_ID)).to.emit("ItemCanceled")
                  const listing = await nftMarketplace.getListing(deployer.address, TOKEN_ID)
                  assert(listing.amount.toString() == "0")
                  assert(listing.price.toString() == "0")
              })
          })
          describe("buyItem", function () {
              it("reverts if the item isn't listed", async function () {
                  await expect(
                      nftMarketplace.buyItem(deployer.address, TOKEN_ID)
                  ).to.be.revertedWith("FileNFTMarketplace__NotListed")
              })
              it("reverts if the price isn't met", async function () {
                  await nftMarketplace.listItem(
                      TOKEN_ID,
                      REPRICE,
                      TOKEN_LISTED_SMALLER_THEN_BALANCE
                  )
                  await expect(
                      nftMarketplace.buyItem(deployer.address, TOKEN_ID)
                  ).to.be.revertedWith("FileNFTMarketplace__PriceNotMet")
              })
              it("reverts if buyer already has one", async function () {
                  await nftMarketplace.listItem(
                      TOKEN_ID,
                      REPRICE,
                      TOKEN_LISTED_SMALLER_THEN_BALANCE
                  )
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  expect(
                      await nftMarketplace.buyItem(deployer.address, TOKEN_ID, {
                          value: REPRICE,
                      })
                  ).to.emit("ItemBought")

                  await expect(
                      nftMarketplace.buyItem(deployer.address, TOKEN_ID, {
                          value: REPRICE,
                      })
                  ).to.be.revertedWith("FileNFTMarketplace__AlreadyHaveThisNFT")
              })
              it("transfers the nft to the buyer and updates internal proceeds record", async function () {
                  await nftMarketplace.listItem(
                      TOKEN_ID,
                      REPRICE,
                      TOKEN_LISTED_SMALLER_THEN_BALANCE
                  )
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  expect(
                      await nftMarketplace.buyItem(deployer.address, TOKEN_ID, {
                          value: REPRICE,
                      })
                  ).to.emit("ItemBought")
                  const buyerBalance = await fileNft.balanceOf(user.address, TOKEN_ID)
                  //   console.log(buyerBalance.toString())

                  const sellerListing = await nftMarketplaceContract.getListing(
                      deployer.address,
                      TOKEN_ID
                  )
                  const sellerBalance = sellerListing.amount
                  //   console.log(sellerBalance.toString())
                  const deployerProceeds = await nftMarketplace.getProceeds(deployer.address)
                  //   console.log(deployerProceeds.toString())
                  assert(buyerBalance.toString() == 1)
                  assert(
                      sellerBalance.toString() ==
                          TOKEN_LISTED_SMALLER_THEN_BALANCE_MINUS_1.toString()
                  )

                  assert(deployerProceeds.toString() == REPRICE.toString())
              })
              it("emit when item sold out", async function () {
                  await nftMarketplace.listItem(TOKEN_ID, REPRICE, 1)
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  expect(
                      await nftMarketplace.buyItem(deployer.address, TOKEN_ID, {
                          value: REPRICE,
                      })
                  ).to.emit("ItemSoldOut")
              })

              it("allows buyer to check the file info", async function () {
                  await nftMarketplace.listItem(
                      TOKEN_ID,
                      REPRICE,
                      TOKEN_LISTED_SMALLER_THEN_BALANCE
                  )
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  expect(
                      await nftMarketplace.buyItem(deployer.address, TOKEN_ID, {
                          value: REPRICE,
                      })
                  ).to.emit("ItemBought")
                  fileNft = await fileNftContract.connect(user)
                  const info0 = await fileNft.readFileInfo(0)

                  assert.equal(info0[0], cid)
                  assert.equal(info0[1], password)
              })
          })
          describe("updateListing", function () {
              it("must be owner and listed", async function () {
                  await expect(
                      nftMarketplace.updateListing(
                          TOKEN_ID,
                          PRICE,
                          TOKEN_LISTED_SMALLER_THEN_BALANCE
                      )
                  ).to.be.revertedWith("FileNFTMarketplace__NotListed")
                  await nftMarketplace.listItem(TOKEN_ID, PRICE, TOKEN_LISTED_SMALLER_THEN_BALANCE)
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  await expect(
                      nftMarketplace.updateListing(
                          TOKEN_ID,
                          REPRICE,
                          TOKEN_LISTED_LARGER_THEN_BALANCE
                      )
                  ).to.be.revertedWith("FileNFTMarketplace__NotListed")
              })
              it("updates the price and amount of the item", async function () {
                  const updatedPrice = ethers.utils.parseEther("0.2")
                  TOKEN_LISTED_SMALLER_THEN_BALANCE
                  await nftMarketplace.listItem(TOKEN_ID, PRICE, TOKEN_LISTED_SMALLER_THEN_BALANCE)
                  expect(
                      await nftMarketplace.updateListing(
                          TOKEN_ID,
                          REPRICE,
                          TOKEN_LISTED_SMALLER_THEN_BALANCE
                      )
                  ).to.emit("ItemListed")
                  const listing = await nftMarketplace.getListing(deployer.address, TOKEN_ID)
                  assert(listing.price.toString() == REPRICE.toString())
                  assert(listing.amount.toString() == TOKEN_LISTED_SMALLER_THEN_BALANCE.toString())
                  //   console.log((await fileNft.balanceOf(deployer.address, TOKEN_ID)).toString())
                  expect(
                      await nftMarketplace.updateListing(
                          TOKEN_ID,
                          updatedPrice,
                          TOKEN_LISTED_LARGER_THEN_BALANCE
                      )
                  ).to.emit("ItemListed")
                  const listing2 = await nftMarketplace.getListing(deployer.address, TOKEN_ID)
                  assert(listing2.price.toString() == updatedPrice.toString())
                  assert(
                      listing2.amount.toString() ==
                          (await fileNft.balanceOf(deployer.address, TOKEN_ID)).toString()
                  )
              })
          })
          describe("withdrawProceeds", function () {
              it("doesn't allow 0 proceed withdraws", async function () {
                  await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWith(
                      "FileNFTMarketplace__NoProceeds"
                  )
              })
              it("withdraws proceeds", async function () {
                  await nftMarketplace.listItem(
                      TOKEN_ID,
                      REPRICE,
                      TOKEN_LISTED_SMALLER_THEN_BALANCE
                  )
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  await nftMarketplace.buyItem(deployer.address, TOKEN_ID, {
                      value: REPRICE,
                  })
                  nftMarketplace = nftMarketplaceContract.connect(deployer)

                  const deployerProceedsBefore = await nftMarketplace.getProceeds(deployer.address)
                  const deployerBalanceBefore = await deployer.getBalance()
                  const txResponse = await nftMarketplace.withdrawProceeds()
                  const transactionReceipt = await txResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)
                  const deployerBalanceAfter = await deployer.getBalance()

                  assert(
                      deployerBalanceAfter.add(gasCost).toString() ==
                          deployerProceedsBefore.add(deployerBalanceBefore).toString()
                  )
              })
          })

          describe("get nftAddress", function () {
              it("returns the file nft contract address", async function () {
                  assert(
                      (await nftMarketplace.getNftAddress()).toString() ==
                          fileNft.address.toString()
                  )
              })
          })
      })
