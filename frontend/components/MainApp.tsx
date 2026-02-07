'use client';

import { useAccount } from 'wagmi';
import { Hero } from './Hero';
import { Dashboard } from './Dashboard';

export function MainApp() {
    const { isConnected } = useAccount();

    if (isConnected) {
        return <Dashboard />;
    }

    return <Hero />;
}
