import { useReadContract, useReadContracts, useAccount } from 'wagmi';
import { parseAbi, formatUnits } from 'viem';
import { useTokenPrices } from './useTokenPrices';

const RADIANT_POOL_ADDRESS = '0xd50Cf00b6e600Dd036Ba8eF475677d816d6c4281';
const RADIANT_DATA_PROVIDER = '0x2f9D57E97C3DFED8676e605BC504a48E0c5917E9';

const POOL_ABI = parseAbi([
    'function getReservesList() view returns (address[])'
]);

const DATA_PROVIDER_ABI = parseAbi([
    'function getUserReserveData(address asset, address user) view returns (uint256 currentATokenBalance, uint256 currentStableDebt, uint256 currentVariableDebt, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usageAsCollateralEnabled)',
    'function getReserveConfigurationData(address asset) view returns (uint256 decimals, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus, uint256 reserveFactor, bool usageAsCollateralEnabled, bool borrowingEnabled, bool stableBorrowRateEnabled, bool isActive, bool isFrozen)'
]);

const ERC20_ABI = parseAbi([
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)'
]);

export function useRadiantPortfolio() {
    const { address } = useAccount();
    const { data: prices } = useTokenPrices();

    // 1. Fetch Reserve List
    const { data: reservesList } = useReadContract({
        address: RADIANT_POOL_ADDRESS,
        abi: POOL_ABI,
        functionName: 'getReservesList',
        query: {
            staleTime: 1000 * 60 * 60 * 24, // 24 hours
        }
    });

    const reserves = (reservesList as `0x${string}`[]) || [];

    // 2. Multicall for User Data
    // For each reserve, get User Reserve Data AND Token Symbol/Decimals (optimization: can cache decimals/symbols)
    // We'll just fetch symbol/decimals for now or try to use a static map if slow.
    // Let's fetch Symbol from the asset address.
    const contractCalls = reserves.flatMap(asset => [
        { address: RADIANT_DATA_PROVIDER, abi: DATA_PROVIDER_ABI, functionName: 'getUserReserveData', args: [asset, address] },
        { address: asset, abi: ERC20_ABI, functionName: 'symbol' },
        { address: asset, abi: ERC20_ABI, functionName: 'decimals' }
    ]);

    const { data: activeData } = useReadContracts({
        contracts: address && reserves.length > 0 ? contractCalls as any[] : [],
        query: {
            enabled: !!address && reserves.length > 0,
            refetchInterval: 15000
        }
    });

    // 3. Process
    let totalSupplyUSD = 0;
    let totalBorrowUSD = 0;
    const positions: any[] = [];

    if (activeData && prices) {
        // 3 calls per asset
        for (let i = 0; i < reserves.length; i++) {
            const baseIndex = i * 3;
            const userRes = activeData[baseIndex];
            const symRes = activeData[baseIndex + 1];
            const decRes = activeData[baseIndex + 2];

            if (userRes.status === 'success') {
                const [
                    currentATokenBalance,
                    currentStableDebt,
                    currentVariableDebt,
                    // ... others ignored
                ] = userRes.result as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, number, boolean];

                const totalDebtRaw = currentStableDebt + currentVariableDebt;

                if (currentATokenBalance === BigInt(0) && totalDebtRaw === BigInt(0)) continue;

                const symbol = symRes.status === 'success' ? (symRes.result as string) : 'Unknown';
                const decimals = decRes.status === 'success' ? (decRes.result as number) : 18;

                const supplyNum = parseFloat(formatUnits(currentATokenBalance, decimals));
                const borrowNum = parseFloat(formatUnits(totalDebtRaw, decimals));

                const price = prices.getPrice(symbol); // "WBNB" -> BNB handled by getPrice usually? needs check.

                const supplyUSD = supplyNum * price;
                const borrowUSD = borrowNum * price;

                totalSupplyUSD += supplyUSD;
                totalBorrowUSD += borrowUSD;

                positions.push({
                    symbol,
                    supply: supplyNum,
                    supplyUSD,
                    borrow: borrowNum,
                    borrowUSD,
                    price,
                    apy: 0 // TODO: parse liquidityRate for APY if needed
                });
            }
        }
    }

    return {
        totalSupplyUSD,
        totalBorrowUSD,
        netWorthUSD: totalSupplyUSD - totalBorrowUSD,
        positions
    };
}
