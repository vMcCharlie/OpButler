// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title OpLoopVault V3
 * @author OpButler
 * @notice Cross-asset leverage vault with flash deleverage on BSC
 *
 * Features:
 *  1. Input token flexibility — user sends any token (incl. BNB),
 *     contract swaps to supplyAsset automatically.
 *  2. User-owned positions — supply/borrow on behalf of user.
 *     aTokens + debt tokens live in user's wallet → visible on dashboard.
 *     Requires credit delegation approval for borrow.
 *  3. Flash deleverage — atomic unwind of leveraged positions via PCS flash swap.
 *
 * Supported protocols: Kinza (Aave V3), Radiant (Aave V2), Venus (Compound).
 * Venus positions remain contract-owned (no onBehalfOf support).
 */

// ============================================================================
//                          INTERFACES
// ============================================================================

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IWBNB {
    function deposit() external payable;
    function withdraw(uint wad) external;
}

interface IPancakePair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
}

interface IPancakeFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IPancakeRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

interface IVToken {
    function mint(uint256 mintAmount) external returns (uint256);
    function borrow(uint256 borrowAmount) external returns (uint256);
    function repayBorrow(uint256 repayAmount) external returns (uint256);
    function redeem(uint256 redeemTokens) external returns (uint256);
    function redeemUnderlying(uint256 redeemAmount) external returns (uint256);
}

interface IComptroller {
    function enterMarkets(address[] calldata vTokens) external returns (uint256[] memory);
}

interface IKinzaPool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external;
    function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external returns (uint256);
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

interface IRadiantLendingPool {
    function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external;
    function repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf) external returns (uint256);
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

// ============================================================================
//                          CONTRACT
// ============================================================================

contract OpLoopVaultV3 {

    enum Protocol { Venus, Kinza, Radiant }
    enum Operation { Leverage, Deleverage }

    address public owner;
    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // BSC Mainnet
    address public constant VENUS_COMPTROLLER = 0xfD36E2c2a6789Db23113685031d7F16329158384;
    address public constant KINZA_POOL        = 0xcB0620b181140e57D1C0D8b724cde623cA963c8C;
    address public constant RADIANT_POOL      = 0xCcf31D54C3A94f67b8cEFF8DD771DE5846dA032c;
    address public constant PANCAKE_ROUTER    = 0x10ED43C718714eb63d5aA57B78B54704E256024E;
    address public constant PANCAKE_FACTORY   = 0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73;
    address public constant WBNB              = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;

    struct FlashParams {
        Operation operation;
        address user;
        address supplyAsset;
        address borrowAsset;
        address aToken;          // Protocol's aToken (for deleverage withdraw)
        address vTokenSupply;    // Venus only
        address vTokenBorrow;    // Venus only
        uint256 flashAmount;     // Amount flash-swapped from PCS
        uint256 userAmount;      // Leverage: supply amount | Deleverage: aToken withdraw amount
        uint256 borrowAmount;    // Leverage: borrow amount | Deleverage: debt repay amount
        Protocol protocol;
        address pancakePair;
    }

    event LoopExecuted(
        address indexed user,
        address indexed supplyAsset,
        address indexed borrowAsset,
        Protocol protocol,
        uint256 userDeposit,
        uint256 totalSupplied,
        uint256 totalBorrowed
    );

    event LoopUnwound(
        address indexed user,
        address indexed supplyAsset,
        address indexed borrowAsset,
        Protocol protocol,
        uint256 debtRepaid,
        uint256 collateralWithdrawn
    );

    event OwnershipTransferred(address indexed prev, address indexed next);
    event EmergencyWithdraw(address indexed token, uint256 amount);

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Ownable: not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        _status = _NOT_ENTERED;
    }

    // ========================================================================
    //                    LEVERAGE ENTRY POINTS
    // ========================================================================

    /**
     * @notice Leverage loop on Kinza (Aave V3 fork)
     * @dev User must first call approveDelegation on the variable debt token
     *      to allow this contract to borrow on their behalf.
     * @param inputToken    Token user sends (address(0) for native BNB)
     * @param supplyAsset   Token to supply to Kinza
     * @param borrowAsset   Token to borrow from Kinza
     * @param amount        Amount of inputToken
     * @param flashAmount   Flash swap amount (in supplyAsset)
     * @param borrowAmount  How much borrowAsset to borrow
     * @param pancakePair   PCS V2 pair containing supplyAsset (e.g., supplyAsset-WBNB)
     */
    function leverageKinza(
        address inputToken,
        address supplyAsset,
        address borrowAsset,
        uint256 amount,
        uint256 flashAmount,
        uint256 borrowAmount,
        address pancakePair
    ) external payable nonReentrant {
        require(amount > 0 && flashAmount > 0 && borrowAmount > 0, "Amounts > 0");

        uint256 supplyFromUser = _handleInputToken(inputToken, supplyAsset, amount);

        _executeFlashSwap(
            pancakePair,
            supplyAsset,
            flashAmount,
            abi.encode(FlashParams({
                operation: Operation.Leverage,
                user: msg.sender,
                supplyAsset: supplyAsset,
                borrowAsset: borrowAsset,
                aToken: address(0),
                vTokenSupply: address(0),
                vTokenBorrow: address(0),
                flashAmount: flashAmount,
                userAmount: supplyFromUser,
                borrowAmount: borrowAmount,
                protocol: Protocol.Kinza,
                pancakePair: pancakePair
            }))
        );
    }

    /**
     * @notice Leverage loop on Radiant (Aave V2 fork)
     * @dev Same credit delegation requirement as Kinza.
     */
    function leverageRadiant(
        address inputToken,
        address supplyAsset,
        address borrowAsset,
        uint256 amount,
        uint256 flashAmount,
        uint256 borrowAmount,
        address pancakePair
    ) external payable nonReentrant {
        require(amount > 0 && flashAmount > 0 && borrowAmount > 0, "Amounts > 0");

        uint256 supplyFromUser = _handleInputToken(inputToken, supplyAsset, amount);

        _executeFlashSwap(
            pancakePair,
            supplyAsset,
            flashAmount,
            abi.encode(FlashParams({
                operation: Operation.Leverage,
                user: msg.sender,
                supplyAsset: supplyAsset,
                borrowAsset: borrowAsset,
                aToken: address(0),
                vTokenSupply: address(0),
                vTokenBorrow: address(0),
                flashAmount: flashAmount,
                userAmount: supplyFromUser,
                borrowAmount: borrowAmount,
                protocol: Protocol.Radiant,
                pancakePair: pancakePair
            }))
        );
    }

    /**
     * @notice Leverage loop on Venus (Compound fork)
     * @dev Venus positions are contract-owned (no onBehalfOf support).
     */
    function leverageVenus(
        address inputToken,
        address vTokenSupply,
        address vTokenBorrow,
        uint256 amount,
        uint256 flashAmount,
        uint256 borrowAmount,
        address pancakePair,
        address supplyAsset,
        address borrowAsset
    ) external payable nonReentrant {
        require(amount > 0 && flashAmount > 0 && borrowAmount > 0, "Amounts > 0");

        uint256 supplyFromUser = _handleInputToken(inputToken, supplyAsset, amount);

        _executeFlashSwap(
            pancakePair,
            supplyAsset,
            flashAmount,
            abi.encode(FlashParams({
                operation: Operation.Leverage,
                user: msg.sender,
                supplyAsset: supplyAsset,
                borrowAsset: borrowAsset,
                aToken: address(0),
                vTokenSupply: vTokenSupply,
                vTokenBorrow: vTokenBorrow,
                flashAmount: flashAmount,
                userAmount: supplyFromUser,
                borrowAmount: borrowAmount,
                protocol: Protocol.Venus,
                pancakePair: pancakePair
            }))
        );
    }

    // ========================================================================
    //                    DELEVERAGE ENTRY POINTS
    // ========================================================================

    /**
     * @notice Unwind a Kinza leverage position via flash swap
     * @dev User must approve their aToken to this contract before calling.
     * @param supplyAsset     Collateral token
     * @param borrowAsset     Debt token
     * @param aToken          Kinza aToken address for the supplyAsset
     * @param repayAmount     How much debt to repay (in borrowAsset)
     * @param withdrawAmount  How much collateral to withdraw (in supplyAsset)
     * @param pancakePair     PCS V2 pair containing borrowAsset (for flash swap)
     */
    function deleverageKinza(
        address supplyAsset,
        address borrowAsset,
        address aToken,
        uint256 repayAmount,
        uint256 withdrawAmount,
        address pancakePair
    ) external nonReentrant {
        require(repayAmount > 0 && withdrawAmount > 0, "Amounts > 0");

        // Flash swap the borrowAsset to repay debt
        _executeFlashSwap(
            pancakePair,
            borrowAsset,
            repayAmount,
            abi.encode(FlashParams({
                operation: Operation.Deleverage,
                user: msg.sender,
                supplyAsset: supplyAsset,
                borrowAsset: borrowAsset,
                aToken: aToken,
                vTokenSupply: address(0),
                vTokenBorrow: address(0),
                flashAmount: repayAmount,
                userAmount: withdrawAmount,
                borrowAmount: repayAmount,
                protocol: Protocol.Kinza,
                pancakePair: pancakePair
            }))
        );
    }

    /**
     * @notice Unwind a Radiant leverage position via flash swap
     * @dev User must approve their aToken to this contract before calling.
     */
    function deleverageRadiant(
        address supplyAsset,
        address borrowAsset,
        address aToken,
        uint256 repayAmount,
        uint256 withdrawAmount,
        address pancakePair
    ) external nonReentrant {
        require(repayAmount > 0 && withdrawAmount > 0, "Amounts > 0");

        _executeFlashSwap(
            pancakePair,
            borrowAsset,
            repayAmount,
            abi.encode(FlashParams({
                operation: Operation.Deleverage,
                user: msg.sender,
                supplyAsset: supplyAsset,
                borrowAsset: borrowAsset,
                aToken: aToken,
                vTokenSupply: address(0),
                vTokenBorrow: address(0),
                flashAmount: repayAmount,
                userAmount: withdrawAmount,
                borrowAmount: repayAmount,
                protocol: Protocol.Radiant,
                pancakePair: pancakePair
            }))
        );
    }

    // ========================================================================
    //                    PANCAKESWAP FLASH SWAP CALLBACK
    // ========================================================================

    function pancakeCall(
        address sender,
        uint256 /* amount0 */,
        uint256 /* amount1 */,
        bytes calldata data
    ) external {
        FlashParams memory p = abi.decode(data, (FlashParams));

        require(sender == address(this), "FlashSwap: invalid sender");
        require(msg.sender == p.pancakePair, "FlashSwap: invalid pair");

        if (p.operation == Operation.Leverage) {
            _handleLeverage(p);
        } else {
            _handleDeleverage(p);
        }
    }

    // ========================================================================
    //                    INTERNAL: LEVERAGE FLOW
    // ========================================================================

    /**
     * @dev Leverage callback:
     *      Flash-swapped supplyAsset received →
     *      supply (user deposit + flash) to protocol on behalf of user →
     *      borrow borrowAsset on behalf of user (credit delegation) →
     *      swap borrowAsset → supplyAsset →
     *      repay flash + fee →
     *      sweep surplus to user
     */
    function _handleLeverage(FlashParams memory p) internal {
        uint256 totalSupply = p.userAmount + p.flashAmount;

        if (p.protocol == Protocol.Venus) {
            _venusSupplyAndBorrow(p.supplyAsset, p.vTokenSupply, p.vTokenBorrow, totalSupply, p.borrowAmount);
        } else if (p.protocol == Protocol.Kinza) {
            _kinzaSupplyAndBorrow(p.supplyAsset, p.borrowAsset, totalSupply, p.borrowAmount, p.user);
        } else {
            _radiantSupplyAndBorrow(p.supplyAsset, p.borrowAsset, totalSupply, p.borrowAmount, p.user);
        }

        // Swap borrowed tokens → supplyAsset for flash repayment
        uint256 borrowedBal = IERC20(p.borrowAsset).balanceOf(address(this));
        require(borrowedBal > 0, "Borrow: nothing received");

        uint256 swappedSupply;
        if (p.borrowAsset == p.supplyAsset) {
            swappedSupply = borrowedBal;
        } else {
            swappedSupply = _swapOnPancake(p.borrowAsset, p.supplyAsset, borrowedBal);
        }

        // Repay flash swap: supplyAsset + 0.25% fee
        uint256 repayAmount = (p.flashAmount * 10000) / 9975 + 1;
        require(swappedSupply >= repayAmount, "FlashSwap: insufficient to repay");
        _safeTransfer(p.supplyAsset, p.pancakePair, repayAmount);

        // Return surplus
        _sweepToken(p.supplyAsset, p.user);
        _sweepToken(p.borrowAsset, p.user);

        emit LoopExecuted(
            p.user, p.supplyAsset, p.borrowAsset, p.protocol,
            p.userAmount, totalSupply, p.borrowAmount
        );
    }

    // ========================================================================
    //                    INTERNAL: DELEVERAGE FLOW
    // ========================================================================

    /**
     * @dev Deleverage callback:
     *      Flash-swapped borrowAsset received →
     *      repay debt on behalf of user →
     *      pull aTokens from user → withdraw collateral →
     *      swap supplyAsset → borrowAsset to repay flash →
     *      sweep surplus to user
     */
    function _handleDeleverage(FlashParams memory p) internal {
        // Step 1: Repay user's debt
        if (p.protocol == Protocol.Kinza) {
            _safeApprove(p.borrowAsset, KINZA_POOL, p.borrowAmount);
            IKinzaPool(KINZA_POOL).repay(p.borrowAsset, p.borrowAmount, 2, p.user);
        } else {
            _safeApprove(p.borrowAsset, RADIANT_POOL, p.borrowAmount);
            IRadiantLendingPool(RADIANT_POOL).repay(p.borrowAsset, p.borrowAmount, 2, p.user);
        }

        // Step 2: Pull aTokens from user and withdraw collateral
        // User must have approved aToken spending to this contract
        _safeTransferFrom(p.aToken, p.user, address(this), p.userAmount);

        if (p.protocol == Protocol.Kinza) {
            IKinzaPool(KINZA_POOL).withdraw(p.supplyAsset, p.userAmount, address(this));
        } else {
            IRadiantLendingPool(RADIANT_POOL).withdraw(p.supplyAsset, p.userAmount, address(this));
        }

        // Step 3: Swap supplyAsset → borrowAsset for flash repayment
        uint256 supplyBal = IERC20(p.supplyAsset).balanceOf(address(this));
        uint256 repayFlashAmount = (p.flashAmount * 10000) / 9975 + 1;

        uint256 borrowTokensForRepay;
        if (p.supplyAsset == p.borrowAsset) {
            borrowTokensForRepay = supplyBal;
        } else {
            borrowTokensForRepay = _swapOnPancake(p.supplyAsset, p.borrowAsset, supplyBal);
        }

        require(borrowTokensForRepay >= repayFlashAmount, "Deleverage: insufficient to repay flash");

        // Step 4: Repay flash swap
        _safeTransfer(p.borrowAsset, p.pancakePair, repayFlashAmount);

        // Step 5: Return all surplus to user
        _sweepToken(p.supplyAsset, p.user);
        _sweepToken(p.borrowAsset, p.user);

        emit LoopUnwound(
            p.user, p.supplyAsset, p.borrowAsset, p.protocol,
            p.borrowAmount, p.userAmount
        );
    }

    // ========================================================================
    //                    INPUT TOKEN HANDLING
    // ========================================================================

    /**
     * @dev Accept any token from user and convert to supplyAsset.
     *      Supports native BNB (inputToken = address(0)).
     */
    function _handleInputToken(
        address inputToken,
        address supplyAsset,
        uint256 amount
    ) internal returns (uint256 supplyFromUser) {
        if (inputToken == address(0)) {
            // Native BNB → wrap to WBNB
            require(msg.value >= amount, "BNB amount mismatch");
            IWBNB(WBNB).deposit{value: amount}();

            if (supplyAsset == WBNB) {
                return amount;
            }
            return _swapOnPancake(WBNB, supplyAsset, amount);
        }

        _safeTransferFrom(inputToken, msg.sender, address(this), amount);

        if (inputToken == supplyAsset) {
            return amount;
        }

        return _swapOnPancake(inputToken, supplyAsset, amount);
    }

    // ========================================================================
    //                    FLASH SWAP EXECUTION
    // ========================================================================

    function _executeFlashSwap(
        address pancakePair,
        address flashToken,
        uint256 flashAmount,
        bytes memory data
    ) internal {
        address token0 = IPancakePair(pancakePair).token0();
        address token1 = IPancakePair(pancakePair).token1();

        require(token0 == flashToken || token1 == flashToken, "Pair does not contain flash token");

        uint256 amount0Out = token0 == flashToken ? flashAmount : 0;
        uint256 amount1Out = token1 == flashToken ? flashAmount : 0;

        IPancakePair(pancakePair).swap(amount0Out, amount1Out, address(this), data);
    }

    // ========================================================================
    //                    PROTOCOL SUPPLY + BORROW
    // ========================================================================

    function _venusSupplyAndBorrow(
        address supplyAsset, address vTokenSupply, address vTokenBorrow,
        uint256 supplyAmount, uint256 borrowAmount
    ) internal {
        _safeApprove(supplyAsset, vTokenSupply, supplyAmount);

        address[] memory markets = new address[](2);
        markets[0] = vTokenSupply;
        markets[1] = vTokenBorrow;
        IComptroller(VENUS_COMPTROLLER).enterMarkets(markets);

        require(IVToken(vTokenSupply).mint(supplyAmount) == 0, "Venus: mint failed");
        require(IVToken(vTokenBorrow).borrow(borrowAmount) == 0, "Venus: borrow failed");
    }

    /**
     * @dev Supply and borrow on behalf of user.
     *      User sees aTokens + debt in their wallet.
     *      Borrowed tokens are sent to this contract (msg.sender) for flash repayment.
     */
    function _kinzaSupplyAndBorrow(
        address supplyAsset, address borrowAsset,
        uint256 supplyAmount, uint256 borrowAmount,
        address user
    ) internal {
        _safeApprove(supplyAsset, KINZA_POOL, supplyAmount);
        IKinzaPool(KINZA_POOL).supply(supplyAsset, supplyAmount, user, 0);
        // Requires user to have called approveDelegation on variable debt token
        IKinzaPool(KINZA_POOL).borrow(borrowAsset, borrowAmount, 2, 0, user);
    }

    function _radiantSupplyAndBorrow(
        address supplyAsset, address borrowAsset,
        uint256 supplyAmount, uint256 borrowAmount,
        address user
    ) internal {
        _safeApprove(supplyAsset, RADIANT_POOL, supplyAmount);
        IRadiantLendingPool(RADIANT_POOL).deposit(supplyAsset, supplyAmount, user, 0);
        // Requires user to have called approveDelegation on variable debt token
        IRadiantLendingPool(RADIANT_POOL).borrow(borrowAsset, borrowAmount, 2, 0, user);
    }

    // ========================================================================
    //                    PANCAKESWAP V2 ROUTER SWAP
    // ========================================================================

    function _swapOnPancake(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (uint256) {
        _safeApprove(tokenIn, PANCAKE_ROUTER, amountIn);

        // Try direct path first (avoids flash swap pair conflict)
        address[] memory directPath = new address[](2);
        directPath[0] = tokenIn;
        directPath[1] = tokenOut;

        try IPancakeRouter(PANCAKE_ROUTER).getAmountsOut(amountIn, directPath) returns (uint[] memory amounts) {
            if (amounts[1] > 0) {
                uint[] memory directResult = IPancakeRouter(PANCAKE_ROUTER).swapExactTokensForTokens(
                    amountIn,
                    (amounts[1] * 95) / 100,
                    directPath,
                    address(this),
                    block.timestamp + 300
                );
                return directResult[directResult.length - 1];
            }
        } catch {}

        // Fallback: route through WBNB
        address[] memory wbnbPath = new address[](3);
        wbnbPath[0] = tokenIn;
        wbnbPath[1] = WBNB;
        wbnbPath[2] = tokenOut;

        uint[] memory expectedAmounts = IPancakeRouter(PANCAKE_ROUTER).getAmountsOut(amountIn, wbnbPath);
        uint[] memory result = IPancakeRouter(PANCAKE_ROUTER).swapExactTokensForTokens(
            amountIn,
            (expectedAmounts[2] * 95) / 100,
            wbnbPath,
            address(this),
            block.timestamp + 300
        );
        return result[result.length - 1];
    }

    // ========================================================================
    //                    UTILITIES
    // ========================================================================

    function _safeTransfer(address token, address to, uint256 amount) internal {
        require(IERC20(token).transfer(to, amount), "Transfer failed");
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        require(IERC20(token).transferFrom(from, to, amount), "TransferFrom failed");
    }

    function _safeApprove(address token, address spender, uint256 amount) internal {
        IERC20(token).approve(spender, 0);
        IERC20(token).approve(spender, amount);
    }

    function _sweepToken(address token, address to) internal {
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (bal > 0) {
            _safeTransfer(token, to, bal);
        }
    }

    // ========================================================================
    //                    VIEW HELPERS
    // ========================================================================

    function getPancakePair(address tokenA, address tokenB) external view returns (address) {
        return IPancakeFactory(PANCAKE_FACTORY).getPair(tokenA, tokenB);
    }

    // ========================================================================
    //                    ADMIN
    // ========================================================================

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner = zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        _safeTransfer(token, owner, amount);
        emit EmergencyWithdraw(token, amount);
    }

    function emergencyWithdrawBNB() external onlyOwner {
        uint256 bal = address(this).balance;
        (bool ok,) = owner.call{value: bal}("");
        require(ok, "BNB transfer failed");
    }

    receive() external payable {}
}
