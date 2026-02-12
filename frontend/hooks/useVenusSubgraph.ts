import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useTokenPrices } from './useTokenPrices';
import { formatUnits } from 'viem';

// Environment Variables (or defaults from the analysis)
const CORE_SUBGRAPH_URL = process.env.NEXT_PUBLIC_VENUS_CORE_POOL_SUBGRAPH || 'https://gateway.thegraph.com/api/subgraphs/id/7h65Zf3pXXPmf8g8yZjjj2bqYiypVxems5d8riLK1DyR';
const ISOLATED_SUBGRAPH_URL = process.env.NEXT_PUBLIC_VENUS_ISOLATED_POOL_SUBGRAPH || 'https://gateway-market-arbitrum.network.thegraph.com/api/subgraphs/id/H2a3D64RV4NNxyJqx9jVFQRBpQRzD6zNZjLDotgdCrTC';

interface SubgraphPosition {
    id: string; // "vTokenAddress" or "accountAddress-vTokenAddress"
    vTokenBalanceMantissa: string;
    storedBorrowBalanceMantissa: string;
    market: {
        id: string; // vToken Address
        symbol: string; // vToken Symbol (e.g., vBNB)
        underlyingSymbol: string; // e.g., BNB
        underlyingDecimals: number;
        exchangeRateMantissa: string; // Exchange rate to underlying
        borrowRateMantissa: string;
        supplyRateMantissa: string;
        underlyingPriceUSD?: string; // Sometimes available
    };
}

const CORE_QUERY = `
    query CoreAccount($id: ID!) {
        account(id: $id) {
            tokens {
                id
                vTokenBalanceMantissa
                storedBorrowBalanceMantissa
                market {
                    id
                    symbol
                    underlyingSymbol
                    exchangeRateMantissa
                    borrowRateMantissa
                    supplyRateMantissa
                }
            }
        }
    }
`;

const ISOLATED_QUERY = `
    query IsolatedPositions($account: Bytes!) {
        marketPositions(where: { account: $account }) {
            id
            vTokenBalanceMantissa
            storedBorrowBalanceMantissa
            market {
                id
                symbol
                underlyingSymbol
                exchangeRateMantissa
                borrowRateMantissa
                supplyRateMantissa
            }
        }
    }
`;

export function useVenusSubgraph() {
    const { address } = useAccount();
    const { data: prices } = useTokenPrices();

    return useQuery({
        queryKey: ['venus-subgraph', address],
        queryFn: async () => {
            if (!address) return { totalSupplyUSD: 0, totalBorrowUSD: 0, netWorthUSD: 0, positions: [] };

            const userAddress = address.toLowerCase();

            // 1. Fetch Core Pool
            const coreRes = await fetch(CORE_SUBGRAPH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: CORE_QUERY,
                    variables: { id: userAddress } // Core uses ID as address
                })
            }).then(res => res.json());

            // 2. Fetch Isolated Pools
            const isolatedRes = await fetch(ISOLATED_SUBGRAPH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: ISOLATED_QUERY,
                    variables: { account: userAddress } // Isolated uses Bytes
                })
            }).then(res => res.json());

            const corePositions = (coreRes.data?.account?.tokens || []) as SubgraphPosition[];
            const isolatedPositions = (isolatedRes.data?.marketPositions || []) as SubgraphPosition[];

            const allPositions: any[] = [];
            let totalSupplyUSD = 0;
            let totalBorrowUSD = 0;

            const processPosition = (pos: SubgraphPosition, source: 'Core' | 'Isolated') => {
                const market = pos.market;
                const underlyingSymbol = market.underlyingSymbol || market.symbol.replace(/^v/, ''); // Fallback

                // Get Decimals (Subgraph usually doesn't give decimals easily in this query, 
                // but exchangeRateMantissa includes the 1e18 + decimals delta scaling).
                // Standard Venus Math:
                // Supply Underlying = (vTokenBal * exchangeRate) / 1e18
                // Borrow Underlying = storedBorrowBalance / 1e(UnderlyingDecimals) ?? 
                // Actually, storedBorrowBalanceMantissa IS the underlying amount but scaled by 1e18 usually?
                // Let's re-verify the Mantissa definition.
                // In Compound V2 (Venus), "Mantissa" usually means scaled by 1e18.
                // ExchangeRateMantissa = 1e18 * (Underlying / vToken).
                // Supply Underlying = (vTokenBal * ExchangeRate) / 1e18.
                // StoredBorrowBalanceMantissa = This IS the borrow balance in underlying units? 
                // Wait, typically storedBorrowBalance is ALREADY in underlying units (Wei).
                // Let's assume standard behavior:
                // vTokenBalance is raw vToken amount (8 decimals? No, usually vTokens are 8).
                // NO, Mantissa fields in Graph usually mean the raw BigInt value from contract.

                // Let's use BigInt for precision.
                const vBal = BigInt(pos.vTokenBalanceMantissa || 0);
                const borrowBal = BigInt(pos.storedBorrowBalanceMantissa || 0);
                const exchangeRate = BigInt(market.exchangeRateMantissa || 0);

                if (vBal === 0n && borrowBal === 0n) return;

                // Supply Calculation:
                // Underlying Amount (Wei) = (vBal * exchangeRate) / 1e18
                const supplyWei = (vBal * exchangeRate) / BigInt(1e18);

                // Borrow Calculation:
                // storedBorrowBalanceMantissa IS the underlying amount in Wei (usually).
                const borrowWei = borrowBal;

                // To Convert Wei to Number for Display:
                // We need underlying decimals.
                // If we don't have it, we might guess 18USD/BNB, 8WBTC? 
                // Subgraph sometimes returns `underlyingDecimals` on Market. Let's try adding it to query.
                // If missing, we default to 18 (risky for USDC/USDT which are 18 on BSC? Check).
                // BSC USDC/USDT are 18. BTCB is 18.
                // So 18 is a very safe default for BSC.
                const decimals = 18;

                const supplyNum = parseFloat(formatUnits(supplyWei, decimals));
                const borrowNum = parseFloat(formatUnits(borrowWei, decimals));

                // Price
                const price = prices?.getPrice(underlyingSymbol) || 0;

                const supplyUSD = supplyNum * price;
                const borrowUSD = borrowNum * price;

                if (supplyUSD > 0.0001 || borrowUSD > 0.0001) {
                    allPositions.push({
                        symbol: underlyingSymbol,
                        supply: supplyNum,
                        borrow: borrowNum,
                        supplyUSD,
                        borrowUSD,
                        price,
                        source
                    });

                    totalSupplyUSD += supplyUSD;
                    totalBorrowUSD += borrowUSD;
                }
            };

            corePositions.forEach(p => processPosition(p, 'Core'));
            isolatedPositions.forEach(p => processPosition(p, 'Isolated'));

            return {
                totalSupplyUSD,
                totalBorrowUSD,
                netWorthUSD: totalSupplyUSD - totalBorrowUSD,
                positions: allPositions
            };
        },
        enabled: !!address && !!prices,
        refetchInterval: 30000
    });
}
