import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { FhenixClient } from 'fhenixjs';
import NotFHriEr  from 'NotFHriEr.json';

const App = () => {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [isPoster, setIsPoster] = useState(false);
  const [isSeeker, setIsSeeker] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [salary, setSalary] = useState(0);
  // const [jobList, setJobList] = useState([]);
  const [foundJob, setFoundJob] = useState('');

  // Address of deployed NotFHriEr contract
  const contractAddress = "0xBa3137328a0f8499193ff6FcD8a13F96D4dC0903"; // Replace with your deployed contract address

  useEffect(() => {
    // Initialize BrowserProvider and connect to MetaMask
    async function initializeProvider() {
      if (window.ethereum) {
        try {
          // Request MetaMask connection
          await window.ethereum.request({ method: "eth_requestAccounts" });
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          console.log("signer", signer);
          const address = await signer.getAddress();
          console.log("address", address);
          setAccount(address);

          // Initialize contract
          const jobContract = new ethers.Contract(contractAddress, NotFHriEr.abi, signer);
          setContract(jobContract);
          console.log("Connected to contract at:", contractAddress);
        } catch (error) {
          console.error("Error connecting to wallet:", error);
        }
      } else {
        console.log("MetaMask not found. Please install it.");
      }
    }

    initializeProvider();
  }, []);

  // Register as a poster
  const registerAsPoster = async (name, email) => {
    console.log("account", account);
    console.log("Registering as poster... before if");
    if (contract) {
      try {
        console.log("Registering as poster...");
        const tx = await contract.registerPoster(name, email);
        await tx.wait();
        console.log(`Registered as poster: ${name}`);
        setIsPoster(true);
      } catch (error) {
        console.error("Error registering as poster:", error);
      }
    }
  };

  // Register as a job seeker
  const registerAsSeeker = async () => {
    if (contract) {
      try {
        console.log("Registering as job seeker...");
        const tx = await contract.registerSeeker();
        await tx.wait();
        console.log("Registered as job seeker");
        setIsSeeker(true);
      } catch (error) {
        console.error("Error registering as seeker:", error);
      }
    }
  };

  // Post a new job
  const postNewJob = async () => {
    if (contract) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        console.log("Provider initialized", provider);
        const client = new FhenixClient({ provider });
        console.log("Fhenix Client initialized", client);

        // Encrypt salary using Fhenix
        const encryptedSalary = await client.encrypt_uint16(salary);
        console.log("Encrypted salary:", encryptedSalary);

        const tx = await contract.newPost(jobTitle, encryptedSalary, jobDescription);
        await tx.wait();
        console.log(`Posted new job: ${jobTitle}`);
      } catch (error) {
        console.error("Error posting new job:", error);
      }
    }
  };

  // Search for a job based on title and salary
  const searchJob = async () => {
    if (contract) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const client = new FhenixClient({ provider });

        // Encrypt salary using Fhenix
        const encryptedSalary = await client.encrypt_uint16(salary);

        const result = await contract.giveMeSomething(jobTitle, encryptedSalary);
        setFoundJob(result);
        console.log("Found job:", result);
      } catch (error) {
        console.error("Error searching job:", error);
      }
    }
  };

  return (
    <div>
      <h1>Job Marketplace - Fhenix</h1>
      <p>Connected Account: {account}</p>

      <div>
        <h2>Register as Poster</h2>
        <button onClick={() => registerAsPoster("Company A", "companyA@example.com")}>Register as Poster</button>
      </div>

      <div>
        <h2>Register as Seeker</h2>
        <button onClick={registerAsSeeker}>Register as Seeker</button>
      </div>

      {isPoster && (
        <div>
          <h2>Post a New Job</h2>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Job Title"
          />
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Job Description"
          />
          <input
            type="number"
            value={salary}
            onChange={(e) => setSalary(Number(e.target.value))}
            placeholder="Salary"
          />
          <button onClick={postNewJob}>Post Job</button>
        </div>
      )}

      {isSeeker && (
        <div>
          <h2>Search for a Job</h2>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Job Title"
          />
          <input
            type="number"
            value={salary}
            onChange={(e) => setSalary(Number(e.target.value))}
            placeholder="Desired Salary"
          />
          <button onClick={searchJob}>Search Job</button>
        </div>
      )}

      {foundJob && (
        <div>
          <h2>Found Job</h2>
          <p>{foundJob}</p>
        </div>
      )}
    </div>
  );
};

export default App;
