import { Console } from "console";
import { FundToken, NotFHriEr } from "../types";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { FhenixClient, getPermit, Permit, Permission } from ".pnpm/fhenixjs@0.2.1/node_modules/fhenixjs";


/*
//const provider = new ethers.BrowserProvider(window.ethereum);
  //const client = new FhenixClient({ provider });


  // async function getEncryptedBalance() {
  //   // Step 1: Generate the permission (off-chain)
  //   const permit = await getPermit(NotFHriEr.address, provider); // Generate permit for contract interaction
  //   const permission = client.extractPermitPermissions(permit); // Extract the permission from the permit

  //   // Step 2: Call balanceOfEncrypted with the Permission object
  //   const encryptedBalance = await fundContract.balanceOfEncrypted(permission);

  //   console.log("Encrypted balance: ", encryptedBalance);
  // }

  //getEncryptedBalance();
  // await wcFund1.mint(1);
  // await wcFund1.wrap(1);
  // const amount = await fhenixjs.encrypt_uint128("2");
  // const spender = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  // await wcFund1.approveEncrypted(spender, amount);


// Connect with both wallets
/**
 * The Main wallet should be the one that is connected to the contract
 * Another wallet should be connected to the contract as well the second wallet will post a job and would like to pay for it.
 *
 


  // // Create a wallet instance from the mnemonic
  // const wallet = ethers.Wallet.fromPhrase("demand hotel mass rally sphere tiger measure sick spoon evoke fashion comfort");

  // // Get the private key
  // const privateKey = wallet.privateKey;
  // for (let i = 0; i < signers.length; i++) {
  //   if (wallet.address === signers[i].address) {
  //     console.log(`Signer ${i}: ${signers[i].address} \n`);
  //   }
  // }


  // console.log(`Address: ${wallet.address}`);
  // console.log(`Private Key: ${privateKey}`);

*/
class JobPoster {
  companyName: string;
  companyMail: string;

  constructor(companyName: string, companyMail: string) {
    this.companyName = companyName;
    this.companyMail = companyMail;
  }
}
class JobPost {
  title: string;
  description: string;
  salary: number;

  constructor(title: string, description: string, salary: number) {
    this.title = title;
    this.description = description;
    this.salary = salary;
  }
}


async function traceBalances(client: FhenixClient, contract: FundToken, contractAddress: string, signer: any, permission: Permission) {
  let response = await contract["balanceOfEncrypted(address,(bytes32,bytes))"](signer, permission);
  let plaintext = client.unseal(contractAddress, response);
  console.log(`Account: ${signer.address} \n\tEnc Balance: ${plaintext}`);
  let answer = await contract.balanceOf(signer.address);
  console.log(`\tBalance: ${answer}\n`); 
}

async function registerAndVerifyPoster(contract: NotFHriEr, companyName: string, companyMail: string) {
  await contract.registerPoster(companyName, companyMail);
  await contract.verifyMeAsPoster();  
}

async function postJob(fhenixjs: any, contract: NotFHriEr, fundContract: FundToken, desiredSalary: number, JobTitle: string, JobDescription: string) {
  const eSalary128 = await fhenixjs.encrypt_uint128(desiredSalary.toString());
  const eSalary16 = await fhenixjs.encrypt_uint16(desiredSalary);

  const feeCollector = await contract.getWallet();
  await fundContract.approveEncrypted(feeCollector, eSalary128);
  await contract.newPost(JobTitle, eSalary16 , JobDescription);
}

async function postForCompany(fhenixjs: any, contract: NotFHriEr, fundContract: FundToken, jobPoster: JobPoster, jobPost: JobPost) {
  await registerAndVerifyPoster(contract, jobPoster.companyName, jobPoster.companyMail);
  await postJob(fhenixjs, contract, fundContract, jobPost.salary, jobPost.title, jobPost.description);
}

async function approveMe(amount: number, fhenixjs: any, fundContract: FundToken, contract: NotFHriEr, signer: any, feeCollector: string) {
  console.log("Approving")
  const eAmount = await fhenixjs.encrypt_uint128(BigInt(amount));
  await fundContract.connect(signer).approveEncrypted(feeCollector, eAmount);
  console.log("Approved"); 
}

async function giveMe(fhenixjs: any, contract: NotFHriEr, title: string, salary: number, everything: boolean) {
  const eSalary = await fhenixjs.encrypt_uint16(salary);

  if (everything) {
    console.log("looking for every match");
    const tx = await contract.giveMeEverything(title, eSalary);
    await tx.wait();
  } else {
    console.log("looking for any match");
    const tx = await contract.giveMeSomething(title, eSalary);
    await tx.wait();
  }

  await contract.getLatestSearch().then((job) => {
    console.log(`Search Results: ${job}`);
  });
}

task("task:seeker").setAction(async function (
  _taskArguments: TaskArguments,
  hre,
) {
  const { fhenixjs, ethers, deployments } = hre;
  const signers = await ethers.getSigners();
  const provider = ethers.provider;

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
  )) as unknown as unknown as FundToken;

  const client = new FhenixClient({ provider });
  let i = 0;
  // initiate seeker
  let contractWithSigner = contract.connect(signers[i]);
  await contractWithSigner.registerSeeker();
  await contractWithSigner.verifyMeAsSeeker();
  //const salary = await fhenixjs.encrypt_uint16(800);
//  const eAmount = await fhenixjs.encrypt_uint128(BigInt(1000));

  await contractWithSigner.getAllTitles().then((titles) => {  
    console.log(`Titles: ${titles}`);
  } );

  console.log("Seeker registered and verified");
  const feeCollector = await contractWithSigner.getWallet();

  await approveMe(1000, fhenixjs, fundContract, contract, signers[i], feeCollector);

  //await giveMe(fhenixjs, contractWithSigner, "Software Engineer", 800, true);
  console.log("Expecting 0 results");
  await giveMe(fhenixjs, contractWithSigner, "Software Engineer", 800, false);
  // console.log("Expecting 1 results");
  // await giveMe(fhenixjs, contractWithSigner, "Software Engineer", 700, true);
  // console.log("Expecting 2 results");
  // await giveMe(fhenixjs, contractWithSigner, "Software Engineer", 400, true);
  console.log("Expecting 1 results");
  await giveMe(fhenixjs, contractWithSigner, "Software Engineer", 400, false);
  // console.log("Expecting 2 results");
  // await giveMe(fhenixjs, contractWithSigner, "Software Engineer", 100, true);
  //await giveMe(fhenixjs, contractWithSigner, "marketing", 100, false);
  //await giveMe(fhenixjs, contractWithSigner, "marketing", 100, false);

});
