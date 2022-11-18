// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error FileNFTMarketplace__PriceNotMet(uint256 tokenId, uint256 price);
error FileNFTMarketplace__NotListed(address seller, uint256 tokenId);
error FileNFTMarketplace__AlreadyListed(address seller, uint256 tokenId);
error FileNFTMarketplace__NoProceeds();
error FileNFTMarketplace__NotApprovedForMarketplace();
error FileNFTMarketplace__ListAmountMustBeAboveZero();
error FileNFTMarketplace__AlreadyHaveThisNFT();

contract FileNFTMarketplace is ReentrancyGuard {
    struct Listing {
        uint256 price;
        uint256 amount;
    }

    event ItemListed(
        address indexed seller,
        uint256 indexed tokenId,
        uint256 price,
        uint256 indexed amount
    );

    event ItemCanceled(address indexed seller, uint256 indexed tokenId);

    event ItemBought(
        address indexed seller,
        uint256 indexed tokenId,
        address buyer,
        uint256 price,
        uint256 indexed amountRemain
    );

    event ItemSoldOut(address indexed seller, uint256 indexed tokenId, address buyer);

    // seller => tokenID => listing
    mapping(address => mapping(uint256 => Listing)) private s_listings;
    mapping(address => uint256) private s_proceeds;
    address immutable i_nftAddress;

    constructor(address nftAddress) {
        i_nftAddress = nftAddress;
    }

    modifier notListed(uint256 tokenId, address spender) {
        Listing memory listing = s_listings[spender][tokenId];
        if (listing.amount > 0) {
            revert FileNFTMarketplace__AlreadyListed(spender, tokenId);
        }
        _;
    }

    modifier isListed(uint256 tokenId, address spender) {
        Listing memory listing = s_listings[spender][tokenId];
        if (listing.amount <= 0) {
            revert FileNFTMarketplace__NotListed(spender, tokenId);
        }
        _;
    }

    modifier AmountChecker(uint256 amount) {
        if (amount <= 0) {
            revert FileNFTMarketplace__ListAmountMustBeAboveZero();
        }
        _;
    }

    /////////////////////
    // Main Functions //
    /////////////////////

    /*
     * @notice Method for listing NFT
     * @param tokenId Token ID of NFT
     * @param price sale price for each item
     * @param listAmount nft amount prepare for sale
     */
    function listItem(
        // address nftAddress,
        uint256 tokenId,
        uint256 price,
        uint256 listAmount
    ) external notListed(tokenId, msg.sender) AmountChecker(listAmount) {
        uint256 nftBalance = getNftBalanceAndGetApproved(msg.sender, tokenId);
        nftBalance = checkHasEnoughNftAmount(nftBalance, listAmount);
        s_listings[msg.sender][tokenId] = Listing(price, nftBalance);
        emit ItemListed(msg.sender, tokenId, price, nftBalance);
    }

    /*
     * @notice Method for cancelling listing
     * @param tokenId Token ID of NFT
     */
    function cancelListing(
        // address nftAddress,
        uint256 tokenId
    ) external isListed(tokenId, msg.sender) {
        delete (s_listings[msg.sender][tokenId]);
        emit ItemCanceled(msg.sender, tokenId);
    }

    /*
     * @notice Method for buying listing
     * @notice Buyer can buy only one piece of NFT at one time.
     * @notice Buyer can buy only if he don't have this NFT.
     * @param seller Address of NFT owner
     * @param tokenId Token ID of NFT
     */

    //For file distribution system, the marketplace only alow buyer to buy only one file-nft each time.
    function buyItem(
        address seller,
        uint256 tokenId
    ) external payable isListed(tokenId, seller) nonReentrant {
        Listing memory listedItem = s_listings[seller][tokenId];
        if (msg.value < listedItem.price) {
            revert FileNFTMarketplace__PriceNotMet(tokenId, listedItem.price);
        }
        uint256 buyerBalance = getNftBalance(msg.sender, tokenId);
        if (buyerBalance > 0) {
            revert FileNFTMarketplace__AlreadyHaveThisNFT();
        }
        s_proceeds[seller] += msg.value;
        if (listedItem.amount == 1) {
            delete (s_listings[seller][tokenId]);
            emit ItemSoldOut(seller, tokenId, msg.sender);
        } else {
            s_listings[seller][tokenId].amount -= 1;
        }
        IERC1155(i_nftAddress).safeTransferFrom(seller, msg.sender, tokenId, 1, "");
        emit ItemBought(seller, tokenId, msg.sender, listedItem.price, listedItem.amount - 1);
    }

    /*
     * @notice Method for updating listing
     * @param tokenId Token ID of NFT
     * @param newPrice Price in Wei of the item
     * @param newAmount adjusted nft amount prepare for sale
     */
    function updateListing(
        uint256 tokenId,
        uint256 price,
        uint256 listAmount
    ) external isListed(tokenId, msg.sender) nonReentrant AmountChecker(listAmount) {
        uint256 nftBalance = getNftBalanceAndGetApproved(msg.sender, tokenId);
        nftBalance = checkHasEnoughNftAmount(nftBalance, listAmount);
        s_listings[msg.sender][tokenId] = Listing(price, nftBalance);
        emit ItemListed(msg.sender, tokenId, price, nftBalance);
    }

    /*
     * @notice Method for withdrawing proceeds from sales
     */
    function withdrawProceeds() external nonReentrant {
        uint256 proceeds = s_proceeds[msg.sender];
        if (proceeds <= 0) {
            revert FileNFTMarketplace__NoProceeds();
        }
        s_proceeds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        require(success, "Transfer failed");
    }

    /////////////////////
    // Utils Functions //
    /////////////////////

    // Return the smaller one of the two balances
    function checkHasEnoughNftAmount(
        uint256 nftBalance,
        uint256 listAmount
    ) internal pure returns (uint256) {
        return (listAmount < nftBalance ? listAmount : nftBalance);
    }

    function getNftBalanceAndGetApproved(
        address someAddress,
        uint256 tokenId
    ) public view returns (uint256) {
        IERC1155 nft = IERC1155(i_nftAddress);
        if (!nft.isApprovedForAll(someAddress, address(this))) {
            revert FileNFTMarketplace__NotApprovedForMarketplace();
        }
        uint256 nftBalance = nft.balanceOf(someAddress, tokenId);
        return nftBalance;
    }

    function getNftBalance(address someAddress, uint256 tokenId) public view returns (uint256) {
        IERC1155 nft = IERC1155(i_nftAddress);
        uint256 nftBalance = nft.balanceOf(someAddress, tokenId);
        return nftBalance;
    }

    /////////////////////
    // Getter Functions //
    /////////////////////

    function getListing(address seller, uint256 tokenId) external view returns (Listing memory) {
        return s_listings[seller][tokenId];
    }

    function getProceeds(address seller) external view returns (uint256) {
        return s_proceeds[seller];
    }

    function getNftAddress() external view returns (address) {
        return i_nftAddress;
    }
}
