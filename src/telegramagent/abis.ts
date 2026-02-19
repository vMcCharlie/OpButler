export const COMPTROLLER_ABI = [
    {
        "constant": false,
        "inputs": [{ "name": "vTokens", "type": "address[]" }],
        "name": "enterMarkets",
        "outputs": [{ "name": "", "type": "uint256[]" }],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{ "name": "account", "type": "address" }],
        "name": "getAccountLiquidity",
        "outputs": [
            { "name": "", "type": "uint256" },
            { "name": "", "type": "uint256" },
            { "name": "", "type": "uint256" }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{ "name": "", "type": "address" }],
        "name": "markets",
        "outputs": [
            { "name": "isListed", "type": "bool" },
            { "name": "collateralFactorMantissa", "type": "uint256" },
            { "name": "isComped", "type": "bool" }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
] as const;

export const VTOKEN_ABI = [
    {
        "constant": false,
        "inputs": [{ "name": "mintAmount", "type": "uint256" }],
        "name": "mint",
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [{ "name": "redeemAmount", "type": "uint256" }],
        "name": "redeemUnderlying",
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [{ "name": "borrowAmount", "type": "uint256" }],
        "name": "borrow",
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [{ "name": "repayAmount", "type": "uint256" }],
        "name": "repayBorrow",
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{ "name": "account", "type": "address" }],
        "name": "borrowBalanceCurrent",
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{ "name": "owner", "type": "address" }],
        "name": "balanceOfUnderlying",
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "supplyRatePerBlock",
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "borrowRatePerBlock",
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
] as const;

export const PANCAKESWAP_ROUTER_ABI = [
    {
        "inputs": [
            {
                "components": [
                    { "internalType": "address", "name": "tokenIn", "type": "address" },
                    { "internalType": "address", "name": "tokenOut", "type": "address" },
                    { "internalType": "uint24", "name": "fee", "type": "uint24" },
                    { "internalType": "address", "name": "recipient", "type": "address" },
                    { "internalType": "uint256", "name": "deadline", "type": "uint256" },
                    { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
                    { "internalType": "uint256", "name": "amountOutMinimum", "type": "uint256" },
                    { "internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160" }
                ],
                "internalType": "struct IV3SwapRouter.ExactInputSingleParams",
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "exactInputSingle",
        "outputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }],
        "stateMutability": "payable",
        "type": "function"
    }
] as const;

export const ORACLE_ABI = [
    {
        "constant": true,
        "inputs": [{ "name": "vToken", "type": "address" }],
        "name": "getUnderlyingPrice",
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
] as const;

export const ERC20_ABI = [
    {
        "constant": false,
        "inputs": [{ "name": "_spender", "type": "address" }, { "name": "_value", "type": "uint256" }],
        "name": "approve",
        "outputs": [{ "name": "", "type": "bool" }],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
] as const;
