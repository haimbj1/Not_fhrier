import { Console } from "console";
import { FundToken, NotFHriEr } from "../types";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import {config as dotenvConfig} from "dotenv";
import {resolve} from "path";
import { createPermitForContract } from "../utils/instance";
import { BrowserProvider, parseUnits } from "ethers";
import {FhenixClient, Permit, Permission, getPermit, generatePermit, EncryptedUint128, EncryptedUint16, EncryptionTypes } from ".pnpm/fhenixjs@0.2.1/node_modules/fhenixjs";
import { Address } from "hardhat-deploy/types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";




dotenvConfig({ path: resolve(__dirname, "./.env") });

async function mintMyFunds(client: FhenixClient, contract: FundToken, contractAddress: Address, sender: HardhatEthersSigner, amount: number, permission: Permission) {
  let wfundContract = contract.connect(sender) as unknown as FundToken;
  let response = await wfundContract.balanceOfEncrypted(sender, permission);
  console.log("Got balance");
  let plaintext = client.unseal(contractAddress, response);
  console.log(`My Enc Balance pre-mint: ${plaintext}`);

  let answer = await wfundContract.balanceOf(sender.address);
  console.log(`My Balance post-mint: ${answer}`);
  
  console.log("Minting for: ", sender.address, " amount: ", amount);
  await wfundContract.mint(amount);
  console.log("Minted");


  await wfundContract.wrap(amount);

  response = await wfundContract.balanceOfEncrypted(sender, permission);
  plaintext = client.unseal(contractAddress, response);
  console.log(`My Enc Balance: ${plaintext}`);
  answer = await wfundContract.balanceOf(sender.address);
  console.log(`My Balance: ${answer}`);
}

async function traceBalances(client: FhenixClient, contract: FundToken, contractAddress: string, signer: any, permission: Permission) {
  console.log("Tracing balances");
  let response = await contract["balanceOfEncrypted(address,(bytes32,bytes))"](signer, permission);
  let plaintext = client.unseal(contractAddress, response);
  console.log("Got balance");
  console.log(`Account: ${signer.address} \n\tEnc Balance: ${plaintext}`);
  let answer = await contract.balanceOf(signer.address);
  console.log(`\tBalance: ${answer}\n`); 
}

task("task:mintPoster").setAction(async function (
  _taskArguments: TaskArguments,
  hre,
) {
  const { fhenixjs, ethers, deployments } = hre;
    // Get the contract factories
    const NotFHriEr = await deployments.get("NotFHriEr");
    const FundToken = await deployments.get("FundToken");
    const contract = (await ethers.getContractAt(
      "NotFHriEr",
      NotFHriEr.address,
    )) as unknown as unknown as NotFHriEr;
    const fundContract = (await ethers.getContractAt(
      "FundToken",
      FundToken.address,
    )) as unknown as FundToken as FundToken;
  
  
  const signers = await ethers.getSigners();
  const provider = ethers.provider;
  const client = new FhenixClient({ provider });
  let i = 0;
  const permit = await generatePermit(FundToken.address, provider, signers[i]) as Permit;
  client.storePermit(permit);
  const permission = client.extractPermitPermission(permit);
  //const funds = await fhenixjs.getFunds(signers[i].address);
  //console.log(`My funds: ${JSON.stringify(funds)}`);
  //await mintMyFunds(client, fundContract, FundToken.address, signers[i], 100000, permission);
  const eAmount = await fhenixjs.encrypt_uint128(BigInt(100000));
  //let ws = fundContract.connect(signers[0]);
  for(i = 0; i < signers.length; i++) {
    let permit1 = await client.generatePermit(FundToken.address, provider, signers[i]) as Permit;
    client.storePermit(permit1);
    let permission1 = client.extractPermitPermission(permit1); //This works good
    console.log("Minting for: ", signers[i].address);
    await fundContract.connect(signers[0]).mintEncrypted(signers[i].address, eAmount);
    await traceBalances(client, fundContract, FundToken.address, signers[i], permission1);
    console.log("Minted", i);
  }

  console.log("Done miniting");

});
