import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import chalk from "chalk";
import { cp } from "fs";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const hre = require("hardhat");

const func: DeployFunction = async function () {
  const { fhenixjs, ethers } = hre;
  const { deploy } = hre.deployments;
  const signers = await ethers.getSigners();
  const signer = signers[0];
  

  const provider = ethers.provider;

  const wallet1 = new ethers.Wallet("0x4bbc98690ec915b9596ba388bfeea57d55ddede82aa75d28a1ca7eb06aa29cae", provider) as HardhatEthersSigner;
  const signerW = await provider.getSigner(wallet1.address);

  console.log(`Wallet1: ${wallet1.address}`);
  console.log(`SignerW: ${JSON.stringify(signerW)}`);

  if ((await ethers.provider.getBalance(wallet1.address)).toString() === "0") {
    if (hre.network.name === "localfhenix") {
      await fhenixjs.getFunds(wallet1.address);
    } else {
        console.log(
            chalk.red("Please fund your account with testnet FHE from https://faucet.fhenix.zone"));
        return;
    }
  }

  // for (let i = 0; i < signers.length; i++) {
  //   console.log(`Signer ${i}: ${signers[i].address} \n`);
  // } 

  const counter = await deploy("Counter", {
    from: signer.address,
    args: [],
    log: true,
    skipIfAlreadyDeployed: false,
  });

  console.log(`Counter contract: `, counter.address);


  // Deploy FundToken contract
  const fundToken = await deploy("FundToken", {
    from: signer.address,
    args: ["Fhenix", "tFHE", 10, wallet1.address],
    log: true,
    skipIfAlreadyDeployed: false,
  });

  console.log(`FundToken contract: `, fundToken.address);

  // // Deploy the FHERC20 contract
  // const fherc20 = await deploy("FHERC20", {
  //   from: signer.address,
  //   args: ["Fhenix", "tFHE"],
  //   log: true,
  //   skipIfAlreadyDeployed: false,
  // });

  // console.log(`FHERC20 contract: `, fherc20.address);

   // Deploy the NotFHriEr contract with the FHERC20 address
   const notFhrier = await deploy("NotFHriEr", {
     from: signer.address,
     args: [fundToken.address, wallet1.address],
     log: true,
     skipIfAlreadyDeployed: false,
   });

  console.log(`NotFHriEr contract: `, notFhrier.address);
  console.log(`NotFHriEr fee collector address: `, process.env.Account1);
};

export default func;
func.id = "deploy";
func.tags = ["Counter", "NotFHriEr"];
