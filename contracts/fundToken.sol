// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19 <0.9.0;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import { FHE, euint128, inEuint128 } from "@fhenixprotocol/contracts/FHE.sol";
import { IFHERC20 } from "@fhenixprotocol/contracts/experimental/token/FHERC20/IFHERC20.sol";
import {Console} from "@fhenixprotocol/contracts/utils/debug/Console.sol";

import "@fhenixprotocol/contracts/access/Permissioned.sol";

error ErrorInsufficientFunds();
error ERC20InvalidApprover(address);
error ERC20InvalidSpender(address);

contract FundToken is IFHERC20, ERC20, Permissioned, Ownable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    // A mapping from address to an encrypted balance.
    mapping(address => euint128) internal _encBalances;

    // A mapping from address (owner) to a mapping of address (spender) to an encrypted amount.
    mapping(address => mapping(address => euint128)) internal _allowed;
    
    euint128 internal totalEncryptedSupply = FHE.asEuint128(0);

    uint8 private _customDecimals;

    constructor(string memory name, string memory symbol, uint8 decimals_, address owner_) ERC20(name, symbol) Ownable(owner_) {
        _customDecimals = decimals_;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
    }

    function decimals() public view virtual override returns (uint8) {
        return _customDecimals;
    }

    function _allowanceEncrypted(address owner, address spender) internal view returns (euint128) {
        return _allowed[owner][spender];
    }

    function allowanceEncrypted(
        address spender,
        Permission calldata permission
    ) public view virtual onlyPermitted(permission, msg.sender) returns (string memory) {
        return FHE.sealoutput(_allowanceEncrypted(msg.sender, spender), permission.publicKey);
    }

    function allowanceEncrypted(
        address owner,
        address spender,
        Permission calldata permission
    ) public view virtual onlyPermitted(permission, owner) returns (string memory) {
        return FHE.sealoutput(_allowanceEncrypted(owner, spender), permission.publicKey);
    }

    function approveEncrypted(address spender, inEuint128 calldata value) public virtual returns (bool) {
        _approve(msg.sender, spender, FHE.asEuint128(value));
        return true;
    }

    function _approve(address owner, address spender, euint128 value) internal {
        Console.log("Approving");
        Console.log("Owner is", owner);
        Console.log("Spender is", spender); //feeCollector
        Console.log("Value is", value.decrypt());
        if (owner == address(0)) {
            revert ERC20InvalidApprover(address(0));
        }
        if (spender == address(0)) {
            revert ERC20InvalidSpender(address(0));
        }
        //Console.log("Override allowence value ", value.decrypt());
        _allowed[owner][spender] = value;
        Console.log("Allowing spend from: ", owner);
        Console.log("by: ", spender);
        Console.log("Approved ", _allowed[owner][spender].decrypt());
    }

    function _spendAllowance(address owner, address spender, euint128 value) internal virtual returns (euint128) {
        Console.log("Spending allowance");
        Console.log("Owner is", owner);
        Console.log("Spender is", spender); 
        Console.log("Value is", value.decrypt());
        euint128 currentAllowance = _allowanceEncrypted(owner, spender);
        Console.log("Current allowance is", currentAllowance.decrypt());
        euint128 spent = FHE.min(currentAllowance, value);
        Console.log("Spent is", spent.decrypt());
        _approve(owner, spender, (currentAllowance - spent));
        Console.log("New allowance is", _allowanceEncrypted(owner, spender).decrypt());
        return spent;
    }

    function transferFromEncrypted(address from, address to, inEuint128 calldata value) public virtual returns (euint128) {
        Console.log("Transferring0");
        Console.log("Transferring from ", from);
        Console.log("Transferring to ", to);
        
        return transferFromEncrypted(from, to, FHE.asEuint128(value));
    }

    function transferFromEncrypted(address from, address to, euint128 value) public virtual returns (euint128) {
        Console.log("");
        Console.log("Transferring");
        Console.log("Transferring from ", from);
        Console.log("Transferring to ", to);   
        Console.log("Transferring value ", value.decrypt());
        euint128 val = value;
        euint128 spent = _spendAllowance(from, to, val);
        Console.log("Spent ", spent.decrypt());
        return _transferImpl(from, to, spent);
    }

    function wrap(uint128 amount) public {
        Console.log("Wrapping ", amount);
        if (balanceOf(msg.sender) < amount) {
            Console.log("Insufficient funds");
            revert ErrorInsufficientFunds();
        }
        _burn(msg.sender, amount);
        euint128 eAmount = FHE.asEuint128(amount);
        _encBalances[msg.sender] = _encBalances[msg.sender] + eAmount;
        Console.log("Encrypted balance updated", _encBalances[msg.sender].decrypt());
        Console.log(string(abi.encodePacked("Sender is", msg.sender)));
        totalEncryptedSupply = totalEncryptedSupply + eAmount;
    }

    function unwrap(uint128 amount) public {
        euint128 encAmount = FHE.asEuint128(amount);
        Console.log("Unwrapping ", amount);
        euint128 amountToUnwrap = FHE.select(_encBalances[msg.sender].gte(encAmount), encAmount, FHE.asEuint128(0));
        Console.log("Amount to unwrap ", amountToUnwrap.decrypt());
        _encBalances[msg.sender] = _encBalances[msg.sender] - amountToUnwrap;
        Console.log("Encrypted balance updated", _encBalances[msg.sender].decrypt());
        totalEncryptedSupply = totalEncryptedSupply - amountToUnwrap;
        Console.log("_mint will bw called with ");
        _mint(msg.sender, FHE.decrypt(amountToUnwrap));
    }

    function unwrapToOwner(uint128 amount) public onlyOwner {
        Console.log("I'm the owner ", owner());
        Console.log("I'm sender ", msg.sender);
        euint128 encAmount = FHE.asEuint128(amount);
        Console.log("Unwrapping ", amount);
        euint128 amountToUnwrap = FHE.select(_encBalances[owner()].gte(encAmount), encAmount, FHE.asEuint128(0));
        Console.log("Amount to unwrap ", amountToUnwrap.decrypt());
        _encBalances[owner()] = _encBalances[owner()] - amountToUnwrap;
        Console.log("Encrypted balance updated", _encBalances[owner()].decrypt());
        totalEncryptedSupply = totalEncryptedSupply - amountToUnwrap;
        Console.log("_mint will bw called with ");
        _mint(owner(), FHE.decrypt(amountToUnwrap));
    }

    function mint(uint256 amount) public onlyRole(MINTER_ROLE) {
        Console.log("Minting ", amount);
        _mint(msg.sender, amount);
    }

    function mintEncrypted(address to, inEuint128 calldata encryptedAmount) public onlyRole(MINTER_ROLE) {
        _mintEncrypted(to, FHE.asEuint128(encryptedAmount));
    }

    function _mintEncrypted(address to, euint128 amount) internal {
        _encBalances[to] = _encBalances[to] + amount;
        totalEncryptedSupply = totalEncryptedSupply + amount;
    }

    function burnFromEncrypted(address account, inEuint128 calldata encryptedAmount) public onlyRole(BURNER_ROLE) {
        _burnFromEncrypted(account, FHE.asEuint128(encryptedAmount));
    }

    function _burnFromEncrypted(address account, euint128 amount) internal {
        euint128 amountToBurn = FHE.select(_encBalances[account].gte(amount), amount, FHE.asEuint128(0));

        _encBalances[account] = _encBalances[account] - amountToBurn;
        totalEncryptedSupply = totalEncryptedSupply - amountToBurn;
    }

    function transferEncrypted(address to, inEuint128 calldata encryptedAmount) public returns (euint128) {
        return transferEncrypted(to, FHE.asEuint128(encryptedAmount));
    }

    // Transfers an amount from the message sender address to the `to` address.
    function transferEncrypted(address to, euint128 value) public returns (euint128) {
        return _transferImpl(msg.sender, to, value);
    }

    // Transfers an encrypted amount.
    function _transferImpl(address from, address to, euint128 amount) internal returns (euint128) {
        // Make sure the sender has enough tokens.
        Console.log("Transfering ", amount.decrypt());
        Console.log("Current balance", _encBalances[from].decrypt());
        Console.log("Sender is", from);
        euint128 amountToSend = FHE.select(amount.lte(_encBalances[from]), amount, FHE.asEuint128(0));

        // Add to the balance of `to` and subract from the balance of `from`.
        _encBalances[to] = _encBalances[to] + amountToSend;
        _encBalances[from] = _encBalances[from] - amountToSend;

        return amountToSend;
    }

    function balanceOfEncrypted(address account, Permission memory auth) public view virtual onlyPermitted(auth, account) returns (string memory) {
        return _encBalances[account].seal(auth.publicKey);
    }

    function balanceOfEncrypted() public view virtual returns (euint128) {
        return _encBalances[msg.sender];
    }
}

