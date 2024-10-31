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

async function postJob2(client: FhenixClient, contract: NotFHriEr, fundContract: FundToken, desiredSalary: number, JobTitle: string, JobDescription: string) {
  const eSalary128 = await client.encrypt_uint128(desiredSalary.toString());
  const eSalary16 = await client.encrypt_uint16(desiredSalary);

  const feeCollector = await contract.getWallet();
  await fundContract.approveEncrypted(feeCollector, eSalary128);
  await contract.newPost(JobTitle, eSalary16 , JobDescription);
}

async function postForCompany(fhenixjs: any, contract: NotFHriEr, fundContract: FundToken, jobPoster: JobPoster, jobPost: JobPost) {
  await registerAndVerifyPoster(contract, jobPoster.companyName, jobPoster.companyMail);
  await postJob(fhenixjs, contract, fundContract, jobPost.salary, jobPost.title, jobPost.description);
}

task("task:fhrier").setAction(async function (
  _taskArguments: TaskArguments,
  hre,
) {
  const { fhenixjs, ethers, deployments } = hre;
  const signers = await ethers.getSigners();
  const provider = ethers.provider;
  const signer = signers[0];

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

//"0x4bbc98690ec915b9596ba388bfeea57d55ddede82aa75d28a1ca7eb06aa29cae"
  // const wallet1 = new ethers.Wallet(process.env.Account1pk, provider);

  // const player1 = "0xdE9B2329C64Cb04fe74b8227897C007005d93850";
  // console.log(`Wallet1: ${wallet1.address}`);


  // let wcFund1 = fundContract.connect(wallet1) as unknown as FundToken;
  // const mnemonics = "demand hotel mass rally sphere tiger measure sick spoon evoke fashion comfort";

  // const wallet = ethers.HDNodeWallet.fromMnemonic(mnemonics, "m/44'/60'/0'/0");

  // // Get the private key
  // const privateKey = wallet.privateKey;
  // for (let i = 0; i < signers.length; i++) {
  //   if (wallet.address === signers[i].address) {
  //     console.log(`Signer ${i}: ${signers[i].address} \n`);
  //   }
  // }
  // console.log(`Address: ${wallet.address}`);
  // console.log(`Private Key: ${privateKey}`);
  

  // console.log(`FundToken contract address: ${FundToken.address}`);
  // console.log(`My address: ${signer.address}`);
  //const funds = await fhenixjs.getFunds(signer.address);

  //const encryptedFunds = await fhenixjs.getFunds(signer.address);

//  let wrappingContract = fundContract.connect(signer) as unknown as FundToken;
  // await wrappingContract.balanceOf(signer.address).then((result) => {
  //   console.log(`My FHE balance: ${result}`);
  // });
  //await wrappingContract.mint(10000000); // I need to implement this, payable function
  //await wrappingContract.wrap(10000000);


  const client = new FhenixClient({ provider });
  
  console.log("poster 1", signers[0].address);
  const permit = await getPermit(FundToken.address, provider) as Permit;
  client.storePermit(permit);
  const permission = client.extractPermitPermission(permit); //This works good

  await traceBalances(client, fundContract, FundToken.address, signer, permission);
  let contractWithS0 = contract.connect(signers[0]) as unknown as NotFHriEr;
  await registerAndVerifyPoster(contractWithS0, "Microsoft", "careers@microsoft.com");
  await postJob2(client, contractWithS0, fundContract, 700, "Software Engineer", "Work hard and  get paid2");
  await traceBalances(client, fundContract, FundToken.address, signer, permission);
  

  console.log("poster 2", signers[1].address);
  // Permissions
  const permit1 = await client.generatePermit(FundToken.address, provider, signers[1]) as Permit;
  client.storePermit(permit1);
  const permission1 = client.extractPermitPermission(permit1); //This works good
  //Contract bindings with signers
  let fundWithS1 = fundContract.connect(signers[1]) as unknown as FundToken;
  let contractWithS1 = contract.connect(signers[1]) as unknown as NotFHriEr;

  //body of operations
  await traceBalances(client, fundWithS1, FundToken.address, signers[1], permission1);
  await registerAndVerifyPoster(contractWithS1, "Google", "careers@google.com");
  await postJob(fhenixjs, contractWithS1, fundWithS1, 400, "Software Engineer", "Work hard we pay more");
  await traceBalances(client, fundWithS1, FundToken.address, signers[1], permission1);

  // await contractWithS0.updateMyPostDescription("Software Engineer", "Work hard and  get paid3");
  // await contractWithS0.updateMyPostSalary("Software Engineer", await fhenixjs.encrypt_uint16(1500));

  await contractWithS1.myStandings("Software Engineer").then((result) => {
    console.log(`My standings: ${result}`);
  });
});
