import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { bsc, bscTestnet } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: 'OpButler',
    projectId: 'YOUR_PROJECT_ID', // Get one from Cloud WalletConnect
    chains: [bsc],
    ssr: true, // If your dApp uses server side rendering (SSR)
});
