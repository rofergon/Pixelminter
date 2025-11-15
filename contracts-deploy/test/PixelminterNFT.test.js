const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PixelminterNFT", function () {
  let pixelminterNFT;
  let owner;
  let addr1;
  let addr2;
  const INITIAL_MINT_FEE = ethers.parseEther("0.001");
  const SAMPLE_TOKEN_URI = "ipfs://QmTest123456789";
  const CONTRACT_URI = "ipfs://QmContractMetadata123";

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const PixelminterNFT = await ethers.getContractFactory("PixelminterNFT");
    pixelminterNFT = await PixelminterNFT.deploy(INITIAL_MINT_FEE, CONTRACT_URI);
    await pixelminterNFT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await pixelminterNFT.owner()).to.equal(owner.address);
    });

    it("Should set the correct name and symbol", async function () {
      expect(await pixelminterNFT.name()).to.equal("Pixelminter");
      expect(await pixelminterNFT.symbol()).to.equal("PXMT");
    });

    it("Should set the initial mint fee", async function () {
      expect(await pixelminterNFT.getMintFee()).to.equal(INITIAL_MINT_FEE);
    });

    it("Should set the initial contract URI", async function () {
      expect(await pixelminterNFT.contractURI()).to.equal(CONTRACT_URI);
    });

    it("Should start with zero total supply", async function () {
      expect(await pixelminterNFT.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should mint a new NFT with correct fee", async function () {
      await pixelminterNFT.connect(addr1).mintNFT(
        addr1.address,
        SAMPLE_TOKEN_URI,
        { value: INITIAL_MINT_FEE }
      );

      expect(await pixelminterNFT.balanceOf(addr1.address)).to.equal(1);
      expect(await pixelminterNFT.ownerOf(1)).to.equal(addr1.address);
      expect(await pixelminterNFT.tokenURI(1)).to.equal(SAMPLE_TOKEN_URI);
      expect(await pixelminterNFT.totalSupply()).to.equal(1);
    });

    it("Should fail if mint fee is insufficient", async function () {
      await expect(
        pixelminterNFT.connect(addr1).mintNFT(
          addr1.address,
          SAMPLE_TOKEN_URI,
          { value: ethers.parseEther("0.0001") }
        )
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should fail with invalid recipient address", async function () {
      await expect(
        pixelminterNFT.connect(addr1).mintNFT(
          ethers.ZeroAddress,
          SAMPLE_TOKEN_URI,
          { value: INITIAL_MINT_FEE }
        )
      ).to.be.revertedWith("Invalid recipient address");
    });

    it("Should fail with empty token URI", async function () {
      await expect(
        pixelminterNFT.connect(addr1).mintNFT(
          addr1.address,
          "",
          { value: INITIAL_MINT_FEE }
        )
      ).to.be.revertedWith("Token URI cannot be empty");
    });

    it("Should emit NFTMinted event", async function () {
      await expect(
        pixelminterNFT.connect(addr1).mintNFT(
          addr1.address,
          SAMPLE_TOKEN_URI,
          { value: INITIAL_MINT_FEE }
        )
      )
        .to.emit(pixelminterNFT, "NFTMinted")
        .withArgs(addr1.address, 1, SAMPLE_TOKEN_URI, 1);
    });

    it("Should allow minting multiple NFTs", async function () {
      await pixelminterNFT.connect(addr1).mintNFT(
        addr1.address,
        "ipfs://token1",
        { value: INITIAL_MINT_FEE }
      );
      
      await pixelminterNFT.connect(addr2).mintNFT(
        addr2.address,
        "ipfs://token2",
        { value: INITIAL_MINT_FEE }
      );

      expect(await pixelminterNFT.totalSupply()).to.equal(2);
      expect(await pixelminterNFT.ownerOf(1)).to.equal(addr1.address);
      expect(await pixelminterNFT.ownerOf(2)).to.equal(addr2.address);
    });
  });

  describe("Fee Management", function () {
    it("Should allow owner to update mint fee", async function () {
      const newFee = ethers.parseEther("0.002");
      await pixelminterNFT.setMintFee(newFee);
      expect(await pixelminterNFT.getMintFee()).to.equal(newFee);
    });

    it("Should emit FeeUpdated event", async function () {
      const newFee = ethers.parseEther("0.002");
      await expect(pixelminterNFT.setMintFee(newFee))
        .to.emit(pixelminterNFT, "FeeUpdated")
        .withArgs(newFee);
    });

    it("Should not allow non-owner to update mint fee", async function () {
      const newFee = ethers.parseEther("0.002");
      await expect(
        pixelminterNFT.connect(addr1).setMintFee(newFee)
      ).to.be.reverted;
    });

    it("Should use new fee for subsequent mints", async function () {
      const newFee = ethers.parseEther("0.002");
      await pixelminterNFT.setMintFee(newFee);

      await expect(
        pixelminterNFT.connect(addr1).mintNFT(
          addr1.address,
          SAMPLE_TOKEN_URI,
          { value: INITIAL_MINT_FEE }
        )
      ).to.be.revertedWith("Insufficient payment");

      await pixelminterNFT.connect(addr1).mintNFT(
        addr1.address,
        SAMPLE_TOKEN_URI,
        { value: newFee }
      );

      expect(await pixelminterNFT.balanceOf(addr1.address)).to.equal(1);
    });
  });

  describe("Withdrawal", function () {
    beforeEach(async function () {
      // Mint some NFTs to accumulate fees
      await pixelminterNFT.connect(addr1).mintNFT(
        addr1.address,
        "ipfs://token1",
        { value: INITIAL_MINT_FEE }
      );
      
      await pixelminterNFT.connect(addr2).mintNFT(
        addr2.address,
        "ipfs://token2",
        { value: INITIAL_MINT_FEE }
      );
    });

    it("Should allow owner to withdraw contract balance", async function () {
      const contractBalance = await ethers.provider.getBalance(
        await pixelminterNFT.getAddress()
      );
      expect(contractBalance).to.equal(INITIAL_MINT_FEE * 2n);

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await pixelminterNFT.withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter).to.equal(
        ownerBalanceBefore + contractBalance - gasUsed
      );
    });

    it("Should not allow non-owner to withdraw", async function () {
      await expect(
        pixelminterNFT.connect(addr1).withdraw()
      ).to.be.reverted;
    });

    it("Should fail if contract has no balance", async function () {
      await pixelminterNFT.withdraw(); // Withdraw all
      
      await expect(
        pixelminterNFT.withdraw()
      ).to.be.revertedWith("No balance to withdraw");
    });
  });

  describe("ERC721 Standard Functions", function () {
    beforeEach(async function () {
      await pixelminterNFT.connect(addr1).mintNFT(
        addr1.address,
        SAMPLE_TOKEN_URI,
        { value: INITIAL_MINT_FEE }
      );
    });

    it("Should support ERC721 interface", async function () {
      // ERC721 interface ID
      expect(await pixelminterNFT.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("Should allow token transfer", async function () {
      await pixelminterNFT.connect(addr1).transferFrom(
        addr1.address,
        addr2.address,
        1
      );
      
      expect(await pixelminterNFT.ownerOf(1)).to.equal(addr2.address);
      expect(await pixelminterNFT.balanceOf(addr1.address)).to.equal(0);
      expect(await pixelminterNFT.balanceOf(addr2.address)).to.equal(1);
    });

    it("Should allow approve and transferFrom", async function () {
      await pixelminterNFT.connect(addr1).approve(addr2.address, 1);
      
      await pixelminterNFT.connect(addr2).transferFrom(
        addr1.address,
        addr2.address,
        1
      );
      
      expect(await pixelminterNFT.ownerOf(1)).to.equal(addr2.address);
    });
  });

  describe("Contract URI Management", function () {
    it("Should return the correct contract URI", async function () {
      expect(await pixelminterNFT.contractURI()).to.equal(CONTRACT_URI);
    });

    it("Should allow owner to update contract URI", async function () {
      const newContractURI = "ipfs://QmNewContractMetadata456";
      await pixelminterNFT.setContractURI(newContractURI);
      expect(await pixelminterNFT.contractURI()).to.equal(newContractURI);
    });

    it("Should not allow non-owner to update contract URI", async function () {
      const newContractURI = "ipfs://QmNewContractMetadata456";
      await expect(
        pixelminterNFT.connect(addr1).setContractURI(newContractURI)
      ).to.be.reverted;
    });
  });
});
