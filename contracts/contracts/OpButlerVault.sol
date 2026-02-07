// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IVenusComptroller {
    function enterMarkets(address[] calldata vTokens) external returns (uint[] memory);
    function getAccountLiquidity(address account) external view returns (uint, uint, uint);
}

interface IVToken is IERC20 {
    function mint(uint mintAmount) external returns (uint);
    function redeem(uint redeemTokens) external returns (uint);
    function borrow(uint borrowAmount) external returns (uint);
    function repayBorrow(uint repayAmount) external returns (uint);
    function underlying() external view returns (address);
    function exchangeRateStored() external view returns (uint);
}

interface IVBNB {
    function mint() external payable;
    function redeem(uint redeemTokens) external returns (uint);
    function borrow(uint borrowAmount) external returns (uint);
    function repayBorrow() external payable;
}

contract OpButlerVault is Ownable, ReentrancyGuard {
    // Treasury Address for fees
    address public treasury;
    uint256 public constant FEE_BPS = 10; // 0.1%

    // Mapping of user shares per asset
    mapping(address => mapping(address => uint256)) public userShares;
    mapping(address => uint256) public totalShares;

    // Supported Assets
    mapping(address => address) public assetToVToken;
    address public constant WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
    
    event Deposit(address indexed user, address indexed asset, uint256 amount, uint256 fee);
    event Withdraw(address indexed user, address indexed asset, uint256 amount);

    constructor(address _treasury) {
        treasury = _treasury;
    }

    receive() external payable {}

    function setVToken(address asset, address vToken) external onlyOwner {
        assetToVToken[asset] = vToken;
    }

    // Deposit ERC20 (e.g. USDT)
    function deposit(address asset, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(assetToVToken[asset] != address(0), "Asset not supported");

        // Transfer from user
        IERC20(asset).transferFrom(msg.sender, address(this), amount);

        // Take Fee
        uint256 fee = (amount * FEE_BPS) / 10000;
        uint256 netAmount = amount - fee;

        if (fee > 0) {
            IERC20(asset).transfer(treasury, fee);
        }

        // Supply to Venus
        address vToken = assetToVToken[asset];
        IERC20(asset).approve(vToken, netAmount);
        require(IVToken(vToken).mint(netAmount) == 0, "Mint failed");

        // Issue Shares (1:1 with Underlying for simplicity in MVP)
        // Real Vault would calculate based on TotalAssets / TotalShares
        userShares[msg.sender][asset] += netAmount;
        totalShares[asset] += netAmount;

        emit Deposit(msg.sender, asset, netAmount, fee);
    }

    // Deposit BNB
    function depositBNB() external payable nonReentrant {
        require(msg.value > 0, "Amount must be > 0");
        
        uint256 amount = msg.value;
        uint256 fee = (amount * FEE_BPS) / 10000;
        uint256 netAmount = amount - fee;

        if (fee > 0) {
            payable(treasury).transfer(fee);
        }

        // Supply to Venus (vBNB)
        // Assuming asset address for BNB logic is address(0) or WBNB mapping
        address vBNB = assetToVToken[address(0)]; // Use 0x0 for BNB
        require(vBNB != address(0), "BNB not supported");
        
        IVBNB(vBNB).mint{value: netAmount}();

        // Issue Shares
        userShares[msg.sender][address(0)] += netAmount;
        totalShares[address(0)] += netAmount;

        emit Deposit(msg.sender, address(0), netAmount, fee);
    }

    // Execute Strategy (Admin Only for safety in pooled model)
    function executeLeverage(address asset, uint256 borrowAmount) external onlyOwner {
        address vToken = assetToVToken[asset];
        require(IVToken(vToken).borrow(borrowAmount) == 0, "Borrow failed");
        
        // Loop: Resupply borrowed amount
        if (asset == address(0)) {
            IVBNB(vToken).mint{value: address(this).balance}();
        } else {
            uint256 balance = IERC20(asset).balanceOf(address(this));
            IERC20(asset).approve(vToken, balance);
            require(IVToken(vToken).mint(balance) == 0, "Loop mint failed");
        }
    }
}
