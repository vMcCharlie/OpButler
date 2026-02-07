import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';

// 1. Define ABIs (Simplified)
const VENUS_COMPTROLLER_ABI = [
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'getAccountLiquidity',
        outputs: [
            { name: 'err', type: 'uint256' },
            { name: 'liquidity', type: 'uint256' },
            { name: 'shortfall', type: 'uint256' }
        ],
        stateMutability: 'view',
        type: 'function'
    }
] as const;

const VTOKEN_ABI = [
    {
        name: 'supplyRatePerBlock',
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        name: 'borrowRatePerBlock',
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
    }
] as const;

export function useVenusHealth(userAddress: `0x${string}` | undefined) {
    // Read Health Data
    const { data } = useReadContract({
        address: '0xfD36E2c2a6789Db23113685031d7F16329158384', // Venus Unitroller
        abi: VENUS_COMPTROLLER_ABI,
        functionName: 'getAccountLiquidity',
        args: userAddress ? [userAddress] : undefined,
        query: {
            refetchInterval: 10_000,
            enabled: !!userAddress
        } // Auto-refresh every 10s
    });

    if (!data || !userAddress) return { health: 0, status: 'Safe', liquidity: 0, shortfall: 0 };

    const liquidity = Number(formatUnits(data[1], 18));
    const shortfall = Number(formatUnits(data[2], 18));

    // Logic: If shortfall > 0, you are underwater.
    let status = 'Safe';
    let healthFactor = Infinity;

    if (shortfall > 0) {
        status = 'Danger';
        healthFactor = 0; // Underwater
    } else if (liquidity > 0) {
        // Rough estimation of Health Factor if we knew Collateral. 
        // HF = Collateral * Threshold / Borrow
        // Liquidity = (Collateral * Threshold) - Borrow
        // This is hard to calculate exactly without Total Collateral value, but Liquidity is the key metric.
        status = 'Safe';
    }

    return {
        safeLimitUSD: liquidity,
        dangerAmountUSD: shortfall,
        isSafe: shortfall === 0,
        formattedLiquidity: liquidity.toFixed(2),
        formattedShortfall: shortfall.toFixed(2)
    };
}

export function calculateAPY(ratePerBlock: bigint) {
    const blocksPerYear = 10512000;
    const rate = Number(formatUnits(ratePerBlock, 18));
    // Standard Compound/Venus APY Formula
    return (Math.pow((rate * blocksPerYear) + 1, 1) - 1) * 100;
}
