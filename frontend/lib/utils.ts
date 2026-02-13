import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import React from 'react';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const formatMoney = (num: number) => {
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(2)}`;
};

/**
 * Format token amounts with subscript notation for tiny values.
 * e.g. 0.0000032 → "0.0₅32" where ₅ is rendered as subscript.
 * Returns a string for non-tiny values, or a React node for tiny values.
 */
export const formatTokenAmount = (num: number): string => {
    if (num === 0) return '0';
    if (num >= 1) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    if (num >= 0.01) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    if (num >= 0.0001) return num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });

    // For very small numbers, return compact string like <0.0001
    // The JSX subscript version is in formatSmallNumber below
    return '<0.0001';
};

/**
 * Format tiny token amounts with subscript zero-count notation.
 * 0.0000032 → React element: "0.0(5)32" with (5) as <sub>.
 * For normal amounts, returns plain text.
 */
export function formatSmallNumber(num: number): React.ReactNode {
    if (num === 0) return '0';
    if (num >= 0.0001) return formatTokenAmount(num);

    // Count leading zeros after "0."
    const str = num.toFixed(20); // max precision
    const match = str.match(/^0\.(0+)(\d{2,4})/);
    if (!match) return formatTokenAmount(num);

    const zeroCount = match[1].length;
    const significantDigits = match[2];

    return React.createElement(
        'span',
        null,
        '0.0',
        React.createElement('sub', null, zeroCount.toString()),
        significantDigits
    );
}

/**
 * Get the number of decimals for a token on BSC.
 * Most BSC tokens use 18 decimals.
 */
export const TOKEN_DECIMALS: Record<string, number> = {
    'BTCB': 18,
    'ETH': 18,
    'BNB': 18,
    'WBNB': 18,
    'USDT': 18,
    'USDC': 18,
    'BUSD': 18,
    'DAI': 18,
    'XRP': 18,
    'ADA': 18,
    'CAKE': 18,
    'FDUSD': 18,
    'LINK': 18,
    'DOT': 18,
    'LTC': 18,
    'FIL': 18,
    'SOL': 18,
    'WBETH': 18,
    'BCH': 18,
};

export function getTokenDecimals(symbol: string): number {
    return TOKEN_DECIMALS[symbol] || 18;
}

/**
 * Converts a number to a plain string, avoiding scientific notation.
 * Trims unnecessary trailing zeros for a clean display.
 */
export function toPlainString(num: number): string {
    // We use toFixed with a large precision to avoid scientific notation,
    // then regex to remove trailing zeros and the decimal point if it's no longer needed.
    return num.toFixed(18).replace(/\.?0+$/, "");
}
