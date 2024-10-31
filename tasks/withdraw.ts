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

declare global {
  interface Window {
    ethereum: any;
  }
}

// async function postingJob(contractWithSigner: NotFHriEr, wrappingContract: FundToken, encyrptedSalary: inEuint128) {
//   await contractWithSigner.registerPoster("Microsoft", "https://microsoft.com");
//   await contractWithSigner.verifyMeAsPoster();
//   const feeCollector = await contractWithSigner.getWallet();
//   await wrappingContract.approveEncrypted(feeCollector, encyrptedSalary1);


// }

async function mintMyFunds(client: FhenixClient, contract: FundToken, contractAddress: Address, sender: HardhatEthersSigner, amount: number, permission: Permission) {
  let wfundContract = contract.connect(sender) as unknown as FundToken;
  console.log("Minting for: ", sender.address, " amount: ", amount);
  await wfundContract.mint(amount);

  let response = await wfundContract.balanceOfEncrypted(sender, permission);
  let plaintext = client.unseal(contractAddress, response);
  console.log(`My Enc Balance pre-mint: ${plaintext}`);

  let answer = await wfundContract.balanceOf(sender.address);
  console.log(`My Balance post-mint: ${answer}`);

  await wfundContract.wrap(amount);

  response = await wfundContract.balanceOfEncrypted(sender, permission);
  plaintext = client.unseal(contractAddress, response);
  console.log(`My Enc Balance: ${plaintext}`);
  answer = await wfundContract.balanceOf(sender.address);
  console.log(`My Balance: ${answer}`);
}


async function transfer(client: FhenixClient, contract: FundToken, contractAddress: Address, sender: HardhatEthersSigner, amount: number, recipient: Address, permission: Permission, fhenixjs: any) {
  const eAmount = await fhenixjs.encrypt_uint128(BigInt(amount));
  let wfundContract = contract.connect(sender) as unknown as FundToken;
  console.log("Trasnfering from: ", sender.address, " to: ", recipient, " amount: ", amount);
  let response = await wfundContract["balanceOfEncrypted(address,(bytes32,bytes))"](sender, permission);
  let plaintext = client.unseal(contractAddress, response);
  console.log(`My Enc Balance - pre tasnfer: ${plaintext}`);

  let answer = await wfundContract.approveEncrypted(sender.address, eAmount);


  const result = await wfundContract["transferFromEncrypted(address,address,uint256)"](sender.address, recipient, amount);

  response = await wfundContract["balanceOfEncrypted(address,(bytes32,bytes))"](sender, permission);
  plaintext = client.unseal(contractAddress, response);
  console.log(`My Enc Balance - post transfer: ${plaintext}`);

}

task("task:withdrawOwner").setAction(async function (
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
  

  
  //const signers = await ethers.getSigners();
  const provider = ethers.provider;
  const wallet1 = new ethers.Wallet("0x4bbc98690ec915b9596ba388bfeea57d55ddede82aa75d28a1ca7eb06aa29cae", provider);

  const client = new FhenixClient({ provider });
  const permit = await generatePermit(FundToken.address, provider, wallet1) as Permit;
  client.storePermit(permit);
  const permission = client.extractPermitPermission(permit);
  let response = await fundContract["balanceOfEncrypted(address,(bytes32,bytes))"](wallet1.address, permission);
  let plaintext = client.unseal(FundToken.address, response);
  console.log(`My Enc Balance: ${plaintext}`)
  let answer = await fundContract.balanceOf(wallet1.address);
  console.log(`My Balance: ${answer}`);

  await fundContract.connect(wallet1).unwrapToOwner(plaintext);

  response = await fundContract["balanceOfEncrypted(address,(bytes32,bytes))"](wallet1.address, permission);
  plaintext = client.unseal(FundToken.address, response);
  console.log(`My Enc Balance: ${plaintext}`)
  answer = await fundContract.balanceOf(wallet1.address);
  console.log(`My Balance: ${answer}`);





  // const permit = await fhenixjs.generatePermit(FundToken.address, provider, signers[0]);
  // client.storePermit(permit);
  // const permission = client.extractPermitPermission(permit);
  // const response = await fundContract.balanceOfEncrypted(signers[0].address, permission);
  // console.log(`Balance1: ${response}`);
  // const plaintext = client.unseal(signers[0].address, response);

  // console.log(`My Balance: ${plaintext}`)








  
/*

  const wallet1 = new ethers.Wallet(process.env.Account1pk, provider);


  const funds = await fhenixjs.getFunds(wallet1.address);

  let wrappingContract = fundContract.connect(wallet1) as unknown as FundToken;

  await wrappingContract.mint(10); 
  await wrappingContract.wrap(10);

  let contractWithSigner = contract.connect(signer) as unknown as NotFHriEr;

  await contractWithSigner.registerPoster("Microsoft", "https://microsoft.com");

  await contractWithSigner.verifyMeAsPoster();

  const encyrptedSalary1 = await fhenixjs.encrypt_uint128("10");
  const encyrptedSalary2 = await fhenixjs.encrypt_uint16(10);

  const feeCollector = await contractWithSigner.getWallet();
  console.log(`Fee Collector: ${feeCollector}`);

  
  await wrappingContract.approveEncrypted(feeCollector, encyrptedSalary1);
  console.log("Posting");

  await contractWithSigner.newPost("Software Engineer", encyrptedSalary1, encyrptedSalary2 , "Work hard and  get paid2", { value: 5});
  console.log("Done posting");
  await contractWithSigner.getFun().then((result) => { console.log(`My fun balance: ${result}`) });
  const encyrptedSalary3 = await fhenixjs.encrypt_uint16(3000);
  /*wrappingContract.approveEncrypted(signer.address, encyrptedSalary3);

  console.log("Posting2");
  await contractWithSigner.newPost("Product Manager", encyrptedSalary3 , "Work hard and  get paid2", );
  console.log("Done posting2");
  //const encyrptedSalary4 = await fhenixjs.encrypt_uint16(4000);

  //await contractWithSigner.newPost("Software Engineer", encyrptedSalary1 , "Work hard and  get paid2");
  //await contractWithSigner.newPost("Software Engineer", encyrptedSalary2 , "Work hard and  get paid1 - this should override");
  //await contractWithSigner.newPost("Product Manager", encyrptedSalary3 , "Work hard and  get paid2");
  //await contractWithSigner.newPost("Product Manager", encyrptedSalary4 , "Work hard and  get paid3");
  console.log("Done posting");
  await contractWithSigner.averageFor("Software Engineer").then((result) => { console.log(`${result}`) });
  await contractWithSigner.myStandings("Software Engineer").then((result) => { console.log(`My Standings: ${result}`) }); // ToDO - fix this timeout issues

  await contractWithSigner.registerSeeker();
  const encyrptedSalary = await fhenixjs.encrypt_uint16(800);
  await contractWithSigner.verifyMeAsSeeker();
  await contractWithSigner.giveMeEverything("Software Engineer", encyrptedSalary).then((result) => {
    console.log(`My result: ${result}`);
  });

  await contractWithSigner.giveMeSomething("Software Engineer", encyrptedSalary).then((result) => {
    console.log(`My result Something: ${result}`);
  });

  await contractWithSigner.getAllTitles().then((titles) => {
    console.log(`Titles: ${titles}`);
  });*/
});
