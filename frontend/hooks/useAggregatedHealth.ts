import { useReadContracts, useAccount, useReadContract } from 'wagmi';
import { useMemo } from 'react';
import { formatUnits, getAddress, parseAbi } from 'viem';
import { useTokenPrices } from './useTokenPrices';

// --- Correct Contract Addresses ---
const VENUS_COMPTROLLER = '0xfD36E2c2a6789Db23113685031d7F16329158384';
const KINZA_POOL = getAddress('0xcb0620b181140e57d1c0d8b724cde623ca963c8c'); // Aave V3 fork
const RADIANT_POOL = getAddress('0xccf31d54c3a94f67b8ceff8dd771de5846da032c'); // Aave V2 fork

// --- ABIs ---
const VENUS_COMPTROLLER_ABI = parseAbi([
    'function getAccountLiquidity(address account) view returns (uint256, uint256, uint256)',
    'function getAllMarkets() view returns (address[])',
]);

const VTOKEN_ABI = parseAbi([
    'function borrowBalanceStored(address account) view returns (uint256)',
    'function symbol() view returns (string)',
]);

const AAVE_ABI = parseAbi([
    'function getUserAccountData(address user) view returns (uint256, uint256, uint256, uint256, uint256, uint256)',
]);

export interface ProtocolHealth {
    healthFactor: number;     // Numeric health factor (> 1 = safe, < 1 = liquidatable)
    isHealthy: boolean;       // HF > 1.2
    status: 'safe' | 'warning' | 'danger' | 'inactive';
    hasPositions: boolean;
}

export function useAggregatedHealth(targetAddress?: string) {
    const { address: connectedAddress } = useAccount();
    const address = targetAddress || connectedAddress;
    const { data: prices } = useTokenPrices();

    // 1. Fetch Venus Markets
    const { data: venusMarkets } = useReadContract({
        address: VENUS_COMPTROLLER,
        abi: VENUS_COMPTROLLER_ABI,
        functionName: 'getAllMarkets',
        query: { enabled: !!address }
    });

    // 2. Fetch Aggregated Data
    const { data, isLoading, refetch } = useReadContracts({
        contracts: [
            {
                address: VENUS_COMPTROLLER,
                abi: VENUS_COMPTROLLER_ABI,
                functionName: 'getAccountLiquidity',
                args: address ? [address as `0x${string}`] : undefined,
            },
            {
                address: KINZA_POOL,
                abi: AAVE_ABI,
                functionName: 'getUserAccountData',
                args: address ? [address as `0x${string}`] : undefined,
            },
            {
                address: RADIANT_POOL,
                abi: AAVE_ABI,
                functionName: 'getUserAccountData',
                args: address ? [address as `0x${string}`] : undefined,
            },
            ...(address && venusMarkets ? (venusMarkets as string[]).flatMap(m => [
                { address: m as `0x${string}`, abi: VTOKEN_ABI, functionName: 'borrowBalanceStored', args: [address] },
                { address: m as `0x${string}`, abi: VTOKEN_ABI, functionName: 'symbol' }
            ]) : [])
        ] as any[],
        query: {
            enabled: !!address,
            refetchInterval: 15000,
        }
    });

    return useMemo(() => {
        const defaultHealth: ProtocolHealth = { healthFactor: 0, isHealthy: true, status: 'inactive', hasPositions: false };

        if (!data || !address || !prices) return {
            venus: defaultHealth,
            kinza: defaultHealth,
            radiant: defaultHealth,
            overallScore: 10,
            isLoading: true
        };

        const [venusLiqRes, kinzaRes, radiantRes, ...venusDebtData] = data;

        // --- Venus ---
        let venus: ProtocolHealth = { ...defaultHealth };
        if (venusLiqRes.status === 'success') {
            const [error, liquidity, shortfall] = venusLiqRes.result as [bigint, bigint, bigint];
            const liq = parseFloat(formatUnits(liquidity, 18));
            const sf = parseFloat(formatUnits(shortfall, 18));

            // Calculate Total Debt for Venus HF
            let totalBorrowUSD = 0;
            if (venusMarkets) {
                for (let i = 0; i < (venusMarkets as string[]).length; i++) {
                    const borRes = venusDebtData[i * 2];
                    const symRes = venusDebtData[i * 2 + 1];
                    if (borRes?.status === 'success' && symRes?.status === 'success') {
                        const borrowBal = borRes.result as bigint;
                        const vSymbol = symRes.result as string;
                        if (borrowBal > 0) {
                            let symbol = vSymbol.startsWith('v') ? vSymbol.slice(1) : vSymbol;
                            if (symbol === 'BTC') symbol = 'BTCB';
                            if (symbol === 'WBNB') symbol = 'BNB';
                            const price = prices.getPrice(symbol);
                            totalBorrowUSD += parseFloat(formatUnits(borrowBal, 18)) * price;
                        }
                    }
                }
            }

            const hasPositions = liq > 0 || sf > 0 || totalBorrowUSD > 0;

            if (hasPositions) {
                // HF = (WeightCollateral) / Debt
                // WeightedCollateral = Liquidity + Debt
                // HF = (liq + totalBorrowUSD) / totalBorrowUSD
                let hf = 10; // Safe default
                if (totalBorrowUSD > 0) {
                    hf = (liq + totalBorrowUSD) / totalBorrowUSD;
                    if (sf > 0) {
                        hf = totalBorrowUSD > 0 ? (totalBorrowUSD - sf) / totalBorrowUSD : 0.5;
                    }
                } else if (liq > 0) {
                    hf = 10; // No debt but has positions = very safe
                }

                venus = {
                    healthFactor: hf,
                    isHealthy: sf === 0 && hf > 1.2,
                    status: sf > 0 ? 'danger' : (hf < 1.3 ? 'warning' : 'safe'),
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
        const activeProtocols = [venus, kinza, radiant].filter(p => p.hasPositions);
        let overallScore = 10;
        if (activeProtocols.length > 0) {
            const avgHF = activeProtocols.reduce((sum, p) => sum + Math.min(2, p.healthFactor), 0) / activeProtocols.length;
            overallScore = Math.min(10, Math.max(0, avgHF * 5));
            overallScore = Math.round(overallScore * 10) / 10;
        }

        return {
            venus,
            kinza,
            radiant,
            overallScore,
            isLoading: false,
            refetch
        };
    }, [data, address, prices, venusMarkets, refetch]);
}

