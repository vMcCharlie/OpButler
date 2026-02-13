// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./interfaces/IVenus.sol";
import "./interfaces/IPancakeRouter.sol";
import "./interfaces/IDODO.sol";

contract OpButlerWallet is Initializable, IDODOCallee {
    address public owner;
    address public constant TREASURY = 0x000000000000000000000000000000000000dEaD; // Placeholder for Mainnet Treasury
    uint256 public constant FEE_BPS = 10; // 0.1%

    // --- Events ---
    event Deposited(address indexed user, address asset, uint256 amount);
    event Withdrawn(address indexed user, address asset, uint256 amount);
    event StrategyExecuted(address indexed user, address asset, uint256 amountIn, uint256 borrowedAmount);
    event StrategyUnwound(address indexed user, uint256 amountRepaid);
    event FlashRepayExecuted(address indexed user, address debtToken, uint256 debtRepaid, address collateralToken, uint256 collateralRedeemed);

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

    receive() external payable {}

    // ========================================================================
    //                         DEPOSIT / WITHDRAW
    // ========================================================================

    /**
     * @notice Deposit ERC20 tokens into Venus
     * @param asset The underlying token address (e.g. USDT)
     * @param vToken The Venus vToken address (e.g. vUSDT)
     * @param amount Amount of underlying to deposit
     * @param comptroller The Venus Comptroller address
     */
    function deposit(
        address asset,
        address vToken,
        uint256 amount,
        address comptroller
    ) external onlyOwner {
        // Transfer from user
        IERC20(asset).transferFrom(msg.sender, address(this), amount);

        // Fee
        uint256 fee = (amount * FEE_BPS) / 10000;
        uint256 investAmount = amount - fee;
        if (fee > 0) {
            IERC20(asset).transfer(TREASURY, fee);
        }

        // Supply to Venus
        IERC20(asset).approve(vToken, investAmount);
        require(IVenusToken(vToken).mint(investAmount) == 0, "Mint failed");

        // Enter market (enable as collateral)
        address[] memory markets = new address[](1);
        markets[0] = vToken;
        IVenusComptroller(comptroller).enterMarkets(markets);

        emit Deposited(msg.sender, asset, investAmount);
    }

    /**
     * @notice Deposit BNB into Venus (payable)
     * @param vToken The vBNB address
     * @param comptroller The Venus Comptroller address
     */
    function depositBNB(
        address vToken,
        address comptroller
    ) external payable onlyOwner {
        require(msg.value > 0, "No BNB sent");

        uint256 fee = (msg.value * FEE_BPS) / 10000;
        uint256 investAmount = msg.value - fee;
        if (fee > 0) {
            payable(TREASURY).transfer(fee);
        }

        // vBNB.mint() is payable and takes no args
        (bool success, ) = vToken.call{value: investAmount}(
            abi.encodeWithSignature("mint()")
        );
        require(success, "BNB mint failed");

        // Enter market
        address[] memory markets = new address[](1);
        markets[0] = vToken;
        IVenusComptroller(comptroller).enterMarkets(markets);

        emit Deposited(msg.sender, address(0), investAmount);
    }

    /**
     * @notice Withdraw ERC20 tokens from Venus
     * @dev Will revert if the token is collateral backing active debt
     * @param asset The underlying token address
     * @param vToken The Venus vToken address
     * @param amount Amount of underlying to withdraw
     */
    function withdraw(
        address asset,
        address vToken,
        uint256 amount
    ) external onlyOwner {
        // Redeem underlying – this will REVERT if withdrawal causes shortfall
        require(IVenusToken(vToken).redeemUnderlying(amount) == 0, "Redeem failed - check collateral");

        // Transfer to owner
        IERC20(asset).transfer(msg.sender, amount);

        emit Withdrawn(msg.sender, asset, amount);
    }

    /**
     * @notice Withdraw BNB from Venus
     * @param vToken The vBNB address
     * @param amount Amount of BNB to withdraw (in wei)
     */
    function withdrawBNB(
        address vToken,
        uint256 amount
    ) external onlyOwner {
        require(IVenusToken(vToken).redeemUnderlying(amount) == 0, "Redeem failed - check collateral");
        payable(msg.sender).transfer(amount);

        emit Withdrawn(msg.sender, address(0), amount);
    }

    // ========================================================================
    //              FLASH REPAY & WITHDRAW (DODO Flash Loan)
    // ========================================================================

    /**
     * @notice Flash loan from DODO to repay Venus debt, then withdraw collateral
     * @param flashLoanPool DODO V2 pool address to flash loan from
     * @param debtToken The token we owe (e.g. USDT)
     * @param debtAmount Amount of debt to repay
     * @param collateralToken The collateral token to withdraw (e.g. WBNB)
     * @param vDebtToken Venus market for the debt (e.g. vUSDT)
     * @param vCollateralToken Venus market for the collateral (e.g. vBNB)
     * @param collateralAmount Amount of underlying collateral to redeem
     * @param router PancakeSwap router for swapping
     * @param comptroller Venus Comptroller
     * @param minSwapOutput Minimum output from PancakeSwap swap (slippage protection)
     */
    function flashRepayAndWithdraw(
        address flashLoanPool,
        address debtToken,
        uint256 debtAmount,
        address collateralToken,
        address vDebtToken,
        address vCollateralToken,
        uint256 collateralAmount,
        address router,
        address comptroller,
        uint256 minSwapOutput
    ) external onlyOwner {
        // Encode all params needed in the callback
        bytes memory data = abi.encode(
            msg.sender,          // user to return funds to
            flashLoanPool,
            debtToken,
            debtAmount,
            collateralToken,
            vDebtToken,
            vCollateralToken,
            collateralAmount,
            router,
            comptroller,
            minSwapOutput
        );

        // Determine if debtToken is base or quote in the DODO pool
        address flashLoanBase = IDODO(flashLoanPool)._BASE_TOKEN_();
        if (flashLoanBase == debtToken) {
            IDODO(flashLoanPool).flashLoan(debtAmount, 0, address(this), data);
        } else {
            IDODO(flashLoanPool).flashLoan(0, debtAmount, address(this), data);
        }
    }

    // --- DODO Callbacks ---

    function DVMFlashLoanCall(
        address sender,
        uint256 baseAmount,
        uint256 quoteAmount,
        bytes calldata data
    ) external override {
        _handleFlashLoanCallback(sender, baseAmount, quoteAmount, data);
    }

    function DPPFlashLoanCall(
        address sender,
        uint256 baseAmount,
        uint256 quoteAmount,
        bytes calldata data
    ) external override {
        _handleFlashLoanCallback(sender, baseAmount, quoteAmount, data);
    }

    function DSPFlashLoanCall(
        address sender,
        uint256 baseAmount,
        uint256 quoteAmount,
        bytes calldata data
    ) external override {
        _handleFlashLoanCallback(sender, baseAmount, quoteAmount, data);
    }

    /**
     * @dev Internal handler for all DODO flash loan callbacks
     */
    function _handleFlashLoanCallback(
        address sender,
        uint256,
        uint256,
        bytes calldata data
    ) internal {
        (
            address user,
            address flashLoanPool,
            address debtToken,
            uint256 debtAmount,
            address collateralToken,
            address vDebtToken,
            address vCollateralToken,
            uint256 collateralAmount,
            address router,
            address comptroller,
            uint256 minSwapOutput
        ) = abi.decode(data, (address, address, address, uint256, address, address, address, uint256, address, address, uint256));

        // Security: verify caller
        require(sender == address(this), "Invalid sender");
        require(msg.sender == flashLoanPool, "Invalid caller");

        // Step 1: Repay Venus debt
        IERC20(debtToken).approve(vDebtToken, debtAmount);
        require(IVenusToken(vDebtToken).repayBorrow(debtAmount) == 0, "Repay failed");

        // Step 2: Check if we can exit the collateral market
        // Only exit if borrow balance in that market is 0
        uint256 remainingBorrow = IVenusToken(vCollateralToken).borrowBalanceStored(address(this));
        if (remainingBorrow == 0) {
            IVenusComptroller(comptroller).exitMarket(vCollateralToken);
        }

        // Step 3: Redeem collateral
        require(IVenusToken(vCollateralToken).redeemUnderlying(collateralAmount) == 0, "Redeem collateral failed");

        // Step 4: Swap collateral -> debt token via PancakeSwap (if different tokens)
        if (collateralToken != debtToken) {
            IERC20(collateralToken).approve(router, collateralAmount);

            address[] memory path = new address[](2);
            path[0] = collateralToken;
            path[1] = debtToken;

            IPancakeRouter02(router).swapExactTokensForTokens(
                collateralAmount,
                minSwapOutput,
                path,
                address(this),
                block.timestamp
            );
        }

        // Step 5: Return flash loan to DODO pool
        uint256 debtTokenBalance = IERC20(debtToken).balanceOf(address(this));
        require(debtTokenBalance >= debtAmount, "Insufficient to repay flash loan");
        IERC20(debtToken).transfer(flashLoanPool, debtAmount);

        // Step 6: Send any remaining tokens back to the user
        uint256 remainingDebt = IERC20(debtToken).balanceOf(address(this));
        if (remainingDebt > 0) {
            IERC20(debtToken).transfer(user, remainingDebt);
        }

        uint256 remainingCollateral = IERC20(collateralToken).balanceOf(address(this));
        if (remainingCollateral > 0) {
            IERC20(collateralToken).transfer(user, remainingCollateral);
        }

        emit FlashRepayExecuted(user, debtToken, debtAmount, collateralToken, collateralAmount);
    }

    // ========================================================================
    //                    EXISTING STRATEGY FUNCTIONS
    // ========================================================================

    /**
     * @notice Execute a leveraged long strategy
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
        IERC20(asset).transferFrom(msg.sender, address(this), amount);

        uint256 fee = (amount * FEE_BPS) / 10000;
        uint256 investAmount = amount - fee;
        if (fee > 0) {
            IERC20(asset).transfer(TREASURY, fee);
        }

        // Supply Initial Capital
        IERC20(asset).approve(vToken, investAmount);
        require(IVenusToken(vToken).mint(investAmount) == 0, "Mint failed");

        // Enter Markets
        address[] memory markets = new address[](1);
        markets[0] = vToken;
        IVenusComptroller(comptroller).enterMarkets(markets);

        // Borrow
        require(IVenusToken(vBorrowToken).borrow(borrowAmount) == 0, "Borrow failed");

        // Swap Borrowed -> Collateral
        IERC20(borrowAsset).approve(router, borrowAmount);
        address[] memory path = new address[](2);
        path[0] = borrowAsset;
        path[1] = asset;

        uint[] memory amounts = IPancakeRouter02(router).swapExactTokensForTokens(
            borrowAmount, 0, path, address(this), block.timestamp
        );

        // Supply Swapped Amount
        uint256 swappedAmount = amounts[1];
        IERC20(asset).approve(vToken, swappedAmount);
        require(IVenusToken(vToken).mint(swappedAmount) == 0, "Mint loop failed");

        emit StrategyExecuted(msg.sender, asset, amount, borrowAmount);
    }

    /**
     * @notice Unwind the strategy
     */
    function unwindLoop(
        address asset,
        address vToken,
        address borrowAsset,
        address vBorrowToken,
        uint256 redeemAmount,
        address router
    ) external onlyOwner {
        // Redeem
        require(IVenusToken(vToken).redeem(redeemAmount) == 0, "Redeem failed");

        uint256 assetBalance = IERC20(asset).balanceOf(address(this));

        // Get debt
        uint256 debt = IVenusToken(vBorrowToken).borrowBalanceCurrent(address(this));

        // Swap Asset -> Borrow Asset
        IERC20(asset).approve(router, assetBalance);
        address[] memory path = new address[](2);
        path[0] = asset;
        path[1] = borrowAsset;

        uint[] memory amounts = IPancakeRouter02(router).swapExactTokensForTokens(
            assetBalance, 0, path, address(this), block.timestamp
        );

        uint256 repayAmount = amounts[1];
        if (repayAmount > debt) {
            repayAmount = debt;
        }

        // Repay
        IERC20(borrowAsset).approve(vBorrowToken, repayAmount);
        require(IVenusToken(vBorrowToken).repayBorrow(repayAmount) == 0, "Repay failed");

        // Redeem Remaining
        uint256 remainingVToken = IERC20(vToken).balanceOf(address(this));
        if (remainingVToken > 0) {
            require(IVenusToken(vToken).redeem(remainingVToken) == 0, "Final redeem failed");
        }

        // Return Funds
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

    /**
     * @notice Execute a Refinance (Move Loan) strategy
     */
    function executeRefinance(
        address oldVToken,
        address oldVDebtToken,
        address newVToken,
        address newVDebtToken,
        uint256 amount,
        uint256 debtAmount,
        address asset,
        address debtAsset,
        uint256 flashLoanFeeBps
    ) external onlyOwner {
        // Withdraw from old
        uint256 err = IVenusToken(oldVToken).redeem(amount);
        require(err == 0, "Redeem failed - LTV too high for atomic move without flashloan");

        // Supply to new
        IERC20(asset).approve(newVToken, amount);
        require(IVenusToken(newVToken).mint(amount) == 0, "Mint new failed");

        // Borrow from new
        require(IVenusToken(newVDebtToken).borrow(debtAmount) == 0, "Borrow new failed");

        // Repay old
        IERC20(debtAsset).approve(oldVDebtToken, debtAmount);
        require(IVenusToken(oldVDebtToken).repayBorrow(debtAmount) == 0, "Repay old failed");

        emit StrategyExecuted(msg.sender, asset, amount, debtAmount);
    }
}
