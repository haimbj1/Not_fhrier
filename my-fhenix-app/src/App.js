import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { FhenixClient } from 'fhenixjs';
import NotFHriEr from './NotFHriEr.json';
import FundToken from './FundToken.json';
import axios from 'axios';


// Modal Component for displaying job results
const Modal = ({ show, onClose, children }) => {
  if (!show) {
    return null;
  }

  return (
    <div style={modalOverlayStyle}>
      <div style={modalStyle}>
        <h2 style={{
          fontSize: '1.5rem', // Increase font size
          fontWeight: 'bold', // Make text bold
          color: '#34495e', // Change color to a darker shade
          margin: '0 0 15px', // Add margin below the header
          paddingBottom: '10px', // Optional: add padding below
          borderBottom: '2px solid #3498db', // Optional: add a bottom border
        }}>
          Job Found
        </h2>
        <div style={{ fontWeight: 'bold' }}>
          {children}
        </div>
        <button style={buttonStyle} onClick={onClose}>Close</button>
      </div>
    </div>
  );
  
};

const App = () => {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(null); // New state variable for balance
  const [contract, setContract] = useState(false);
  const [client, setClient] = useState(null);
  const [fundContract, setFundContract] = useState(null);
  const [role, setRole] = useState(''); // Poster or Seeker
  const [jobTitle, setJobTitle] = useState('');
  const [titleSearch, setTitleSearch] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyMail, setCompanyMail] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [salary, setSalary] = useState(0);
  const [foundJob, setFoundJob] = useState('');
  const [showModal, setShowModal] = useState(false); // Modal visibility state
  const [standingResult, setStandingResult] = useState(false);
  const [runEverything, setRunEverything] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [expandPostJob, setExpandPostJob] = useState(false); // State for expanding/condensing Post Job section
  const [expandMyStanding, setExpandMyStanding] = useState(false); // State for expanding/condensing My Standing section
  const [feeCollector, setFeeCollector] = useState(false);


  useEffect(() => {
    async function initializeProvider() {
      if (window.ethereum) {
        try {
          await window.ethereum.request({ method: "eth_requestAccounts" });
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          const client = new FhenixClient({ provider });
          setClient(client);
          setAccount(address);
          const balance = await provider.getBalance(address);
          setBalance(parseFloat(ethers.formatEther(balance)).toFixed(2));
          const jobContract = new ethers.Contract(NotFHriEr.address, NotFHriEr.abi, signer);
          const fundContract = new ethers.Contract(FundToken.address, FundToken.abi, signer);

          setFeeCollector(await jobContract.getWallet());
          setContract(jobContract);
          setFundContract(fundContract);
        } catch (error) {
          console.error("Error connecting to wallet:", error);
        }
      } else {
        console.log("MetaMask not found. Please install it.");
      }
    }

    initializeProvider();
    
  }, []);

  useEffect(() => {
    const jobsInterval = setInterval(async () => {
      if (contract) {
        try {
          const jobs = await contract.getAllTitles();
          setJobs(jobs);
        } catch (error) {
          console.error("Error fetching job titles:", error);
        }
      }
    }, 2000); // Poll every 2 seconds
  
    return () => {
      clearInterval(jobsInterval); // Cleanup interval on component unmount
    };
  }, [contract]); // Include 'contract' in the dependency array

  useEffect(() => { 
    const interval = setInterval(async () => {
      if (account) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const newBalance = await provider.getBalance(account);
        const formattedBalance = parseFloat(ethers.formatEther(newBalance)).toFixed(2);
        if (formattedBalance !== balance) {
          setBalance(formattedBalance);
        }
      }
    }, 1000); // Poll every 10 seconds

    

    return () => {
      clearInterval(interval); // Cleanup jobs interval on component unmount
    };
  }, [account, balance]);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
        const balance = await provider.getBalance(address);
        setBalance(parseFloat(ethers.formatEther(balance)).toFixed(2));
      } catch (error) {
        console.error("Error connecting to wallet:", error);
      }
    } else {
      console.log("MetaMask not found. Please install it.");
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setBalance(null);
  };

  const faucet = async () => {
    try {
    const response = await axios.get(`http://localhost:42000/faucet?address=${account}`);

    if (response.status !== 200) {
      console.error("Failed to get funds from faucet:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error getting funds from faucet:", error);
    }
  };
  
  const formatAccount = (account) => {
    return `${account.slice(0, 5)}...${account.slice(-5)}`;
  };

  const registerAsPoster = async (name, email) => {
    setLoading(true);
    if (contract) {
      try {
        const tx = await contract.registerPoster(name, email);
        await tx.wait();
        // await contract.verifyMeAsPoster();
        setIsRegistered(true);
      } catch (error) {
        console.error("Error registering as poster:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const registerAsSeeker = async () => {
    setLoading(true);
    if (contract) {
      try {
        const tx = await contract.registerSeeker();
        await tx.wait();
        // await contract.verifyMeAsSeeker();
        setJobs(await contract.getAllTitles());
      } catch (error) {
        console.error("Error registering as seeker:", error);
      } finally {
        setLoading(false);
      }
    }
  };



  const postNewJob = async () => {
    setLoading(true);
    if (contract) {
      try {
        const encryptedSalary = await client.encrypt_uint16(salary);
        const eSalary128 = await client.encrypt_uint128(BigInt(salary));
        await fundContract.approveEncrypted(feeCollector, eSalary128);
        const tx = await contract.newPost(jobTitle, encryptedSalary, jobDescription);
        await tx.wait();
      } catch (error) {
        console.error("Error posting new job:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const myStanding = async () => {
    setLoading(true);
    if (contract) {
      try {
        //setStandingResult("Hell2o");
        debugger;
        const result = await contract.myStandings(jobTitle);
        setStandingResult(result);

      } catch (error) {
        console.error("Error myStanding:", error);
      } finally {
        setLoading(false);
      }
    }
    setLoading(false);
  } 


  const searchJob = async () => {
    setLoading(true);
    if (contract) {
      try {
        debugger;
        const encryptedSalary = await client.encrypt_uint16(salary);
        console.log("Searching for job with title:", titleSearch);
        const eFee = await client.encrypt_uint128(BigInt(1000)); //should be enough for 24hours
        await fundContract.approveEncrypted(feeCollector, eFee);
        if(runEverything) {
          const tx = await contract.giveMeEverything(titleSearch, encryptedSalary);
          tx.wait();
        } else {
          const tx = await contract.giveMeSomething(titleSearch, encryptedSalary);
          tx.wait();
        }
        const result = await contract.getLatestSearch();
        console.log("Got:", result);
        setFoundJob(result);
      } catch (error) {
        console.error("Error searching job:", error);
      } finally {
        setLoading(false);
      }
    }
  };
  const clearFields = () => {
    setJobTitle('');
    setJobDescription('');
    setSalary(0);
    setFoundJob('');
    setStandingResult('');
    setRunEverything(false);
  };

  return (
    <div style={containerStyle}>
           <header style={headerStyle}>
        <h1 style={headlineStyle}>Not FHriEr - Job Marketplace</h1>
        <div style={accountInfoStyle}>
          {account ? (
            <>
              <p style={accountStyle}>Connected Account: {formatAccount(account)}</p>
              {balance && <p style={balanceStyle}>Balance: {balance} TFHE</p>}
              <button style={buttonStyle} onClick={disconnectWallet}>Disconnect</button>
              <button style={buttonStyle} onClick={faucet}>Faucet</button>
            </>
          ) : (
            <>
            <button style={buttonStyle} onClick={connectWallet}>Connect Wallet</button>
            </>
          )}
        </div>
      </header>
      

      {!role && (
        <div style={roleSelectionStyle}>
          <h2>Choose your role:</h2>
          <button style={buttonStyle} onClick={() => {setRole('poster'); clearFields();}}>I am a Poster</button>
          <button style={buttonStyle} onClick={() => {setRole('seeker'); clearFields();}}>I am a Seeker</button>
        </div>
      )}
      
      {role && (
        <button style={backButtonStyle} onClick={() => setRole(null)}>Back</button>
      )}

      {role === 'poster' && (
        <div style={boxStyle}>
          <h2>Register as Poster</h2>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Company Name"
            style={inputStyle}
          />
          <div>
          <input
            type="text"
            value={companyMail}
            onChange={(e) => setCompanyMail(e.target.value)}
            placeholder="Company Email"
            style={inputStyle}
          />
          </div>
          <button 
            style={buttonStyle} 
            onClick={() => registerAsPoster(companyName, companyMail)}
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register as Poster'}
          </button>
          
          {isRegistered && (
        <>
          <div style={boxStyle}>
            <h2 onClick={() => setExpandPostJob(!expandPostJob)} style={{ cursor: 'pointer' }}>
              Post a New Job {expandPostJob ? '▲' : '▼'}
            </h2>
            {expandPostJob && (
              <>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Job Title"
                  style={inputStyle}
                />
                <div>
                <input
                  type="text"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Job Description"
                  style={textareaStyle}
                />
                </div>
                <input
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(Number(e.target.value))}
                  placeholder="Desired Salary"
                  style={inputStyle}
                />
                <div>
                <button 
                  style={buttonStyle} 
                  onClick={postNewJob}
                  disabled={loading}
                >
                  {loading ? 'Posting...' : 'Post Job'}
                </button>
                </div>
              </>
            )}
          </div>

          <div style={boxStyle}>
            <h2 onClick={() => setExpandMyStanding(!expandMyStanding)} style={{ cursor: 'pointer' }}>
              Check My Standing {expandMyStanding ? '▲' : '▼'}
            </h2>
            {expandMyStanding && (
              <>
                <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Job Title"
                style={inputStyle}
              />
              <button 
                style={buttonStyle} 
                onClick={myStanding}
                disabled={loading}
              >
                {loading ? 'Checking...' : 'Check My Standing'}
              </button>
              {standingResult && (
                  <p style={{ marginTop: '10px', color: '#34495e' }}>{standingResult}</p>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
      )}

      {role === 'seeker' && (
        <div style={boxStyle}>
          <h2>Register as Seeker</h2>
          <div>
            <button 
              style={buttonStyle} 
              onClick={registerAsSeeker} 
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register as Seeker'}
            </button>
          </div>
          
          <h2>Search for a Job</h2>
          <select
            value={titleSearch}
            onChange={(e) => setTitleSearch(e.target.value)}
            style={{ margin: '10px', padding: '10px', fontSize: '16px' }}
          >
            <option value="" disabled>Select Job Title</option>
            {jobs.map((job, index) => (
              <option key={index} value={job}>{job}</option>
            ))}
          </select>
          <div>
          <label style={{ fontSize: '14px', marginBottom: '5px' }}>Desired Salary</label>
          <input
            type="number"
            value={salary}
            onChange={(e) => setSalary(Number(e.target.value))}
            placeholder="Desired Salary"
            style={{ margin: '5px', padding: '5px', fontSize: '14px', width: '60px' }}
          />
          </div>
          <div>
          <label>
          <input
            style={buttonStyle} 
            type="checkbox"
            checked={runEverything}
            onChange={(e) => setRunEverything(e.target.checked)}
          />
          Find Everything
          </label>
          </div>
          <div>
          <button 
            style={buttonStyle} 
            onClick={searchJob} 
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search Job'}
          </button>
          </div>
          <div style={{ padding: '20px', background: '#ffffff', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 10px', color: '#34495e' }}>Job Details</h2>
          {foundJob.split('\n')[0].includes('No jobs found') ? (
            <p>{foundJob.split('\n')[0]}</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Title</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Description</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Company</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Contact</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const rows = [];
                  let currentRow = { title: '', description: '', company: '', contact: '' };

                  foundJob.split('\n').forEach((line) => {
                    const [key, value] = line.split(':');
                    if (!value) return;

                    const trimmedKey = key.trim().toLowerCase();
                    const trimmedValue = value.trim();

                    if (trimmedKey.includes('title')) {
                      if (currentRow.title) {
                        rows.push(currentRow);
                      }
                      currentRow = { title: trimmedValue, description: '', company: '', contact: '' };
                    } else if (trimmedKey.includes('description')) {
                      currentRow.description = trimmedValue;
                    } else if (trimmedKey.includes('company')) {
                      currentRow.company = trimmedValue;
                    } else if (trimmedKey.includes('contact')) {
                      currentRow.contact = trimmedValue;
                    }
                  });

                  if (currentRow.title) {
                    rows.push(currentRow);
                  }

                  return rows.map((row, index) => (
                    <tr key={index}>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{row.title}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{row.description}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{row.company}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{row.contact}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          )}
        </div>
        </div>
      )}

      {/* Modal for displaying found job */}
      <Modal show={showModal} onClose={() => setShowModal(false)}>
        <div style={{ padding: '20px', background: '#ffffff', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 10px', color: '#34495e' }}>Job Details</h2>
          <div style={{ fontSize: '1.1rem', lineHeight: '1.5', color: '#2c3e50' }}>
            {foundJob.split('\n').map((line, index) => (
              <p key={index} style={{ margin: '0 0 15px', fontWeight: 'bold' }}>{line}</p>
            ))}
          </div>
        </div>
      </Modal>

    </div>
  );
  
};

// Modal Styles
const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const modalStyle = {
  backgroundColor: '#fff',
  padding: '20px',
  borderRadius: '5px',
  textAlign: 'center',
};

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  textAlign: 'center'
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'center', // Center the text horizontally
  alignItems: 'center', // Center the text vertically
  width: '100%',
  padding: '10px 20px',
  backgroundColor: '#2c3e50',
  color: '#fff',
  borderRadius: '8px',
  position: 'fixed', // Fix the header to the top of the page
  top: '0', // Position it at the top
  left: '0', // Ensure it spans the full width
  zIndex: '1000' // Ensure it stays on top of other elements
};

const headlineStyle = {
  fontSize: '2.5rem',
  color: '#ecf0f1',
  margin: '0'
};

const accountInfoStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  position: 'absolute',
  top: '80px',
  right: '50px',
};

const accountStyle = {
  fontSize: '1.2rem',
  color: '#34485e',
  borderRadius: '5px',
  marginBottom: '1px'
};

const balanceStyle = {
  fontSize: '1.2rem',
  color: '#34485e',
  borderRadius: '5px',
  marginBottom: '1px'
};

const roleSelectionStyle = {
  margin: '20px 0',
};

const buttonStyle = {
  backgroundColor: '#3498db',
  color: '#fff',
  border: 'none',
  padding: '10px 20px',
  borderRadius: '5px',
  cursor: 'pointer',
  margin: '10px',
};

const inputStyle = {
  width: '100%',
  padding: '10px',
  margin: '10px 0',
  borderRadius: '5px',
  border: '1px solid #ccc',
};

const textareaStyle = {
  width: '100%',
  padding: '10px',
  margin: '10px 0',
  borderRadius: '5px',
  border: '1px solid #ccc',
  height: '100px',
};

const backButtonStyle = {
  padding: '10px 20px',
  fontSize: '16px',
  cursor: 'pointer',
  margin: '10px',
  backgroundColor: '#e74c3c',
  color: '#fff',
  border: 'none',
  borderRadius: '5px'
};

const boxStyle = {
  border: '1px solid #eee',
  padding: '20px',
  borderRadius: '5px',
  margin: '20px 0',
  textAlign: 'left',
};

export default App;
