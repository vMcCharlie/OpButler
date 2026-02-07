// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./interfaces/IVenus.sol";
import "./interfaces/IPancakeRouter.sol";

contract OpButlerWallet is Initializable {
    address public owner;
    address public constant TREASURY = 0x000000000000000000000000000000000000dEaD; // Placeholder for Mainnet Treasury
    uint256 public constant FEE_BPS = 10; // 0.1%

    event StrategyExecuted(address indexed user, address asset, uint256 amountIn, uint256 borrowedAmount);
    event StrategyUnwound(address indexed user, uint256 amountRepaid);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        _disableInitializers();
    }

    function initialize(address _owner) external initializer {
        owner = _owner;
    }

    /**
     * @notice Execute a leveraged long strategy
     * @param asset The underlying asset (e.g., WBNB)
     * @param vToken The Venus market token (e.g., vBNB)
     * @param borrowAsset The asset to borrow (e.g., USDT)
     * @param vBorrowToken The Venus market for borrow asset
     * @param amount The initial amount of capital in `asset`
     * @param borrowAmount The amount of `borrowAsset` to borrow (calculated by frontend)
     * @param router The PancakeSwap Router address
     * @param comptroller The Venus Comptroller address
     */
    function executeLoop(
        address asset,
        address vToken,
        address borrowAsset,
        address vBorrowToken,
        uint256 amount,
        uint256 borrowAmount,
        address router,
        address comptroller
    ) external onlyOwner {
        // 1. Fee Logic
        // Transfer 'amount' from user to this contract
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        
        uint256 fee = (amount * FEE_BPS) / 10000;
        uint256 investAmount = amount - fee;

        // Send Fee (placeholder)
        if (fee > 0) {
            IERC20(asset).transfer(TREASURY, fee);
        }

        // 2. Supply Initial Capital
        IERC20(asset).approve(vToken, investAmount);
        require(IVenusToken(vToken).mint(investAmount) == 0, "Mint failed");

        // 3. Enter Markets (Collateral)
        address[] memory markets = new address[](1);
        markets[0] = vToken;
        IVenusComptroller(comptroller).enterMarkets(markets);

        // 4. Borrow
        require(IVenusToken(vBorrowToken).borrow(borrowAmount) == 0, "Borrow failed");
        
        // 5. Swap Borrowed Asset -> Collateral Asset
        IERC20(borrowAsset).approve(router, borrowAmount);
        
        address[] memory path = new address[](2);
        path[0] = borrowAsset;
        path[1] = asset;
        
        uint[] memory amounts = IPancakeRouter02(router).swapExactTokensForTokens(
            borrowAmount,
            0, // Slippage handled by frontend logic or 0 for demo/risk
            path,
            address(this),
            block.timestamp
        );
        
        uint256 swappedAmount = amounts[1];

        // 6. Supply Swapped Amount
        IERC20(asset).approve(vToken, swappedAmount);
        require(IVenusToken(vToken).mint(swappedAmount) == 0, "Mint loop failed");

        emit StrategyExecuted(msg.sender, asset, amount, borrowAmount);
    }

    /**
     * @notice Unwind the strategy
     * @param asset The underlying collateral asset
     * @param vToken The Venus market token
     * @param borrowAsset The borrowed asset
     * @param vBorrowToken The Venus market for borrow asset
     * @param redeemAmount Amount of vToken to redeem (calculated by frontend to cover debt)
     * @param router PancakeSwap Router
     */
    function unwindLoop(
        address asset,
        address vToken,
        address borrowAsset,
        address vBorrowToken,
        uint256 redeemAmount,
        address router
    ) external onlyOwner {
        // 1. Redeem Collateral
        require(IVenusToken(vToken).redeem(redeemAmount) == 0, "Redeem failed");
        
        // 2. Calculate obtained asset amount
        // ideally balance check, but assume redeemed amount is in wallet now
        uint256 assetBalance = IERC20(asset).balanceOf(address(this));
        
        // 3. Swap Asset -> Borrow Asset to Repay
        // Need to know exact debt?
        // Let's get current borrow balance
        uint256 debt = IVenusToken(vBorrowToken).borrowBalanceCurrent(address(this));
        
        // For accurate repayment, we might need to swap slightly more?
        // Let's swap `assetBalance` entirely to `borrowAsset`? Or just enough?
        // Unwind usually means close everything.
        
        IERC20(asset).approve(router, assetBalance);
        
        address[] memory path = new address[](2);
        path[0] = asset;
        path[1] = borrowAsset;
        
        uint[] memory amounts = IPancakeRouter02(router).swapExactTokensForTokens(
            assetBalance,
            0,
            path,
            address(this),
            block.timestamp
        );
        
        uint256 repayAmount = amounts[1];
        if (repayAmount > debt) {
            repayAmount = debt;
        }

        // 4. Repay Borrow
        IERC20(borrowAsset).approve(vBorrowToken, repayAmount);
        require(IVenusToken(vBorrowToken).repayBorrow(repayAmount) == 0, "Repay failed");
        
        // 5. Redeem Remaining Collateral (Everything)
        uint256 remainingVToken = IERC20(vToken).balanceOf(address(this));
        if (remainingVToken > 0) {
            require(IVenusToken(vToken).redeem(remainingVToken) == 0, "Final redeem failed");
        }
        
        // 6. Return Funds to User
        uint256 finalAssetBalance = IERC20(asset).balanceOf(address(this));
        if (finalAssetBalance > 0) {
            IERC20(asset).transfer(msg.sender, finalAssetBalance);
        }
        
        uint256 finalBorrowBalance = IERC20(borrowAsset).balanceOf(address(this));
        if (finalBorrowBalance > 0) {
            IERC20(borrowAsset).transfer(msg.sender, finalBorrowBalance);
        }

        emit StrategyUnwound(msg.sender, repayAmount);
    }
}
