import { useReadContracts, useAccount } from 'wagmi';
import { useMemo } from 'react';
import { formatUnits, getAddress, parseAbi } from 'viem';

// --- Correct Contract Addresses ---
const VENUS_COMPTROLLER = '0xfD36E2c2a6789Db23113685031d7F16329158384';
const KINZA_POOL = getAddress('0xcb0620b181140e57d1c0d8b724cde623ca963c8c'); // Aave V3 fork
const RADIANT_POOL = getAddress('0xccf31d54c3a94f67b8ceff8dd771de5846da032c'); // Aave V2 fork

// --- ABIs ---
// Venus: getAccountLiquidity returns (error, liquidity, shortfall) in 18 decimals
const VENUS_ABI = [
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'getAccountLiquidity',
        outputs: [
            { name: 'error', type: 'uint256' },
            { name: 'liquidity', type: 'uint256' },
            { name: 'shortfall', type: 'uint256' }
        ],
        stateMutability: 'view',
        type: 'function'
    }
] as const;

// Kinza (Aave V3): getUserAccountData returns USD values (8 decimals) + healthFactor (18 decimals)
const AAVE_V3_ABI = [
    {
        inputs: [{ name: 'user', type: 'address' }],
        name: 'getUserAccountData',
        outputs: [
            { name: 'totalCollateralBase', type: 'uint256' },
            { name: 'totalDebtBase', type: 'uint256' },
            { name: 'availableBorrowsBase', type: 'uint256' },
            { name: 'currentLiquidationThreshold', type: 'uint256' },
            { name: 'ltv', type: 'uint256' },
            { name: 'healthFactor', type: 'uint256' }
        ],
        stateMutability: 'view',
        type: 'function'
    }
] as const;

// Radiant (Aave V2): same shape as V3 but returns USD with 8 decimals
const AAVE_V2_ABI = AAVE_V3_ABI;

export interface ProtocolHealth {
    healthFactor: number;     // Numeric health factor (> 1 = safe, < 1 = liquidatable)
    isHealthy: boolean;       // HF > 1.2
    status: 'safe' | 'warning' | 'danger' | 'inactive';
    hasPositions: boolean;
}

export function useAggregatedHealth(targetAddress?: string) {
    const { address: connectedAddress } = useAccount();
    const address = targetAddress || connectedAddress;

    const { data, isLoading } = useReadContracts({
        contracts: [
            {
                address: VENUS_COMPTROLLER as `0x${string}`,
                abi: VENUS_ABI,
                functionName: 'getAccountLiquidity',
                args: address ? [address as `0x${string}`] : undefined,
            },
            {
                address: KINZA_POOL,
                abi: AAVE_V3_ABI,
                functionName: 'getUserAccountData',
                args: address ? [address as `0x${string}`] : undefined,
            },
            {
                address: RADIANT_POOL,
                abi: AAVE_V2_ABI,
                functionName: 'getUserAccountData',
                args: address ? [address as `0x${string}`] : undefined,
            },
        ],
        query: {
            enabled: !!address,
            refetchInterval: 15000,
        }
    });

    return useMemo(() => {
        const defaultHealth: ProtocolHealth = { healthFactor: 0, isHealthy: true, status: 'inactive', hasPositions: false };

        if (!data || !address) return {
            venus: defaultHealth,
            kinza: defaultHealth,
            radiant: defaultHealth,
            overallScore: 10,
            isLoading: true
        };

        const [venusRes, kinzaRes, radiantRes] = data;

        // --- Venus ---
        let venus: ProtocolHealth = { ...defaultHealth };
        if (venusRes.status === 'success') {
            const [error, liquidity, shortfall] = venusRes.result as [bigint, bigint, bigint];
            const liq = parseFloat(formatUnits(liquidity, 18));
            const sf = parseFloat(formatUnits(shortfall, 18));
            const hasPositions = liq > 0 || sf > 0;

            if (hasPositions) {
                // Venus doesn't return HF directly. Approximate from liquidity/shortfall.
                // If shortfall > 0, HF < 1. If liquidity > 0, HF > 1.
                const hf = sf > 0 ? 0.5 : (liq > 0 ? 2.0 : 1.0);
                venus = {
                    healthFactor: hf,
                    isHealthy: sf === 0,
                    status: sf > 0 ? 'danger' : (liq < 0.01 ? 'warning' : 'safe'),
                    hasPositions
                };
            }
        }

        // --- Kinza (Aave V3) ---
        let kinza: ProtocolHealth = { ...defaultHealth };
        if (kinzaRes.status === 'success') {
            const result = kinzaRes.result as [bigint, bigint, bigint, bigint, bigint, bigint];
            const totalCollateral = Number(result[0]) / 1e8;
            const totalDebt = Number(result[1]) / 1e8;
            const hfRaw = Number(result[5]) / 1e18;
            const hasPositions = totalCollateral > 0.001 || totalDebt > 0.001;

            if (hasPositions) {
                kinza = {
                    healthFactor: hfRaw,
                    isHealthy: hfRaw > 1.2,
                    status: hfRaw > 1.5 ? 'safe' : (hfRaw > 1.0 ? 'warning' : 'danger'),
                    hasPositions
                };
            }
        }

        // --- Radiant (Aave V2) ---
        let radiant: ProtocolHealth = { ...defaultHealth };
        if (radiantRes.status === 'success') {
            const result = radiantRes.result as [bigint, bigint, bigint, bigint, bigint, bigint];
            const totalCollateral = Number(result[0]) / 1e8;
            const totalDebt = Number(result[1]) / 1e8;
            const hfRaw = Number(result[5]) / 1e18;
            const hasPositions = totalCollateral > 0.001 || totalDebt > 0.001;

            if (hasPositions) {
                radiant = {
                    healthFactor: hfRaw,
                    isHealthy: hfRaw > 1.2,
                    status: hfRaw > 1.5 ? 'safe' : (hfRaw > 1.0 ? 'warning' : 'danger'),
                    hasPositions
                };
            }
        }

        // Overall score: 0-10 scale
        // Average health factors from active protocols, normalize to 0-10
        const activeProtocols = [venus, kinza, radiant].filter(p => p.hasPositions);
        let overallScore = 10;
        if (activeProtocols.length > 0) {
            const avgHF = activeProtocols.reduce((sum, p) => sum + p.healthFactor, 0) / activeProtocols.length;
            // Map HF to score: HF 2.0+ = 10, HF 1.5 = 8, HF 1.2 = 6, HF 1.0 = 4, HF < 1 = 2
            overallScore = Math.min(10, Math.max(0, avgHF * 5));
            overallScore = Math.round(overallScore * 10) / 10; // 1 decimal
        }

        return {
            venus,
            kinza,
            radiant,
            overallScore,
            isLoading: false
        };
    }, [data, address]);
}
