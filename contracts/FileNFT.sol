// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "hardhat/console.sol";

error ERC721Metadata__URI_QueryFor_NonExistentToken();
error FileNFT__NoAccess();

contract FileNFT is ERC1155 {
    struct File {
        string cid;
        string filePassword;
    }
    uint256 private s_tokenCounter;

    event CreatedNFT(uint256 indexed tokenId);

    mapping(uint256 => File) private s_files;

    constructor(string memory URI) ERC1155(URI) {
        s_tokenCounter = 0;
    }

    modifier haveAccess(uint256 tokenId) {
        if (balanceOf(msg.sender, tokenId) <= 0) {
            revert FileNFT__NoAccess();
        }
        _;
    }

    function requestNFT(string memory cid, string memory password, uint256 amount) public {
        _mint(msg.sender, s_tokenCounter, amount, "");
        s_files[s_tokenCounter].cid = cid;
        if (keccak256(abi.encodePacked(password)) != keccak256("")) {
            s_files[s_tokenCounter].filePassword = password;
        }

        emit CreatedNFT(s_tokenCounter);
        s_tokenCounter += 1;
    }

    function readFileInfo(
        uint256 NftID
    ) public view haveAccess(NftID) returns (string memory, string memory) {
        return (s_files[NftID].cid, s_files[NftID].filePassword);
    }

    function getFileURI(uint256 NftID) public view returns (string memory) {
        return uri(NftID);
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}
