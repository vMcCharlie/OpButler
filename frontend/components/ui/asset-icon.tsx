import Image from 'next/image';

const ASSET_LOGOS: Record<string, string> = {
    'USDT': 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png',
    'USDC': 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png',
    'FDUSD': 'https://s2.coinmarketcap.com/static/img/coins/64x64/26081.png', // FDUSD logo
    'BNB': 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png',
    'WBNB': 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png',
    'BTC': 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png',
    'BTCB': 'https://s2.coinmarketcap.com/static/img/coins/64x64/4023.png', // Explicit BTCB logo if available, or just generic BTC
    'ETH': 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
};

const BINANCE_BADGE = 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png'; // BNB Logo for badge

interface AssetIconProps {
    symbol: string;
    size?: number;
    className?: string;
}

export function AssetIcon({ symbol, size = 32, className = '' }: AssetIconProps) {
    // If exact match fails, try generic BTC for BTCB, etc.
    const logoUrl = ASSET_LOGOS[symbol.toUpperCase()] ||
        (symbol.toUpperCase() === 'BTCB' ? ASSET_LOGOS['BTC'] : ASSET_LOGOS['BNB']);

    return (
        <div className={`relative flex items-center justify-center bg-transparent ${className}`} style={{ width: size, height: size }}>
            {/* Main Token Logo */}
            <div className="rounded-full overflow-hidden bg-white/5 border border-white/10" style={{ width: size, height: size }}>
                <img src={logoUrl} alt={symbol} width={size} height={size} className="object-cover w-full h-full" />
            </div>

            {/* Binance Chain Badge (Bottom Right) */}
            <div className="absolute -bottom-1 -right-1 rounded-full border border-black bg-[#121216] p-[1px]" style={{ width: size * 0.45, height: size * 0.45 }}>
                <img src={BINANCE_BADGE} alt="BSC" className="w-full h-full object-contain" />
            </div>
        </div>
    );
}
