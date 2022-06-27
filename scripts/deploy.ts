// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers, run } from "hardhat";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const NftContract = await ethers.getContractFactory("TmiNFT");
  const nftContract = await NftContract.deploy(
    "0x9F4B0D94585A409D6070A1180331eac925231c3e"
  );
  await nftContract.deployed();

  const tx = await nftContract.setNotRevealedUri(
    "https://sgp1.digitaloceanspaces.com/nft-cdn/tmi/unreveal.json"
  );
  await tx.wait();

  await run("verify:verify", {
    address: nftContract.address,
    constructorArguments: ["0x9F4B0D94585A409D6070A1180331eac925231c3e"],
  });

  console.log("TmiNFT deployed to:", nftContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
