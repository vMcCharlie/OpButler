'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Markets } from "@/components/Markets"
import { StrategyBuilder } from "@/components/StrategyBuilder"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAccount, useReadContract } from 'wagmi';
import { OpButlerFactoryABI, OPBUTLER_FACTORY_ADDRESS } from "@/contracts";
import { useVenusHealth } from "@/hooks/useVenusData";

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

    // 2. Fetch Health Data for that Wallet
    const { safeLimitUSD, dangerAmountUSD, isSafe, formattedLiquidity, formattedShortfall } = useVenusHealth(walletAddress as `0x${string}` | undefined);

    return (
        <div className="container py-12 space-y-8 max-w-screen-2xl mx-auto px-8 md:px-16">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">My Dashboard</h1>
                <div className="text-sm text-muted-foreground">Welcome back, Strategist.</div>
            </div>

            {/* Top Stats */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

                {/* Stat 1: Net APY (Placeholder) */}
                <Card className="border-l-4 border-l-primary/80">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Net APY</CardTitle>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-primary drop-shadow-[0_0_5px_rgba(240,185,11,0.5)]"
                        >
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold bg-gradient-to-r from-primary to-white bg-clip-text text-transparent">--%</div>
                        <p className="text-xs text-primary/80 mt-1">
                            Select a strategy to see details
                        </p>
                    </CardContent>
                </Card>

                {/* Stat 2: Active Health Factor / Liquidity */}
                <Card className={`border-l-4 ${!isSafe ? 'border-l-destructive' : 'border-l-emerald-500/80'}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {walletAddress ? 'Account Liquidity' : 'Wallet Status'}
                        </CardTitle>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className={`h-4 w-4 ${!isSafe ? 'text-destructive' : 'text-emerald-500'}`}
                        >
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        {walletAddress ? (
                            <>
                                <div className={`text-3xl font-bold ${!isSafe ? 'text-destructive' : 'text-foreground'}`}>
                                    ${!isSafe ? formattedShortfall : formattedLiquidity}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {!isSafe ? '⚠️ AT RISK OF LIQUIDATION' : 'Safe Access Liquidity'}
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="text-xl font-bold text-muted-foreground">No Proxy</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Deploy OpButler Wallet first
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] rounded-full pointer-events-none"></div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Portfolio Performance (Simulated)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[120px] p-0 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F0B90B" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#F0B90B" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                                    itemStyle={{ color: '#F0B90B' }}
                                    cursor={{ stroke: '#F0B90B', strokeWidth: 1, strokeDasharray: '3 3' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#F0B90B"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Area */}
            <div className="grid gap-8 lg:grid-cols-3">
                {/* Left Column: Markets & Positions */}
                <div className="lg:col-span-2 space-y-8">
                    <Markets />

                    <div className="grid gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Active Positions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {walletAddress ? (
                                    <p className="text-muted-foreground text-center py-8">
                                        Smart Wallet deployed at <span className="text-primary font-mono text-xs mx-1">{String(walletAddress)}</span>
                                        <img src="https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png" alt="BNB Chain" className="w-4 h-4 inline-block align-middle ml-1" title="BNB Chain" />.
                                        <br />No active strategies detected.
                                    </p>
                                ) : (
                                    <p className="text-muted-foreground text-center py-8">No active strategies via Smart Wallet Proxy.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Right Column: Strategy Builder */}
                <div>
                    <StrategyBuilder />
                </div>
            </div>
        </div>
    )
}
