'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccount, useReadContract } from 'wagmi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { useYields } from "@/hooks/useYields";
import { useAggregatedHealth } from "@/hooks/useAggregatedHealth";
import { useVenusSubgraph } from "@/hooks/useVenusSubgraph";
import { useKinzaPortfolio } from "@/hooks/useKinzaPortfolio";
import { useRadiantPortfolio } from "@/hooks/useRadiantPortfolio";
import { OpButlerFactoryABI, OPBUTLER_FACTORY_ADDRESS } from "@/contracts";
import { TrendingUp, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";

export function Portfolio() {
    const { address } = useAccount();

    const [expandedProtocol, setExpandedProtocol] = useState<string | null>(null);

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

    // 2. Fetch Portfolio Data
    const { data: venusData } = useVenusSubgraph();
    const venusSupply = venusData?.totalSupplyUSD || 0;
    const venusBorrow = venusData?.totalBorrowUSD || 0;
    const venusPositions = venusData?.positions || [];

    const { totalSupplyUSD: kinzaSupply, totalBorrowUSD: kinzaBorrow, positions: kinzaPositions } = useKinzaPortfolio();
    const { totalSupplyUSD: radiantSupply, totalBorrowUSD: radiantBorrow, positions: radiantPositions } = useRadiantPortfolio();

    // 3. Health Data (Still useful for Safety status if hooks don't return health factor directly yet)
    const healthData = useAggregatedHealth(walletAddress as `0x${string}` | undefined);
    const { venus: venusHealth, kinza: kinzaHealth, radiant: radiantHealth } = healthData;

    // 4. Aggregations
    const totalSupplied = venusSupply + kinzaSupply + radiantSupply;
    const totalDebt = venusBorrow + kinzaBorrow + radiantBorrow;
    const totalNetWorth = totalSupplied - totalDebt;

    const allocationData = [
        { name: 'Venus', value: venusSupply, color: '#F0B90B' },
        { name: 'Kinza', value: kinzaSupply, color: '#3B82F6' },
        { name: 'Radiant', value: radiantSupply, color: '#A855F7' },
    ].filter(d => d.value > 0);

    const toggleExpand = (protocol: string) => {
        if (expandedProtocol === protocol) setExpandedProtocol(null);
        else setExpandedProtocol(protocol);
    };

    const renderPositionsTable = (positions: any[]) => {
        if (!positions || positions.length === 0) {
            return <div className="p-4 text-center text-muted-foreground text-xs">No active positions found.</div>;
        }
        return (
            <div className="bg-muted/30 p-4 rounded-b-lg border-t border-border animate-in slide-in-from-top-2">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-muted-foreground uppercase tracking-wider text-[10px] text-left">
                            <th className="pb-2 pl-2">Asset</th>
                            <th className="pb-2 text-right">Supplied</th>
                            <th className="pb-2 text-right">Borrowed</th>
                            <th className="pb-2 text-right">Value (USD)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {positions.map((pos, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                                <td className="py-2 pl-2 font-bold">{pos.symbol}</td>
                                <td className="py-2 text-right">
                                    <div className="text-emerald-500">{pos.supply > 0 ? pos.supply.toFixed(4) : '-'}</div>
                                    {pos.supplyUSD > 0 && <div className="text-[10px] text-muted-foreground">${pos.supplyUSD.toFixed(2)}</div>}
                                </td>
                                <td className="py-2 text-right">
                                    <div className="text-red-400">{pos.borrow > 0 ? pos.borrow.toFixed(4) : '-'}</div>
                                    {pos.borrowUSD > 0 && <div className="text-[10px] text-muted-foreground">${pos.borrowUSD.toFixed(2)}</div>}
                                </td>
                                <td className="py-2 text-right font-mono text-muted-foreground">
                                    ${(pos.supplyUSD - pos.borrowUSD).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="container py-12 pb-24 space-y-8 max-w-screen-2xl mx-auto px-4 md:px-16">
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
                            ${(totalNetWorth || 0).toFixed(2)}
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
                            const isVenusSafe = venusHealth?.isHealthy ?? true;
                            const isKinzaSafe = kinzaHealth?.isHealthy ?? true;
                            const isRadiantSafe = (!radiantHealth?.healthFactor || radiantHealth.healthFactor > 1.0);
                            const isAllSafe = isVenusSafe && isKinzaSafe && isRadiantSafe;

                            let statusText = 'Healthy';
                            let statusColor = 'text-emerald-500';

                            if ((totalNetWorth || 0) < 0.1) {
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
                                    <TrendingUp className="opacity-50" />
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
                        <div className="rounded-md border border-border overflow-hidden hidden md:block">
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
                                    <>
                                        <tr className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => toggleExpand('venus')}>
                                            <td className="p-4 font-bold flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full overflow-hidden bg-white">
                                                    <img src="/venus.png" className="w-full h-full object-cover" alt="Venus" />
                                                </div>
                                                Venus
                                                {expandedProtocol === 'venus' ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                                            </td>
                                            <td className="p-4 text-right font-mono">${venusSupply.toFixed(2)}</td>
                                            <td className="p-4 text-right font-mono text-red-400">${venusBorrow.toFixed(2)}</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${(venusHealth?.isHealthy ?? true) ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {(venusHealth?.isHealthy ?? true) ? 'Safe' : 'Risk'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button className="text-xs bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1 rounded-full transition-colors font-medium">
                                                    Manage
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedProtocol === 'venus' && (
                                            <tr>
                                                <td colSpan={5} className="p-0">
                                                    {renderPositionsTable(venusPositions)}
                                                </td>
                                            </tr>
                                        )}
                                    </>

                                    {/* Kinza Row */}
                                    <>
                                        <tr className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => toggleExpand('kinza')}>
                                            <td className="p-4 font-bold flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full overflow-hidden bg-white">
                                                    <img src="/kinza.png" className="w-full h-full object-cover" alt="Kinza" />
                                                </div>
                                                Kinza
                                                {expandedProtocol === 'kinza' ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                                            </td>
                                            <td className="p-4 text-right font-mono">${kinzaSupply.toFixed(2)}</td>
                                            <td className="p-4 text-right font-mono text-red-400">${kinzaBorrow.toFixed(2)}</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${(kinzaHealth?.isHealthy ?? true) ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {(kinzaHealth?.isHealthy ?? true) ? 'Safe' : 'Risk'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button className="text-xs bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1 rounded-full transition-colors font-medium">
                                                    Manage
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedProtocol === 'kinza' && (
                                            <tr>
                                                <td colSpan={5} className="p-0">
                                                    {renderPositionsTable(kinzaPositions)}
                                                </td>
                                            </tr>
                                        )}
                                    </>

                                    {/* Radiant Row */}
                                    <>
                                        <tr className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => toggleExpand('radiant')}>
                                            <td className="p-4 font-bold flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full overflow-hidden bg-white">
                                                    <img src="/radiant.jpeg" className="w-full h-full object-cover" alt="Radiant" />
                                                </div>
                                                Radiant
                                                {expandedProtocol === 'radiant' ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                                            </td>
                                            <td className="p-4 text-right font-mono">${radiantSupply.toFixed(2)}</td>
                                            <td className="p-4 text-right font-mono text-red-400">${radiantBorrow.toFixed(2)}</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${(!radiantHealth?.healthFactor || radiantHealth.healthFactor > 1.0) ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {(!radiantHealth?.healthFactor || radiantHealth.healthFactor > 1.0) ? 'Safe' : 'Risk'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button className="text-xs bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1 rounded-full transition-colors font-medium">
                                                    Manage
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedProtocol === 'radiant' && (
                                            <tr>
                                                <td colSpan={5} className="p-0">
                                                    {renderPositionsTable(radiantPositions)}
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-4">
                            {[
                                { id: 'venus', name: 'Venus', img: '/venus.png', supply: venusSupply, borrow: venusBorrow, isSafe: venusHealth?.isHealthy ?? true, positions: venusPositions },
                                { id: 'kinza', name: 'Kinza', img: '/kinza.png', supply: kinzaSupply, borrow: kinzaBorrow, isSafe: kinzaHealth?.isHealthy ?? true, positions: kinzaPositions },
                                { id: 'radiant', name: 'Radiant', img: '/radiant.jpeg', supply: radiantSupply, borrow: radiantBorrow, isSafe: (!radiantHealth?.healthFactor || radiantHealth.healthFactor > 1.0), positions: radiantPositions }
                            ].map((proto) => (
                                <div key={proto.id} className="rounded-xl border border-border bg-card overflow-hidden">
                                    <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(proto.id)}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-white/10">
                                                <img src={proto.img} className="w-full h-full object-cover" alt={proto.name} />
                                            </div>
                                            <div>
                                                <div className="font-bold flex items-center gap-2">
                                                    {proto.name}
                                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${proto.isSafe ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                        {proto.isSafe ? 'Safe' : 'Risk'}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                    <span>Sup: ${proto.supply.toFixed(0)}</span>
                                                    <span>•</span>
                                                    <span>Brw: ${proto.borrow.toFixed(0)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {expandedProtocol === proto.id ? <ChevronUp size={20} className="text-muted-foreground" /> : <ChevronDown size={20} className="text-muted-foreground" />}
                                    </div>

                                    {expandedProtocol === proto.id && (
                                        <div className="border-t border-border">
                                            {renderPositionsTable(proto.positions)}
                                            <div className="p-3 bg-muted/20 text-center">
                                                <button className="w-full text-xs bg-primary/20 hover:bg-primary/30 text-primary px-3 py-2 rounded-lg transition-colors font-medium">
                                                    Manage {proto.name}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

