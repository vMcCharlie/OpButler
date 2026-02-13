'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Markets } from "@/components/Markets"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAccount, useReadContract } from 'wagmi';
import { OpButlerFactoryABI, OPBUTLER_FACTORY_ADDRESS } from "@/contracts";
import { useAggregatedHealth } from "@/hooks/useAggregatedHealth";
import { useVenusPortfolio } from "@/hooks/useVenusPortfolio";
import { useKinzaPortfolio } from "@/hooks/useKinzaPortfolio";
import { useRadiantPortfolio } from "@/hooks/useRadiantPortfolio";
import { TrendingUp, AlertTriangle, Heart } from "lucide-react";

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

    // 3. Fetch Portfolio Data
    const { totalSupplyUSD: venusSupply, totalBorrowUSD: venusBorrow } = useVenusPortfolio();
    const { totalSupplyUSD: kinzaSupply, totalBorrowUSD: kinzaBorrow } = useKinzaPortfolio();
    const { totalSupplyUSD: radiantSupply, totalBorrowUSD: radiantBorrow } = useRadiantPortfolio();
    const totalSupplied = venusSupply + kinzaSupply + radiantSupply;
    const totalBorrowed = venusBorrow + kinzaBorrow + radiantBorrow;
    const totalNetWorth = totalSupplied - totalBorrowed;

    return (
        <div className="container pt-0 md:pt-8 pb-24 space-y-8 max-w-screen-2xl mx-auto px-4 md:px-16">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Dashboard</h1>
                    <div className="text-sm text-muted-foreground">
                        {address ? 'Welcome back, Strategist.' : 'Connect your wallet to view your personalized yields.'}
                    </div>
                </div>
            </div>

            {/* Top Stats: Aggregated Financials */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                {/* Total Net Worth */}
                <Card className="border-l-4 border-l-primary/80 bg-gradient-to-br from-primary/5 via-card to-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
                        <div className="p-2 bg-primary/10 rounded-full">
                            <span className="text-primary font-bold">$</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-white bg-clip-text text-transparent">
                            ${isLoading ? '...' : totalNetWorth.toFixed(2)}
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
                        <div className="text-2xl md:text-3xl font-bold text-emerald-500">
                            ${isLoading ? '...' : totalSupplied.toFixed(2)}
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
                        <div className="text-2xl md:text-3xl font-bold text-red-500">
                            ${isLoading ? '...' : totalBorrowed.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Global Borrowed Amount
                        </p>
                    </CardContent>
                </Card>

                {/* Aggregated Health Status */}
                <Card className="border-l-4 border-l-blue-500/80">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Health Score</CardTitle>
                        <div className="p-2 bg-blue-500/10 rounded-full">
                            <Heart className="w-4 h-4 text-blue-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl md:text-3xl font-bold ${healthData.overallScore >= 7 ? 'text-emerald-400' : healthData.overallScore >= 4 ? 'text-amber-400' : 'text-red-400'}`}>
                            {isLoading ? '...' : `${healthData.overallScore.toFixed(1)}/10`}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Overall Account Health
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Protocol Health Matrix */}
            <div className="grid gap-4 md:grid-cols-3">
                {[
                    { name: 'Venus Protocol', img: '/venus.png', supply: venusSupply, borrow: venusBorrow, health: healthData.venus },
                    { name: 'Kinza Finance', img: '/kinza.png', supply: kinzaSupply, borrow: kinzaBorrow, health: healthData.kinza },
                    { name: 'Radiant V2', img: '/radiant.jpeg', supply: radiantSupply, borrow: radiantBorrow, health: healthData.radiant },
                ].map((proto) => (
                    <Card key={proto.name} className="bg-card/50 border-input">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-white">
                                    <img src={proto.img} className="w-full h-full object-cover" alt={proto.name} />
                                </div>
                                {proto.name}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Supplied</span> <span className="font-mono">${proto.supply.toFixed(2)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Borrowed</span> <span className="font-mono text-red-400">${proto.borrow.toFixed(2)}</span></div>
                            <div className="mt-3 pt-2 border-t border-border flex justify-between items-center">
                                <span className="text-xs font-bold uppercase text-muted-foreground">Health</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${proto.health.status === 'safe' ? 'bg-emerald-500/20 text-emerald-500' :
                                    proto.health.status === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                                        proto.health.status === 'danger' ? 'bg-red-500/20 text-red-500' :
                                            'bg-muted/50 text-muted-foreground'
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${proto.health.status === 'safe' ? 'bg-emerald-400' :
                                        proto.health.status === 'warning' ? 'bg-amber-400' :
                                            proto.health.status === 'danger' ? 'bg-red-400' : 'bg-muted-foreground'
                                        }`} />
                                    {proto.health.hasPositions ? `${proto.health.healthFactor.toFixed(2)}` : 'N/A'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
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
