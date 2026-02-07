'use client';

import * as React from 'react';
import {
    RainbowKitProvider,
    darkTheme,
    lightTheme,
} from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { config } from '@/lib/wagmi';
import { ThemeProvider, useTheme } from 'next-themes';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                    <RainbowKitThemedProvider>
                        {children}
                    </RainbowKitThemedProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}

function RainbowKitThemedProvider({ children }: { children: React.ReactNode }) {
    const { theme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <RainbowKitProvider
            theme={theme === 'dark' || !mounted ? darkTheme({
                accentColor: '#CEFF00', // Neon Lime
                accentColorForeground: 'black',
                borderRadius: 'medium',
            }) : lightTheme({
                accentColor: '#CEFF00', // Neon Lime
                accentColorForeground: 'black',
                borderRadius: 'medium',
            })}
        >
            {children}
        </RainbowKitProvider>
    );
}
