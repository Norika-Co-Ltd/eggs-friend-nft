/* eslint-disable no-unused-vars */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, utils } from "ethers";
import { ethers } from "hardhat";
import { EggsFriendNFT } from "../typechain";

const stages = ["Whitelist", "Public"];

describe("NFTContract", function () {
  let owner: SignerWithAddress,
    signer: SignerWithAddress,
    addr: SignerWithAddress,
    addresses: SignerWithAddress[];
  let nftContract: EggsFriendNFT;

  beforeEach(async function () {
    [owner, signer, addr, ...addresses] = await ethers.getSigners();

    const NFTContract = await ethers.getContractFactory("EggsFriendNFT");
    nftContract = await NFTContract.deploy(signer.address);
    await nftContract.deployed();
  });

  it("Should be correct owner", async function () {
    expect(await nftContract.owner()).to.equal(owner.address);
  });

  it("Should be appendSaleConfig successfully", async function () {
    const startTimestamp = Math.floor(Date.now() / 1000);
    const endTimestamp = startTimestamp + 60 * 10;
    const saleIndex = 0;
    const stageIndex = stages.indexOf("Whitelist");

    await nftContract.setSaleConfig(
      saleIndex,
      startTimestamp,
      endTimestamp,
      ethers.utils.parseEther("0.5"),
      stageIndex
    );

    const saleConfig = await nftContract.saleConfigs(saleIndex);
    expect(saleConfig.startTime).to.equal(BigNumber.from(startTimestamp));
  });

  it("Should mintForGiveaway", async function () {
    await nftContract.mintForAirdrop([addr.address], 1);
    expect(await nftContract.balanceOf(addr.address)).to.equal(1);
    expect(await nftContract.ownerOf(1)).to.equal(addr.address);
  });

  it("Should mintForGiveaway over maxBatchAmount", async function () {
    await nftContract.mintForAirdrop([addr.address], 5);
    expect(await nftContract.balanceOf(addr.address)).to.equal(5);
  });

  it("Should publicSaleMint", async function () {
    const stageIndex = stages.indexOf("Public");
    const startTimestamp = Math.floor(Date.now() / 1000) - 10;
    const endTimestamp = startTimestamp + 60 * 10;
    const etherPrice = ethers.utils.parseEther("0.5");

    await nftContract.setSaleConfig(
      0,
      startTimestamp,
      endTimestamp,
      etherPrice,
      stageIndex
    );

    await nftContract.connect(addr).mint(1, { value: etherPrice });
    expect(await nftContract.balanceOf(addr.address)).to.equal(1);
  });

  it("Should isTicketAvailable", async function () {
    const stageIndex = stages.indexOf("Whitelist");
    const startTimestamp = Math.floor(Date.now() / 1000) - 10;
    const endTimestamp = startTimestamp + 60 * 10;
    const etherPrice = ethers.utils.parseEther("0.5");

    await nftContract.setSaleConfig(
      0,
      startTimestamp,
      endTimestamp,
      etherPrice,
      stageIndex
    );
    await nftContract.setCurrentSaleIndex(0);

    const address = utils.getAddress(addr.address);
    const ticketMessage = address;
    const messageHash = ethers.utils.solidityKeccak256(
      ["address", "string"],
      [address, ticketMessage]
    );
    const messageHashBinary = ethers.utils.arrayify(messageHash);
    const signature = await signer.signMessage(messageHashBinary);

    expect(
      await nftContract
        .connect(addr)
        .isTicketAvailable(ticketMessage, signature)
    ).to.equal(true);
  });

  it("Should whitelistMint", async function () {
    const addr = addresses[3];
    const stageIndex = stages.indexOf("Whitelist");
    const startTimestamp = Math.floor(Date.now() / 1000) - 10;
    const endTimestamp = startTimestamp + 60 * 10;
    const etherPrice = ethers.utils.parseEther("0.5");

    await nftContract.setSaleConfig(
      0,
      startTimestamp,
      endTimestamp,
      etherPrice,
      stageIndex
    );

    const address = utils.getAddress(addr.address);
    const ticketMessage = address;
    const messageHash = ethers.utils.solidityKeccak256(
      ["address", "string"],
      [address, ticketMessage]
    );
    const messageHashBinary = ethers.utils.arrayify(messageHash);
    const signature = await signer.signMessage(messageHashBinary);

    await nftContract.connect(addr).whitelistMint(1, ticketMessage, signature, {
      value: etherPrice,
    });
    expect(await nftContract.balanceOf(addr.address)).to.equal(1);
  });

  it("Should auto proceedSaleStageIfNeed to public", async function () {
    const stageIndex = stages.indexOf("Whitelist");
    const startTimestamp = Math.floor(Date.now() / 1000) - 60 * 10 - 10;
    const endTimestamp = startTimestamp + 60 * 10;
    const etherPrice = ethers.utils.parseEther("0.8");

    const nextStageIndex = stages.indexOf("Public");
    const nextStartTimestamp = Math.floor(Date.now() / 1000) - 10;
    const nextSndTimestamp = nextStartTimestamp + 60 * 10;
    const nextEtherPrice = ethers.utils.parseEther("3");

    await nftContract.setSaleConfig(
      0,
      startTimestamp,
      endTimestamp,
      etherPrice,
      stageIndex
    );

    await nftContract.setSaleConfig(
      1,
      nextStartTimestamp,
      nextSndTimestamp,
      nextEtherPrice,
      nextStageIndex
    );

    await nftContract.connect(addr).mint(1, { value: nextEtherPrice });
    expect(await nftContract.balanceOf(addr.address)).to.equal(1);
    expect(await nftContract.currentSaleIndex()).to.equal(1);
  });

  it("Should get currentSaleConfig", async function () {
    const stageIndex = stages.indexOf("Whitelist");
    const startTimestamp = Math.floor(Date.now() / 1000) - 60 * 10 - 10;
    const endTimestamp = startTimestamp + 60 * 10;
    const etherPrice = ethers.utils.parseEther("0.8");

    const nextStageIndex = stages.indexOf("Public");
    const nextStartTimestamp = Math.floor(Date.now() / 1000) - 10;
    const nextSndTimestamp = nextStartTimestamp + 60 * 10;
    const nextEtherPrice = ethers.utils.parseEther("3");

    await nftContract.setSaleConfig(
      0,
      startTimestamp,
      endTimestamp,
      etherPrice,
      stageIndex
    );

    await nftContract.setSaleConfig(
      1,
      nextStartTimestamp,
      nextSndTimestamp,
      nextEtherPrice,
      nextStageIndex
    );

    const saleConfig = await nftContract.currentSaleConfig();
    expect(saleConfig.stage).to.equal(nextStageIndex);
  });

  it("Should mintForGiveaway for multiple accounts", async function () {
    const mintAddresses = [addresses[5], addresses[6], addresses[7]];
    await nftContract.mintForAirdrop(
      mintAddresses.map((addr) => addr.address),
      1
    );
    expect(await nftContract.balanceOf(mintAddresses[0].address)).to.equal(1);
    expect(await nftContract.balanceOf(mintAddresses[1].address)).to.equal(1);
    expect(await nftContract.balanceOf(mintAddresses[2].address)).to.equal(1);
  });

  it("Test gas for mintForGiveaway", async function () {
    for (let i = 1; i < 10; i++) {
      const NFTContract = await ethers.getContractFactory("EggsFriendNFT");
      const nftContract = await NFTContract.deploy(signer.address);
      await nftContract.deployed();

      const mintAddresses = addresses.slice(i);
      await nftContract.mintForAirdrop(
        mintAddresses.map((addr) => addr.address),
        1
      );

      expect(await nftContract.balanceOf(mintAddresses[0].address)).to.equal(1);
    }
  });
});
