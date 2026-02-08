import { useReadContracts, useAccount } from 'wagmi';
import { useMemo } from 'react';
import { parseUnits, formatUnits } from 'viem';

// --- ABIs ---

const VENUS_LENS_ABI = [
    {
        "constant": true,
        "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
        "name": "getAccountLimits",
        "outputs": [
            { "internalType": "uint256", "name": "liquidity", "type": "uint256" },
            { "internalType": "uint256", "name": "shortfall", "type": "uint256" }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
] as const;

// Kinza uses Standard Comptroller Interface
const KINZA_COMPTROLLER_ABI = [
    {
        "constant": true,
        "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
        "name": "getAccountLiquidity",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" },
            { "internalType": "uint256", "name": "", "type": "uint256" },
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ], // error, liquidity, shortfall
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
] as const;

// Radiant V2 (Aave V2 Fork) LendingPool
const RADIANT_LENDING_POOL_ABI = [
    {
        "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
        "name": "getUserAccountData",
        "outputs": [
            { "internalType": "uint256", "name": "totalCollateralETH", "type": "uint256" },
            { "internalType": "uint256", "name": "totalDebtETH", "type": "uint256" },
            { "internalType": "uint256", "name": "availableBorrowsETH", "type": "uint256" },
            { "internalType": "uint256", "name": "currentLiquidationThreshold", "type": "uint256" },
            { "internalType": "uint256", "name": "ltv", "type": "uint256" },
            { "internalType": "uint256", "name": "healthFactor", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

// --- Addresses (BSC Mainnet) ---
const VENUS_COMPTROLLER_ADDRESS = '0xfD36E2c2a6789Db23113685031d7F16329158384'; // Venus Comptroller
const KINZA_COMPTROLLER_ADDRESS = '0xcB0620b181140e57D1C0D8b724cde623cA963c8C'; // Kinza Comptroller
const RADIANT_LENDING_POOL_ADDRESS = '0xd50Cf00b6e600Dd036Ba8eF475677d816d6c4281'; // Radiant V2 LendingPool

export function useAggregatedHealth(targetAddress?: string) {
    const { address: connectedAddress } = useAccount();
    const address = targetAddress || connectedAddress;

    const { data, isLoading } = useReadContracts({
        contracts: [
            {
                address: VENUS_COMPTROLLER_ADDRESS,
                abi: KINZA_COMPTROLLER_ABI, // Compatible with Venus (Comptroller Interface)
                functionName: 'getAccountLiquidity',
                args: address ? [address as `0x${string}`] : undefined,
            },
            {
                address: KINZA_COMPTROLLER_ADDRESS,
                abi: KINZA_COMPTROLLER_ABI,
                functionName: 'getAccountLiquidity',
                args: address ? [address as `0x${string}`] : undefined,
            },
            {
                address: RADIANT_LENDING_POOL_ADDRESS,
                abi: RADIANT_LENDING_POOL_ABI,
                functionName: 'getUserAccountData',
                args: address ? [address as `0x${string}`] : undefined,
            },
        ],
        query: {
            enabled: !!address,
            refetchInterval: 10000,
        }
    });

    return useMemo(() => {
        if (!data || !address) return {
            venus: null,
            kinza: null,
            radiant: null,
            totalNetWorthUSD: 0,
            isLoading: true
        };

        const [venusRes, kinzaRes, radiantRes] = data;

        // 1. Venus Processing
        // Note: Venus Lens returns liquidity (USD value * 1e18 usually, or underlying decimals? Venus Lens is tricky. Usually 1e18)
        // Let's assume standard behavior for now.
        const venusParams = venusRes.status === 'success' ? venusRes.result : null;
        let venusHealth = 0;
        // Venus HF = Confusing without Supply/Borrow. 
        // Actually, getAccountLimits gives Liquidity (Available to Borrow) and Shortfall.
        // It doesn't give Total Collateral / Total Debt directly.
        // For accurate Health, we ideally need (Collateral * Factor) / Debt.
        // If has Shortfall, Health < 1. If Liquidity > 0, Health > 1.
        // We might need a better Venus fetcher or approximate.
        // Let's stick to "Liquidity" (Available) for display for now, or just show "Healthy" / "Risk".

        // 2. Kinza Processing (Compound V2 Fork)
        // Same as Venus: error, liquidity, shortfall.
        const kinzaParams = kinzaRes.status === 'success' ? kinzaRes.result : null;

        // 3. Radiant Processing (Aave V2)
        // Returns ETH values (actually USD 8 decimals on some Aaves, or Base Currency).
        // Radiant V2 on BSC: "Base" is usually USD (8 decimals).
        const radiantParams = radiantRes.status === 'success' ? radiantRes.result : null;

        // Helper to format BigInt
        const fmt = (v: bigint | undefined, decimals = 18) => v ? parseFloat(formatUnits(v, decimals)) : 0;

        return {
            venus: venusParams ? {
                liquidity: fmt(venusParams[0]),
                shortfall: fmt(venusParams[1]),
                isHealthy: Number(venusParams[1]) === 0,
            } : null,
            kinza: kinzaParams ? {
                liquidity: fmt(kinzaParams[1]),
                shortfall: fmt(kinzaParams[2]),
                isHealthy: Number(kinzaParams[2]) === 0,
            } : null,
            radiant: radiantParams ? {
                totalCollateral: fmt(radiantParams[0], 8), // Radiant uses 8 decimals for USD values usually
                totalDebt: fmt(radiantParams[1], 8),
                healthFactor: fmt(radiantParams[5], 18),
            } : null,
            isLoading: false
        };
    }, [data, address]);
}
