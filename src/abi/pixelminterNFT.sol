// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract PixelminterNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    uint256 private mintFee; // Tarifa de mint en wei
    string private baseURI;

    event FeeUpdated(uint256 newFee);
    event BaseURIUpdated(string newBaseURI);
    
    // Nuevo evento para el minting de NFT
    event NFTMinted(address indexed recipient, uint256 tokenId, uint256 totalMinted);

    constructor(uint256 initialFee, string memory initialBaseURI) ERC721("Pixelminter", "PXMT") Ownable(msg.sender) {
        mintFee = initialFee;
        baseURI = initialBaseURI;
    }

    function mintNFT(address recipient) public payable returns (uint256) {
        require(msg.value >= mintFee, "Pago insuficiente");

        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _safeMint(recipient, newItemId);

        // Emitir el nuevo evento
        emit NFTMinted(recipient, newItemId, newItemId);

        return newItemId;
    }

    function setMintFee(uint256 newFee) public onlyOwner {
        mintFee = newFee;
        emit FeeUpdated(newFee);
    }

    function getMintFee() public view returns (uint256) {
        return mintFee;
    }

    function setBaseURI(string memory newBaseURI) public onlyOwner {
        baseURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
    }
}
