'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Markets } from "@/components/Markets"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAccount, useReadContract } from 'wagmi';
import { useAggregatedHealth } from "@/hooks/useAggregatedHealth";
import { useVenusPortfolio } from "@/hooks/useVenusPortfolio";
import { useKinzaPortfolio } from "@/hooks/useKinzaPortfolio";
import { useRadiantPortfolio } from "@/hooks/useRadiantPortfolio";
import { TrendingUp, AlertTriangle, Heart, Plus } from "lucide-react";

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

    // 2. Fetch Aggregated Health Data
    // We use the connected address directly as the "wallet" for now, or adapt as needed.
    // If the hook expects a specific smart wallet address, and we removed the factory fetch,
    // we should clarify if we just pass `address` or if we need another way.
    // Assuming for now `address` (EOA) or `undefined` is acceptable or that
    // the previous logic was specifically for a smart wallet factory that is now deprecated.
    // If the user says "we don't need contracts", we likely rely on EOA or a different mechanism.
    const healthData = useAggregatedHealth(address);
    const isLoading = healthData.isLoading;

    // 3. Fetch Portfolio Data
    const { totalSupplyUSD: venusSupply, totalBorrowUSD: venusBorrow, positions: venusPositions } = useVenusPortfolio();
    const { totalSupplyUSD: kinzaSupply, totalBorrowUSD: kinzaBorrow, positions: kinzaPositions } = useKinzaPortfolio();
    const { totalSupplyUSD: radiantSupply, totalBorrowUSD: radiantBorrow, positions: radiantPositions } = useRadiantPortfolio();

    // Helper to calculate Net APY
    const calculateNetAPY = (positions: any[], netWorth: number) => {
        if (netWorth <= 0) return 0;
        let totalAnnualIncome = 0;
        let totalAnnualCost = 0;

        positions.forEach(pos => {
            if (pos.supplyUSD > 0) {
                totalAnnualIncome += pos.supplyUSD * (pos.apy / 100);
            }
            if (pos.borrowUSD > 0) {
                totalAnnualCost += pos.borrowUSD * (pos.borrowApy / 100);
            }
        });

        const netAnnual = totalAnnualIncome - totalAnnualCost;
        return (netAnnual / netWorth) * 100;
    };

    const totalSupplied = venusSupply + kinzaSupply + radiantSupply;
    const totalBorrowed = venusBorrow + kinzaBorrow + radiantBorrow;
    const totalNetWorth = totalSupplied - totalBorrowed;

    // Calculate APYs
    const allPositions = [...(venusPositions || []), ...(kinzaPositions || []), ...(radiantPositions || [])];
    const globalNetAPY = calculateNetAPY(allPositions, totalNetWorth);
    const venusNetAPY = calculateNetAPY(venusPositions || [], venusSupply - venusBorrow);
    const kinzaNetAPY = calculateNetAPY(kinzaPositions || [], kinzaSupply - kinzaBorrow);
    const radiantNetAPY = calculateNetAPY(radiantPositions || [], radiantSupply - radiantBorrow);

    return (
        <div className="container pt-0 md:pt-8 pb-24 space-y-8 max-w-screen-2xl mx-auto px-4 md:px-16">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 font-outfit bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-400">
                        Dashboard
                    </h1>
                    <div className="text-sm text-muted-foreground">
                        {address ? 'Welcome back, Strategist.' : 'Connect your wallet to view your personalized yields.'}
                    </div>
                </div>
            </div>

            {/* Top Stats: Aggregated Financials */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                {/* Total Net Worth */}
                <div className="group relative overflow-hidden rounded-[2rem] bg-[#0A0A0B] border border-white/10 p-5 md:p-8 transition-all hover:bg-white/[0.04] shadow-2xl">
                    <div className="flex flex-col h-full justify-between">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 mb-5 md:mb-8">
                            <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                                <span className="text-lg md:text-xl font-black text-emerald-500">$</span>
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-muted-foreground/40 leading-none">Net Worth</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl md:text-5xl font-bold text-white leading-none tracking-tight mb-2 md:mb-3">
                                ${!address ? '0.00' : isLoading ? '...' : totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                {isLoading && address ? (
                                    <span className="text-[8px] md:text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest leading-none">Loading...</span>
                                ) : (
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-sm font-black text-emerald-400 leading-none">
                                            {globalNetAPY > 0 ? '+' : ''}{globalNetAPY.toFixed(2)}%
                                        </span>
                                        <span className="text-[8px] md:text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest leading-none">
                                            Net APY
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Total Supply */}
                <div className="group relative overflow-hidden rounded-[2rem] bg-[#0A0A0B] border border-white/10 p-5 md:p-8 transition-all hover:bg-white/[0.04] shadow-2xl">
                    <div className="flex flex-col h-full justify-between">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 mb-5 md:mb-8">
                            <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-emerald-400/10 flex items-center justify-center border border-emerald-400/20 shrink-0">
                                <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-muted-foreground/40 leading-none">Supplied</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl md:text-5xl font-bold text-emerald-400 leading-none tracking-tight mb-2 md:mb-3">
                                ${!address ? '0.00' : isLoading ? '...' : totalSupplied.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                                <span className="text-[8px] md:text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest leading-none">Active</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Total Debt */}
                <div className="group relative overflow-hidden rounded-[2rem] bg-[#0A0A0B] border border-white/10 p-5 md:p-8 transition-all hover:bg-white/[0.04] shadow-2xl">
                    <div className="flex flex-col h-full justify-between">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 mb-5 md:mb-8">
                            <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shrink-0">
                                <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-muted-foreground/40 leading-none">Borrowed</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl md:text-5xl font-bold text-red-500 leading-none tracking-tight mb-2 md:mb-3">
                                ${!address ? '0.00' : isLoading ? '...' : totalBorrowed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                <span className="text-[8px] md:text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest leading-none">Liability</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Projected Earnings */}
                <div className="group relative overflow-hidden rounded-[2rem] bg-[#0A0A0B] border border-white/10 p-5 md:p-8 transition-all hover:bg-white/[0.04] shadow-2xl">
                    <div className="absolute top-0 right-0 p-2 md:p-4 opacity-5 group-hover:opacity-100 transition-opacity">
                        <div className="w-5 h-5 md:w-8 md:h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/5">
                            <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-white" />
                        </div>
                    </div>
                    <div className="flex flex-col h-full justify-between">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 mb-5 md:mb-8">
                            <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                                <span className="text-lg md:text-xl font-black text-emerald-500">$</span>
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-muted-foreground/40 leading-none">Est. Earnings</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl md:text-5xl font-bold text-emerald-400 leading-none tracking-tight mb-2 md:mb-3">
                                ${!address ? '0.00' : isLoading ? '...' : (totalNetWorth * (globalNetAPY / 100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <span className="text-[8px] md:text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest leading-none">Projected Annual Yield</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Protocol Health Matrix */}
            <div className="grid gap-4 md:grid-cols-3">
                {[
                    { name: 'Venus Protocol', img: '/venus.png', supply: venusSupply, borrow: venusBorrow, health: healthData.venus, apy: venusNetAPY },
                    { name: 'Kinza Finance', img: '/kinza.png', supply: kinzaSupply, borrow: kinzaBorrow, health: healthData.kinza, apy: kinzaNetAPY },
                    { name: 'Radiant V2', img: '/radiant.jpeg', supply: radiantSupply, borrow: radiantBorrow, health: healthData.radiant, apy: radiantNetAPY },
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
                            {proto.supply > 0 && (
                                <div className="pt-2 flex justify-between items-center border-t border-border mt-2">
                                    <span className="text-xs font-bold uppercase text-muted-foreground">Net APY</span>
                                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                        {proto.apy.toFixed(2)}%
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Content Area: Markets Only */}
            <Card className="col-span-full border-none shadow-none bg-transparent">
                <Markets />
            </Card>
        </div>
    )
}
