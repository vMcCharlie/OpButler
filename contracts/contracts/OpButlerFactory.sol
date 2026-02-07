// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./OpButlerWallet.sol";

contract OpButlerFactory {
    address public immutable implementation;
    mapping(address => address) public wallets;
    address[] public allWallets;

    event WalletCreated(address indexed user, address wallet);

    constructor(address _implementation) {
        implementation = _implementation;
    }

    function createWallet() external returns (address) {
        require(wallets[msg.sender] == address(0), "Wallet already exists");
        
        address clone = Clones.clone(implementation);
        OpButlerWallet(clone).initialize(msg.sender);
        
        wallets[msg.sender] = clone;
        allWallets.push(clone);
        
        emit WalletCreated(msg.sender, clone);
        return clone;
    }

    function getWallet(address user) external view returns (address) {
        return wallets[user];
    }
}
