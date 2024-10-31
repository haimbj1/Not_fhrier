// SPDX-License-Identifier: MIT

pragma solidity >=0.8.13 <0.9.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import {IFHERC20} from "@fhenixprotocol/contracts/experimental/token/FHERC20/IFHERC20.sol";
import "@fhenixprotocol/contracts/experimental/token/FHERC20/FHERC20.sol";
import {Console} from "@fhenixprotocol/contracts/utils/debug/Console.sol";
import {Permissioned, Permission} from "@fhenixprotocol/contracts/access/Permissioned.sol";
import "./JobLibrary.sol";

contract NotFHriEr is Permissioned {
  // Address to collect the fees
  address payable public feeCollector;
  // FHE ERC20 contract
  IFHERC20 internal _wfhenix;
  euint16 internal feeForSeek;
  using JobLibrary for JobLibrary.JobPost;
  using JobLibrary for JobLibrary.TitleInfo;
  using JobLibrary for JobLibrary.SeekerInfo;
  using JobLibrary for JobLibrary.PosterInfo;

  // Mapping of job posts by poster address and title as pair
  mapping(bytes32 => JobLibrary.JobPost) private jobPosts;
  string[] private titles;
  mapping(string => JobLibrary.TitleInfo) titlesInfo;
  // Mapping of seekers and posters by address
  address[] private postersList;
  mapping(address => JobLibrary.PosterInfo) private posters;
  address[] private seekersList;
  mapping(address => JobLibrary.SeekerInfo) private seekers;

  function getWallet() public view returns (address) {
    return feeCollector;
  }

  // Modifier to check if the user is KYC verified
  modifier onlyKYCVerified() {
      require(seekers[msg.sender].isKYCVerified || posters[msg.sender].isKYCVerified, "KYC verification required");
      _;
  }
  modifier onlyPoster() {
    require(posters[msg.sender].isRegisterd == true, "Only the poster can perform this action, not registered");
    _;
  }
  modifier onlySeeker() {
      require(seekers[msg.sender].isRegisterd == true, "Only registered seekers can perform this action");
      _;
  }

  // Constructor to set the fee collector address
  constructor(address wfhenix, address feeCollector_) {
      feeCollector = payable(feeCollector_);
      _wfhenix = IFHERC20(wfhenix);
      feeForSeek = FHE.asEuint16(10);
  }

  function getResitrationInfo() public view returns (bool, bool) {
    return (posters[msg.sender].isRegisterd, seekers[msg.sender].isRegisterd);
  }

// Poster functions
  function registerPoster(string calldata name, string calldata contactEmail) public {
    Console.log("Registering poster", name);
    posters[msg.sender] = JobLibrary.PosterInfo(false, true, name, contactEmail);
    postersList.push(msg.sender);
    verifyMeAsPoster();
  }

  // This function is used to create a new job post, the poster can create a new job post with a title, encrypted value and description.
  // This will override the previous job post if the title already exists.
  function newPost(string calldata title, inEuint16 calldata encryptedValue16, string calldata description) public onlyPoster() onlyKYCVerified() {
    if (titlesInfo[title].posters.length == 0) {
      titles.push(title);
    }
    
    euint16 newSalary = FHE.asEuint16(encryptedValue16);
    bytes32 key = JobLibrary.getPairKey(msg.sender, title);
    titlesInfo[title].sumSalary = titlesInfo[title].sumSalary - jobPosts[key].maxSalary + newSalary;
 
    jobPosts[JobLibrary.getPairKey(msg.sender, title)] = JobLibrary.JobPost(description, newSalary);

    if(!titlesInfo[title].posted[msg.sender]) {
      titlesInfo[title].posters.push(msg.sender);
      titlesInfo[title].posted[msg.sender] = true;
    } 
    
    euint128 result = _wfhenix.transferFromEncrypted(msg.sender, feeCollector, FHE.asEuint128(newSalary));
    ebool res = result.gt(FHE.asEuint128(0));
    FHE.req(res);
  }

  // This function is used to update the salary of the job post, the poster can update the salary of the job post with a title and encrypted value.
  function updateMyPostSalary(string calldata title,  inEuint16 calldata encryptedValue)  public onlyPoster() {
    titlesInfo[title].sumSalary = titlesInfo[title].sumSalary - jobPosts[JobLibrary.getPairKey(msg.sender, title)].maxSalary + FHE.asEuint16(encryptedValue);
    jobPosts[JobLibrary.getPairKey(msg.sender, title)].maxSalary = FHE.asEuint16(encryptedValue);
  }

  function updateMyPostDescription(string calldata description, string memory title) public onlyPoster() {
    jobPosts[JobLibrary.getPairKey(msg.sender, title)].description = description;
  }

  function getBounds(string memory title) private view onlyPoster() returns (euint16, euint16) {
    euint16 average = titlesInfo[title].sumSalary / FHE.asEuint16(titlesInfo[title].posters.length);
    euint16 margin = average.shr(FHE.asEuint16(5)); // 3% margin
    euint16 upperBound = average.add(margin);
    euint16 lowerBound = average.sub(margin);
    return (upperBound, lowerBound);
  }

  // This function is used to check if the salary of the job post is above, below or within the average salary of the title.
  function isUpperOrUnder(euint16 current, euint16 upperBound, euint16 lowerBound) private pure returns (string memory) {
    // Assign 2 if the current salary is above the average salary, 1 if below and 0 if within the average salary
    // In order to avoid decrypt two comparisons results, we use select function to select the correct value and decrypt it
    euint16 range = FHE.select(upperBound.lt(current), FHE.asEuint16(2), FHE.asEuint16(lowerBound.gt(current)));
    uint16 rangeDecrypted = FHE.decrypt(range);

    if(rangeDecrypted == 2) {
      return "Above";
    } else if (rangeDecrypted == 1) {
      return "Below";
    }
    return "Within";
  }

  function myStandings(string memory title) public view onlyPoster() returns (string memory) {
    (euint16 upperBound, euint16 lowerBound) = getBounds(title); 
    euint16 current = jobPosts[JobLibrary.getPairKey(msg.sender, title)].maxSalary;

    return string(abi.encodePacked(isUpperOrUnder(current, upperBound, lowerBound), " the salary average of the title: ", title));
  }

// Seeker's functions
  function getAllTitles() public view onlySeeker() returns (string[] memory) {
    return titles;
  }

  function registerSeeker() public {
    Console.log("Registering seeker");
    seekers[msg.sender] = JobLibrary.SeekerInfo(false, true, FHE.asEuint16(1), 0, new uint256[](0), "");
    seekersList.push(msg.sender);
    verifyMeAsSeeker();
  }

  function verifyMeAsSeeker() public onlySeeker() {
    seekers[msg.sender].isKYCVerified = JobLibrary.verifyKYC();
  }

  function verifyMeAsPoster() public onlyPoster() {
    posters[msg.sender].isKYCVerified = JobLibrary.verifyKYC();
  }

  function jobToString(address poster, string memory title) private view onlySeeker() returns (string memory) {
    return JobLibrary.jobToString(jobPosts, posters, poster, title);
  }

  function getHoursSinceLastTransaction() public view returns (uint256) {
      require(seekers[msg.sender].lastTimestamp != 0, "No previous transaction found");
      uint256 differenceInSeconds = block.timestamp - seekers[msg.sender].lastTimestamp;
      uint256 differenceInHours = differenceInSeconds / 3600; // 3600 seconds in an hour
      return differenceInHours;
  }

  function updateTransactionTimestamp() internal {
    if(seekers[msg.sender].lastTimestamp != 0 &&
      getHoursSinceLastTransaction() > 24) {
      seekers[msg.sender].feeMultiplier = FHE.asEuint16(0);
    }
    seekers[msg.sender].lastTimestamp = block.timestamp;
  }

  function handleSeekFees() public onlySeeker() onlyKYCVerified() {
    updateTransactionTimestamp();
    euint128 result = _wfhenix.transferFromEncrypted(msg.sender, feeCollector, FHE.asEuint128(feeForSeek.shl(seekers[msg.sender].feeMultiplier)));
    Console.log("Fees", result.decrypt());
    FHE.req(result.gt(FHE.asEuint128(0))); 
    //seekers[msg.sender].feeMultiplier = seekers[msg.sender].feeMultiplier.add(FHE.asEuint16(1));
  }
  function getLatestSearch() public view onlySeeker() onlyKYCVerified() returns (string memory) {
    string memory result = "Found jobs:\n";
    bool found = false;
    for( uint256 i = 0; i < seekers[msg.sender].latestSearchIndexes.length; i++) {
      if(seekers[msg.sender].latestSearchIndexes[i] == 1) {
        result = string(abi.encodePacked(result, jobToString(titlesInfo[seekers[msg.sender].latestSearchTitle].posters[i], seekers[msg.sender].latestSearchTitle)));
        found = true;
      }
    }
    if(!found) {
      result = "No jobs found";
    }
    return result;
  }
  function setLatest(uint256[] memory indexes, string memory latestTitle) private{
    Console.log("1");
    seekers[msg.sender].latestSearchIndexes = indexes;
    seekers[msg.sender].latestSearchTitle = latestTitle;
  }

  function giveMeEverything(string memory title, inEuint16 calldata encryptedValue) public onlySeeker() onlyKYCVerified() {
    handleSeekFees();
    (uint256[] memory indexes, )= getRelevantIndexes(title, FHE.asEuint16(encryptedValue));
    setLatest(indexes, title);
  }

  function getRelevantIndexes(string memory title, euint16 encryptedValue) private view returns (uint256[] memory, uint256) {
    uint256[] memory indexes = new uint256[](titlesInfo[title].posters.length);
    uint256 count = 0;
    for (uint i = 0; i < titlesInfo[title].posters.length; i++) {
      // My minimum salary is less than the maximum salary of the job post
      address current = titlesInfo[title].posters[i];
      ebool inRange = encryptedValue.lte(jobPosts[JobLibrary.getPairKey(current, title)].maxSalary);
      if (FHE.decrypt(inRange) == true) {
        Console.log("fuckme");
        indexes[i] = 1;
        count++;
      } else {
        indexes[i] = 0;
      }

    }
    return (indexes, count);
  }

  function clearIrelevantIndexes(uint256[] memory indexes, uint256 times) private pure returns (uint256[] memory) {
    uint256 j = 0;
    uint256[] memory newIndexes = new uint256[](indexes.length);
    for (uint i = 0; i < indexes.length; i++) {
      newIndexes[i] = 0;
      if (indexes[i] == 1) {
        if (j == times) {
          newIndexes[i] = 1;
        }
        j++;
      }
    }
    return newIndexes;
  }

  function giveMeSomething(string memory title, inEuint16 calldata encryptedValue) public onlySeeker() onlyKYCVerified() {
    handleSeekFees();
    (uint256[] memory indexes, uint256 count)= getRelevantIndexes(title, FHE.asEuint16(encryptedValue));

    // No jobs found
    if (indexes.length > 0 && count > 0) {
      indexes = clearIrelevantIndexes(indexes, JobLibrary.randMod(count));
    }
    Console.log("Something", string(abi.encodePacked(indexes)));
    Console.log("Something", count);
    Console.log("Something", title);
    setLatest(indexes, title);
  }

}
