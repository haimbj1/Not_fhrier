# Not FHriEr - dApp

## Project Overview

**Not FHriEr** is a decentralized job marketplace connecting companies and job seekers through a salary-matching algorithm that ensures privacy and fairness. Companies can list job openings as "Posters," setting a hidden maximum salary, while "Seekers" enter a minimum desired salary to find jobs that meet their expectations. The platform uses Fully Homomorphic Encryption (FHE) and wrapping tokens to protect financial data and enforce secure, encrypted transactions.

## Features

### Core Functionalities
- **Posters (Employers)**:
  - List open positions with hidden maximum salaries.
  - Update salary or job descriptions as needed.
  - Retrieve salary comparison standings for listed roles.

- **Seekers (Job Seekers)**:
  - Search for jobs by title and salary expectations.
  - Access role descriptions and company details upon KYC verification.
  - Perform secure searches with fees based on usage patterns.

### Security & Fees
- **Salary Range Anonymity**: Keeps average salary data private by categorizing standings into general ranges.
- **Search Fees**: Uses an exponential backoff mechanism to prevent excessive searches, with a 24-hour cooldown.
- **Transaction Security**: Utilizes a wrapping token (IFHERC20-compliant FundToken) to encrypt all transactions.

## Technologies Used
- **Solidity**
- **Fhenix Network** (for FHE)
- **IFHERC20 Token Standard**

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/haimbj1/Not_fhrier.git
   ```
2. Navigate into the project directory and install dependencies:
   ```bash
   cd not-fhrier
   npm install
   ```

## Usage

1. **Start the dApp**: Follow steps to set up your local blockchain (e.g., using Ganache) and deploy the smart contract.
2. **Interact with the dApp**:
   - Posters can add job listings, update roles, and check average salary ranges.
   - Seekers can search for roles, request information, and view available jobs that meet their minimum salary.

## API Endpoints

### Posters API
- **NewPost**: Adds a new job listing.
- **UpdateMyPostSalary**: Updates job salary once daily.
- **myPercentile**: Displays salary comparison standings (Below P50, P50, P75, P90, and above).

### Seekers API
- **SeekSpecific**: Searches by title and company.
- **giveMeSomething**: Retrieves a random job listing with verified access.
- **giveMeEverything**: Lists all matching job listings with descriptions and company emails.

