'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccount, useReadContract } from 'wagmi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { useYields } from "@/hooks/useYields";
import { useAggregatedHealth } from "@/hooks/useAggregatedHealth";
import { OpButlerFactoryABI, OPBUTLER_FACTORY_ADDRESS } from "@/contracts";
import { TrendingUp, AlertTriangle, ShieldCheck } from "lucide-react";

export function Portfolio() {
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

    // 2. Fetch Aggregated Health
    const healthData = useAggregatedHealth(walletAddress as `0x${string}` | undefined);
    const { totalNetWorthUSD, venus, kinza, radiant } = healthData;

    // 3. Prepare Chart Data
    const allocationData = [
        { name: 'Venus', value: venus?.liquidity || 0, color: '#F0B90B' },
        { name: 'Kinza', value: kinza?.liquidity || 0, color: '#3B82F6' },
        { name: 'Radiant', value: radiant?.totalCollateral || 0, color: '#A855F7' },
    ].filter(d => d.value > 0);

    const totalSupplied = (venus?.liquidity || 0) + (kinza?.liquidity || 0) + (radiant?.totalCollateral || 0);
    const totalDebt = (venus?.shortfall || 0) + (kinza?.shortfall || 0) + (radiant?.totalDebt || 0);

    return (
        <div className="container py-12 space-y-8 max-w-screen-2xl mx-auto px-8 md:px-16">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">My Portfolio</h1>
                    <div className="text-sm text-muted-foreground">Detailed breakdown of your DeFi positions across BNB Chain.</div>
                </div>
                {walletAddress && (
                    <div className="text-xs font-mono bg-muted px-3 py-1 rounded-full text-muted-foreground">
                        Wallet: {String(walletAddress).substring(0, 6)}...{String(walletAddress).substring(38)}
                    </div>
                )}
            </div>

            {/* Main Stats Grid */}
            <div className="grid gap-6 md:grid-cols-4">
                {/* Net Worth */}
                <Card className="border-l-4 border-l-primary/80 bg-gradient-to-br from-primary/5 via-card to-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
                        <div className="p-2 bg-primary/10 rounded-full">
                            <span className="text-primary font-bold">$</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold bg-gradient-to-r from-primary to-white bg-clip-text text-transparent">
                            ${(totalNetWorthUSD || 0).toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Total Equity
                        </p>
                    </CardContent>
                </Card>

                {/* Total Supplied */}
                <Card className="border-l-4 border-l-emerald-500/80">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Supplied</CardTitle>
                        <div className="p-2 bg-emerald-500/10 rounded-full">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-500">
                            ${totalSupplied.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Collateral & Liquidity
                        </p>
                    </CardContent>
                </Card>

                {/* Total Debt */}
                <Card className="border-l-4 border-l-red-500/80">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Debt</CardTitle>
                        <div className="p-2 bg-red-500/10 rounded-full">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-500">
                            ${totalDebt.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Global Borrowed Amount
                        </p>
                    </CardContent>
                </Card>

                {/* Health Status */}
                <Card className="border-l-4 border-l-blue-500/80">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Health Status</CardTitle>
                        <div className="p-2 bg-blue-500/10 rounded-full">
                            <ShieldCheck className="w-4 h-4 text-blue-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {(() => {
                            const isVenusSafe = venus?.isHealthy ?? true;
                            const isKinzaSafe = kinza?.isHealthy ?? true;
                            const isRadiantSafe = (!radiant?.healthFactor || radiant.healthFactor > 1.0);
                            const isAllSafe = isVenusSafe && isKinzaSafe && isRadiantSafe;

                            // Determine status: Inactive (Net Worth ~0) vs Healthy vs Risk
                            let statusText = 'Healthy';
                            let statusColor = 'text-emerald-500';

                            if (totalNetWorthUSD < 0.1) {
                                statusText = 'Inactive';
                                statusColor = 'text-muted-foreground';
                            } else if (!isAllSafe) {
                                statusText = 'Risk';
                                statusColor = 'text-red-500 animate-pulse';
                            }

                            return (
                                <>
                                    <div className={`text-3xl font-bold ${statusColor}`}>
                                        {statusText}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Overall Account Safety
                                    </p>
                                </>
                            );
                        })()}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Asset Allocation Chart */}
                <Card className="col-span-1 border border-border bg-card">
                    <CardHeader>
                        <CardTitle>Protocol Allocation</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {allocationData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={allocationData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {allocationData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-2">
                                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                </div>
                                <span className="text-sm font-medium">No active positions</span>
                                <span className="text-xs opacity-50 text-center px-4">Assets supplied to Venus, Kinza, or Radiant will appear here.</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Detailed Positions Table */}
                <Card className="col-span-2 border border-border bg-card">
                    <CardHeader>
                        <CardTitle>Protocol Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border border-border">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground">
                                    <tr>
                                        <th className="p-4 font-medium">Protocol</th>
                                        <th className="p-4 font-medium text-right">Liquidity / Collateral</th>
                                        <th className="p-4 font-medium text-right">Debt</th>
                                        <th className="p-4 font-medium text-center">Status</th>
                                        <th className="p-4 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {/* Venus Row */}
                                    <tr className="hover:bg-muted/50 transition-colors">
                                        <td className="p-4 font-bold flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full overflow-hidden bg-white">
                                                <img src="/venus.png" className="w-full h-full object-cover" alt="Venus" />
                                            </div>
                                            Venus
                                        </td>
                                        <td className="p-4 text-right font-mono">${(venus?.liquidity || 0).toFixed(2)}</td>
                                        <td className="p-4 text-right font-mono text-red-400">${(venus?.shortfall || 0).toFixed(2)}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${(venus?.isHealthy ?? true) ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {(venus?.isHealthy ?? true) ? 'Safe' : 'Risk'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <a href="/strategy?protocol=venus" className="inline-block">
                                                <button className="text-xs bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1 rounded-full transition-colors font-medium">Manage</button>
                                            </a>
                                        </td>
                                    </tr>

                                    {/* Kinza Row */}
                                    <tr className="hover:bg-muted/50 transition-colors">
                                        <td className="p-4 font-bold flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full overflow-hidden bg-white">
                                                <img src="/kinza.png" className="w-full h-full object-cover" alt="Kinza" />
                                            </div>
                                            Kinza
                                        </td>
                                        <td className="p-4 text-right font-mono">${(kinza?.liquidity || 0).toFixed(2)}</td>
                                        <td className="p-4 text-right font-mono text-red-400">${(kinza?.shortfall || 0).toFixed(2)}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${(kinza?.isHealthy ?? true) ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {(kinza?.isHealthy ?? true) ? 'Safe' : 'Risk'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <a href="/strategy?protocol=kinza" className="inline-block">
                                                <button className="text-xs bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1 rounded-full transition-colors font-medium">Manage</button>
                                            </a>
                                        </td>
                                    </tr>

                                    {/* Radiant Row */}
                                    <tr className="hover:bg-muted/50 transition-colors">
                                        <td className="p-4 font-bold flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full overflow-hidden bg-white">
                                                <img src="/radiant.jpeg" className="w-full h-full object-cover" alt="Radiant" />
                                            </div>
                                            Radiant
                                        </td>
                                        <td className="p-4 text-right font-mono">${(radiant?.totalCollateral || 0).toFixed(2)}</td>
                                        <td className="p-4 text-right font-mono text-red-400">${(radiant?.totalDebt || 0).toFixed(2)}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${(!radiant?.healthFactor || radiant.healthFactor > 1.0) ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {(!radiant?.healthFactor || radiant.healthFactor > 1.0) ? 'Safe' : 'Risk'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <a href="/strategy?protocol=radiant" className="inline-block">
                                                <button className="text-xs bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1 rounded-full transition-colors font-medium">Manage</button>
                                            </a>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
