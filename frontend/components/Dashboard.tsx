'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Markets } from "@/components/Markets"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAccount, useReadContract } from 'wagmi';
import { OpButlerFactoryABI, OPBUTLER_FACTORY_ADDRESS } from "@/contracts";
import { useAggregatedHealth } from "@/hooks/useAggregatedHealth";
import { TrendingUp, AlertTriangle } from "lucide-react";

const chartData = [
    { name: 'Mon', value: 1000 },
    { name: 'Tue', value: 1050 },
    { name: 'Wed', value: 1080 },
    { name: 'Thu', value: 1150 },
    { name: 'Fri', value: 1220 },
    { name: 'Sat', value: 1280 },
    { name: 'Sun', value: 1350 },
];

export function Dashboard() {
    const { address } = useAccount();

    // 1. Get User's Smart Wallet Address
    const { data: walletAddressRaw } = useReadContract({
        address: OPBUTLER_FACTORY_ADDRESS as `0x${string}`,
        abi: OpButlerFactoryABI,
        functionName: 'getWallet',
        args: address ? [address] : undefined,
        query: { enabled: !!address }
    });

    const walletAddress = (walletAddressRaw && walletAddressRaw !== '0x0000000000000000000000000000000000000000')
        ? walletAddressRaw
        : undefined;

    // 2. Fetch Aggregated Health Data
    const healthData = useAggregatedHealth(walletAddress as `0x${string}` | undefined);
    const isLoading = healthData.isLoading;

    return (
        <div className="container py-12 space-y-8 max-w-screen-2xl mx-auto px-8 md:px-16">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Dashboard</h1>
                    <div className="text-sm text-muted-foreground">
                        {address ? 'Welcome back, Strategist.' : 'Connect your wallet to view your personalized yields.'}
                    </div>
                </div>
            </div>

            {/* Top Stats: Aggregated Financials */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Net Worth */}
                <Card className="border-l-4 border-l-primary/80 bg-gradient-to-br from-primary/5 via-card to-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
                        <div className="p-2 bg-primary/10 rounded-full">
                            <span className="text-primary font-bold">$</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold bg-gradient-to-r from-primary to-white bg-clip-text text-transparent">
                            ${isLoading ? '...' : (healthData?.totalNetWorthUSD || 0).toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Across Venus, Kinza, Radiant
                        </p>
                    </CardContent>
                </Card>

                {/* Total Supply */}
                <Card className="border-l-4 border-l-emerald-500/80">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Supplied</CardTitle>
                        <div className="p-2 bg-emerald-500/10 rounded-full">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-500">
                            {/* Mock Aggregate for Demo as hooks return Health mainly */}
                            ${isLoading ? '...' : ((healthData?.radiant?.totalCollateral || 0) + (healthData?.venus?.liquidity || 0) + (healthData?.kinza?.liquidity || 0)).toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Collateral & Liquidity
                        </p>
                    </CardContent>
                </Card>

                {/* Total Debt */}
                <Card className="border-l-4 border-l-red-500/80">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Borrowed</CardTitle>
                        <div className="p-2 bg-red-500/10 rounded-full">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-500">
                            ${isLoading ? '...' : ((healthData?.radiant?.totalDebt || 0) + (healthData?.venus?.shortfall || 0) + (healthData?.kinza?.shortfall || 0)).toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Global Borrowed Amount
                        </p>
                    </CardContent>
                </Card>

                {/* Aggregated Health Status */}
                <Card className="border-l-4 border-l-blue-500/80">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Health Status</CardTitle>
                        <div className={`px-2 py-1 rounded-full text-xs font-bold ${(healthData?.radiant?.healthFactor || 999) > 1.5
                                ? 'bg-emerald-500/20 text-emerald-500'
                                : (healthData?.radiant?.healthFactor || 999) > 1.1
                                    ? 'bg-amber-500/20 text-amber-500'
                                    : 'bg-red-500/20 text-red-500'
                            }`}>
                            {(healthData?.radiant?.healthFactor || 999) > 1.5 ? 'Safe' :
                                (healthData?.radiant?.healthFactor || 999) > 1.1 ? 'Warning' : 'Critical'}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-400">
                            {isLoading ? '...' :
                                (healthData?.radiant?.healthFactor && healthData.radiant.healthFactor < 999)
                                    ? healthData.radiant.healthFactor.toFixed(2)
                                    : '∞'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Aggregate Health Factor
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Protocol Health Matrix */}
            <div className="grid gap-4 md:grid-cols-3">
                {/* Venus */}
                <Card className="bg-card/50 border-input">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-white">
                                <img src="/venus.png" className="w-full h-full object-cover" alt="Venus" />
                            </div>
                            Venus Protocol
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Available Credit</span> <span className="font-mono">${healthData?.venus?.liquidity?.toFixed(2) || '0.00'}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Debt Risk</span> <span className="font-mono text-red-400">${healthData?.venus?.shortfall?.toFixed(2) || '0.00'}</span></div>
                        <div className="mt-3 pt-2 border-t border-border flex justify-between items-center">
                            <span className="text-xs font-bold uppercase text-muted-foreground">Health Score</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${(healthData?.venus?.isHealthy ?? true) ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                                {(healthData?.venus?.isHealthy ?? true) ? 'Safe' : 'Risk'}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Kinza */}
                <Card className="bg-card/50 border-input">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-white">
                                <img src="/kinza.png" className="w-full h-full object-cover" alt="Kinza" />
                            </div>
                            Kinza Finance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Available Credit</span> <span className="font-mono">${healthData?.kinza?.liquidity?.toFixed(2) || '0.00'}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Debt Risk</span> <span className="font-mono text-red-400">${healthData?.kinza?.shortfall?.toFixed(2) || '0.00'}</span></div>
                        <div className="mt-3 pt-2 border-t border-border flex justify-between items-center">
                            <span className="text-xs font-bold uppercase text-muted-foreground">Health Score</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${(healthData?.kinza?.isHealthy ?? true) ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                                {(healthData?.kinza?.isHealthy ?? true) ? 'Safe' : 'Risk'}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Radiant */}
                <Card className="bg-card/50 border-input">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-white">
                                <img src="/radiant.jpeg" className="w-full h-full object-cover" alt="Radiant" />
                            </div>
                            Radiant V2
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Supplied</span> <span className="font-mono">${healthData?.radiant?.totalCollateral?.toFixed(2) || '0.00'}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Borrowed</span> <span className="font-mono text-red-400">${healthData?.radiant?.totalDebt?.toFixed(2) || '0.00'}</span></div>
                        <div className="mt-3 pt-2 border-t border-border flex justify-between items-center">
                            <span className="text-xs font-bold uppercase text-muted-foreground">Health Score</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${(!healthData?.radiant?.healthFactor || healthData.radiant.healthFactor > 1.1) ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                                {(!healthData?.radiant?.healthFactor || healthData.radiant.healthFactor >= 999) ? '∞' : healthData.radiant.healthFactor.toFixed(2)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Area: Markets Only */}
            <Card className="col-span-full border-none shadow-none bg-transparent">
                <div className="space-y-4">
                    <h2 className="text-xl font-bold tracking-tight">Market Opportunities</h2>
                    <Markets />
                </div>
            </Card>
        </div>
    )
}
