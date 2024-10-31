// SPDX-License-Identifier: MIT

pragma solidity >=0.8.13 <0.9.0;

import "@fhenixprotocol/contracts/FHE.sol";
// import "@openzeppelin/contracts/utils/Strings.sol";
// import {IFHERC20} from "@fhenixprotocol/contracts/experimental/token/FHERC20/IFHERC20.sol";
// import "@fhenixprotocol/contracts/experimental/token/FHERC20/FHERC20.sol";
// import {Console} from "@fhenixprotocol/contracts/utils/debug/Console.sol";
// import {Permissioned, Permission} from "@fhenixprotocol/contracts/access/Permissioned.sol";

library JobLibrary {
    struct JobPost {
        string description;
        euint16 maxSalary;
    }

    struct PosterInfo {
        bool isKYCVerified;
        bool isRegisterd;
        string name;
        string contactEmail;
    }

    struct SeekerInfo {
        bool isKYCVerified;
        bool isRegisterd;
        euint16 feeMultiplier;
        uint256 lastTimestamp;
        uint256[] latestSearchIndexes;
        string latestSearchTitle;
    }

    struct TitleInfo {
        euint16 sumSalary;
        address[] posters;
        mapping(address => bool) posted;
    }

    function getPairKey(address account, string memory id) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(account, id));
    }

    function verifyKYC() internal pure returns (bool) {
        return true;
    }

    function jobToString(
        mapping(bytes32 => JobPost) storage jobPosts,
        mapping(address => PosterInfo) storage posters,
        address poster,
        string memory title
    ) internal view returns (string memory) {
        JobPost memory job = jobPosts[getPairKey(poster, title)];
        PosterInfo memory posterInfo = posters[poster];
        if (posterInfo.isRegisterd == false) {
            return "";
        }
        return string(abi.encodePacked("\tTitle: ", title, "\n\t\tDescription: ", job.description, "\n\t\tCompany: ", posterInfo.name, "\n\t\tContact: ", posterInfo.contactEmail, "\n"));
    }

    function randMod(uint _modulus) internal view returns(uint) {
        require(_modulus > 0, "Modulus must be greater than 0");
        return uint(keccak256(abi.encodePacked(block.timestamp,msg.sender))) % _modulus;
    } 
}