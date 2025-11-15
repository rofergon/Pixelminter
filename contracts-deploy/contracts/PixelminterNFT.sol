// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PixelminterNFT
 * @dev ERC721 token for Pixelminter pixel art NFTs
 * Each token represents a unique pixel art with metadata including:
 * - FPS (frames per second for animations)
 * - Total pixels used
 * - Theme name (daily theme)
 * - Author (ENS name or address)
 * - Color palette used
 */
contract PixelminterNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    uint256 private mintFee; // Mint fee in wei
    string private _contractURI; // Contract-level metadata for OpenSea

    event FeeUpdated(uint256 newFee);
    event NFTMinted(
        address indexed recipient,
        uint256 indexed tokenId,
        string tokenURI,
        uint256 totalMinted
    );

    constructor(uint256 initialFee, string memory contractURI_) ERC721("Pixelminter", "PXMT") Ownable(msg.sender) {
        mintFee = initialFee;
        _nextTokenId = 1; // Start token IDs from 1
        _contractURI = contractURI_;
    }

    /**
     * @dev Mints a new NFT with the provided metadata URI
     * @param recipient Address that will receive the NFT
     * @param tokenURI URI pointing to the metadata JSON
     * @return tokenId The ID of the newly minted token
     * 
     * The tokenURI should point to a JSON file with the following structure:
     * {
     *   "name": "Pixelminter #1",
     *   "description": "Pixel art created with Pixelminter",
     *   "image": "ipfs://...", // or https://... pointing to the pixel art image/gif
     *   "animation_url": "ipfs://...", // optional, for animated GIFs
     *   "attributes": [
     *     {"trait_type": "FPS", "value": 30},
     *     {"trait_type": "Total Pixels", "value": 256},
     *     {"trait_type": "Theme", "value": "Daily Theme Name"},
     *     {"trait_type": "Author", "value": "author.eth"},
     *     {"trait_type": "Palette", "value": "#FF0000,#00FF00,#0000FF"}
     *   ]
     * }
     */
    function mintNFT(address recipient, string memory tokenURI) public payable returns (uint256) {
        require(msg.value >= mintFee, "Insufficient payment");
        require(recipient != address(0), "Invalid recipient address");
        require(bytes(tokenURI).length > 0, "Token URI cannot be empty");

        uint256 newTokenId = _nextTokenId;
        _nextTokenId++;
        
        _safeMint(recipient, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        emit NFTMinted(recipient, newTokenId, tokenURI, _nextTokenId - 1);

        return newTokenId;
    }

    /**
     * @dev Updates the mint fee (only owner)
     * @param newFee New fee in wei
     */
    function setMintFee(uint256 newFee) public onlyOwner {
        mintFee = newFee;
        emit FeeUpdated(newFee);
    }

    /**
     * @dev Returns the current mint fee
     * @return Current fee in wei
     */
    function getMintFee() public view returns (uint256) {
        return mintFee;
    }

    /**
     * @dev Returns the total number of tokens minted
     * @return Total supply of tokens
     */
    function totalSupply() public view returns (uint256) {
        return _nextTokenId - 1;
    }

    /**
     * @dev Withdraws contract balance to owner
     */
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        payable(owner()).transfer(balance);
    }

    /**
     * @dev Returns the contract-level metadata URI (OpenSea standard)
     * @return URI pointing to the collection metadata JSON
     */
    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    /**
     * @dev Updates the contract URI (only owner)
     * @param newContractURI New contract-level metadata URI
     */
    function setContractURI(string memory newContractURI) public onlyOwner {
        _contractURI = newContractURI;
    }

    /**
     * @dev Override supportsInterface to include ERC721URIStorage
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
