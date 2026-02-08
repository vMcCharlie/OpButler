import { useQuery } from '@tanstack/react-query';

const BINANCE_API = 'https://api.binance.com/api/v3/ticker/price';

// Map our internal symbols to Binance Ticker symbols
// We use USDT pairs for all
const SYMBOL_MAP: Record<string, string> = {
    'BNB': 'BNBUSDT',
    'WBTC': 'BTCUSDT',
    'BTCB': 'BTCUSDT',
    'BTC': 'BTCUSDT',
    'ETH': 'ETHUSDT',
    'WETH': 'ETHUSDT',
    'SOL': 'SOLUSDT',
    'CAKE': 'CAKEUSDT',
    'XRP': 'XRPUSDT',
    'ADA': 'ADAUSDT',
    'DOGE': 'DOGEUSDT',
    'DOT': 'DOTUSDT',
    'UNI': 'UNIUSDT',
    'LINK': 'LINKUSDT',
    'LTC': 'LTCUSDT',
    'BCH': 'BCHUSDT',
    'FIL': 'FILUSDT',
    'MATIC': 'MATICUSDT',
    'OP': 'OPUSDT',
    'ARB': 'ARBUSDT',
    // Stables (Assume 1.0 or fetch)
    'USDT': 'USDTUSDT', // Not valid, need handling
    'USDC': 'USDCUSDT',
    'FDUSD': 'FDUSDUSDT',
    'DAI': 'DAIUSDT' // Might not exist on Binance main pairs always
};

// Fallback for stables if API fails or pair missing
const STABLE_PRICES: Record<string, number> = {
    'USDT': 1.0,
    'USDC': 1.0,
    'FDUSD': 1.0,
    'DAI': 1.0,
    'BUSD': 1.0
};

async function fetchPrices() {
    try {
        const response = await fetch(BINANCE_API);
        const data = await response.json();
        // data is { symbol: string, price: string }[]

        const priceMap: Record<string, number> = {};

        if (Array.isArray(data)) {
            data.forEach((item: any) => {
                priceMap[item.symbol] = parseFloat(item.price);
            });
        }

        return priceMap;
    } catch (error) {
        console.error("Failed to fetch prices", error);
        return {};
    }
}

export function useTokenPrices() {
    return useQuery({
        queryKey: ['token-prices'],
        queryFn: fetchPrices,
        refetchInterval: 30000, // 30s
        staleTime: 60000,
        select: (data) => {
            // Return a function or object to get price by symbol
            const getPrice = (symbol: string) => {
                const upper = symbol.toUpperCase();

                // 1. Check Stables
                if (STABLE_PRICES[upper]) return STABLE_PRICES[upper];

                // 2. Check Binance Pair
                const pair = SYMBOL_MAP[upper];
                if (pair && data[pair]) return data[pair];

                // 3. Fallback / Direct check (e.g. symbol + 'USDT')
                if (data[`${upper}USDT`]) return data[`${upper}USDT`];

                return 0; // Unknown
            };

            return { getPrice, raw: data };
        }
    });
}
