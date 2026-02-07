'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccount } from 'wagmi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { useYields } from "@/hooks/useYields";

export function Portfolio() {
    const { address } = useAccount();
    const { data: yields } = useYields();

    const data = [
        { name: 'USDT', value: 400, color: '#26A17B' },
        { name: 'BNB', value: 300, color: '#F0B90B' },
        { name: 'ETH', value: 300, color: '#627EEA' },
    ];

    return (
        <div className="container py-12 space-y-8 max-w-screen-2xl mx-auto px-8 md:px-16">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">My Portfolio</h1>
                <div className="text-sm text-muted-foreground">Detailed breakdown of your DeFi positions.</div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid gap-6 md:grid-cols-4">
                <Card className="border-l-4 border-l-primary/80 glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">$0.00</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500/80 glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Supplied</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-400">$0.00</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500/80 glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Debt</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-400">$0.00</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500/80 glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Claimable Rewards</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-400">$0.00</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Asset Allocation Chart */}
                <Card className="col-span-1 border border-border bg-card">
                    <CardHeader>
                        <CardTitle>Asset Allocation</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Detailed Positions Table */}
                <Card className="col-span-2 border border-border bg-card">
                    <CardHeader>
                        <CardTitle>Active Positions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border border-border">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground">
                                    <tr>
                                        <th className="p-4 font-medium">Asset</th>
                                        <th className="p-4 font-medium">Protocol</th>
                                        <th className="p-4 font-medium text-right">Supply APY</th>
                                        <th className="p-4 font-medium text-right">Borrow APY</th>
                                        <th className="p-4 font-medium text-right">Your Supply</th>
                                        <th className="p-4 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {(yields || []).slice(0, 5).map((pool) => (
                                        <tr key={pool.pool} className="hover:bg-muted/50 transition-colors group">
                                            <td className="p-4 font-bold flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs">
                                                    {pool.symbol[0]}
                                                </div>
                                                {pool.symbol}
                                            </td>
                                            <td className="p-4 text-muted-foreground capitalize">
                                                {pool.project === 'venus-core-pool' ? 'Venus' : pool.project}
                                            </td>
                                            <td className="p-4 text-emerald-400 font-mono text-right">
                                                {pool.apy.toFixed(2)}%
                                            </td>
                                            <td className="p-4 text-red-400 font-mono text-right">
                                                {(pool.apyBase / 1.5).toFixed(2)}% {/* Est. Borrow */}
                                            </td>
                                            <td className="p-4 text-right font-mono text-muted-foreground group-hover:text-foreground">
                                                0.00
                                            </td>
                                            <td className="p-4 text-right">
                                                <button className="text-xs bg-primary/20 hover:bg-primary/40 text-primary px-3 py-1 rounded-full transition-colors">
                                                    Manage
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!yields || yields.length === 0) && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                                Loading market data...
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
