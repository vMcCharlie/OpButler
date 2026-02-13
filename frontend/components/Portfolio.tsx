'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccount, useReadContract } from 'wagmi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { AssetIcon } from "@/components/ui/asset-icon";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { useAggregatedHealth, ProtocolHealth } from "@/hooks/useAggregatedHealth";
import { useVenusPortfolio } from "@/hooks/useVenusPortfolio";
import { useKinzaPortfolio } from "@/hooks/useKinzaPortfolio";
import { useRadiantPortfolio } from "@/hooks/useRadiantPortfolio";
import { OpButlerFactoryABI, OPBUTLER_FACTORY_ADDRESS } from "@/contracts";
import { TrendingUp, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, Heart, Activity, Loader2 } from "lucide-react";
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { VENUS_COMPTROLLER, COMPTROLLER_ABI } from '@/lib/pool-config';

// --- Health Factor Badge ---
function HealthBadge({ health }: { health: ProtocolHealth }) {
    if (!health.hasPositions) {
        return (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-muted/50 text-muted-foreground">
                Inactive
            </span>
        );
    }

    const config = {
        safe: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Safe' },
        warning: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Warning' },
        danger: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', label: 'Risk' },
        inactive: { bg: 'bg-muted/50', text: 'text-muted-foreground', border: 'border-muted', label: 'Inactive' },
    }[health.status];

    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${config.bg} ${config.text} ${config.border} inline-flex items-center gap-1`}>
            <span className={`w-1.5 h-1.5 rounded-full ${health.status === 'safe' ? 'bg-emerald-400' : health.status === 'warning' ? 'bg-amber-400' : 'bg-red-400'}`} />
            {config.label}
            {health.healthFactor > 0 && (
                <span className="ml-0.5 opacity-70">{health.healthFactor.toFixed(2)}</span>
            )}
        </span>
    );
}

// --- Custom Pie Chart Tooltip ---
function CustomTooltip({ active, payload }: any) {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl px-4 py-3 shadow-2xl">
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                    <span className="font-bold text-sm text-foreground">{data.name}</span>
                </div>
                <div className="text-xs space-y-0.5 text-muted-foreground">
                    <div>Supply: <span className="text-emerald-400 font-mono">${data.supply?.toFixed(2) || '0.00'}</span></div>
                    <div>Borrow: <span className="text-red-400 font-mono">${data.borrow?.toFixed(2) || '0.00'}</span></div>
                    <div>Net: <span className="text-foreground font-mono">${(data.value - (data.borrow || 0)).toFixed(2)}</span></div>
                    <div className="pt-1 border-t border-border mt-1">
                        Share: <span className="font-bold text-foreground">{data.percent?.toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
}

// --- Center Label for Pie ---
function CenterHealthLabel({ score }: { score: number }) {
    const color = score >= 7 ? '#34d399' : score >= 4 ? '#fbbf24' : '#f87171';
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-black tracking-tight" style={{ color }}>
                {score.toFixed(1)}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">
                Health Score
            </span>
        </div>
    );
}

export function Portfolio() {
    const { address } = useAccount();
    const [expandedProtocol, setExpandedProtocol] = useState<string | null>(null);

    // Smart Wallet
    const { data: walletAddressRaw } = useReadContract({
        address: OPBUTLER_FACTORY_ADDRESS as `0x${string}`,
        abi: OpButlerFactoryABI,
        functionName: 'getWallet',
        args: address ? [address] : undefined,
        query: { enabled: !!address }
    });
    const walletAddress = (walletAddressRaw && walletAddressRaw !== '0x0000000000000000000000000000000000000000')
        ? walletAddressRaw : undefined;

    // Portfolio Data
    const { totalSupplyUSD: venusSupply, totalBorrowUSD: venusBorrow, positions: venusPositions } = useVenusPortfolio();
    const { totalSupplyUSD: kinzaSupply, totalBorrowUSD: kinzaBorrow, positions: kinzaPositions } = useKinzaPortfolio();
    const { totalSupplyUSD: radiantSupply, totalBorrowUSD: radiantBorrow, positions: radiantPositions } = useRadiantPortfolio();

    // Health Data
    const healthData = useAggregatedHealth(walletAddress as `0x${string}` | undefined);
    const { venus: venusHealth, kinza: kinzaHealth, radiant: radiantHealth, overallScore } = healthData;

    // Aggregations
    const totalSupplied = venusSupply + kinzaSupply + radiantSupply;
    const totalDebt = venusBorrow + kinzaBorrow + radiantBorrow;
    const totalNetWorth = totalSupplied - totalDebt;

    // Allocation data with extra info for tooltip
    const allocationData = [
        { name: 'Venus', value: venusSupply, supply: venusSupply, borrow: venusBorrow, color: '#F0B90B', percent: 0 },
        { name: 'Kinza', value: kinzaSupply, supply: kinzaSupply, borrow: kinzaBorrow, color: '#3B82F6', percent: 0 },
        { name: 'Radiant', value: radiantSupply, supply: radiantSupply, borrow: radiantBorrow, color: '#A855F7', percent: 0 },
    ].filter(d => d.value > 0);

    // Calculate percentages
    const allocTotal = allocationData.reduce((s, d) => s + d.value, 0);
    allocationData.forEach(d => { d.percent = allocTotal > 0 ? (d.value / allocTotal) * 100 : 0; });

    const toggleExpand = (protocol: string) => {
        setExpandedProtocol(prev => prev === protocol ? null : protocol);
    };

    // Health status summary
    const getOverallStatus = () => {
        if (totalNetWorth < 0.01) return { text: 'Inactive', color: 'text-muted-foreground', icon: Activity };
        const activeProtocols = [venusHealth, kinzaHealth, radiantHealth].filter(h => h.hasPositions);
        const anyDanger = activeProtocols.some(h => h.status === 'danger');
        const anyWarning = activeProtocols.some(h => h.status === 'warning');
        if (anyDanger) return { text: 'At Risk', color: 'text-red-500 animate-pulse', icon: AlertTriangle };
        if (anyWarning) return { text: 'Caution', color: 'text-amber-400', icon: AlertTriangle };
        return { text: 'Healthy', color: 'text-emerald-400', icon: ShieldCheck };
    };
    const overallStatus = getOverallStatus();

    const { toast } = useToast();
    const { writeContractAsync } = useWriteContract();
    const [togglingAssets, setTogglingAssets] = useState<Record<string, boolean>>({});

    const handleCollateralToggle = async (vTokenAddress: string, symbol: string, currentStatus: boolean) => {
        if (!address) return;

        setTogglingAssets(prev => ({ ...prev, [vTokenAddress]: true }));
        try {
            if (currentStatus) {
                // Exit Market
                const hash = await writeContractAsync({
                    address: VENUS_COMPTROLLER as `0x${string}`,
                    abi: COMPTROLLER_ABI,
                    functionName: 'exitMarket',
                    args: [vTokenAddress as `0x${string}`],
                });
                toast({
                    title: "Transaction Sent",
                    description: `Disabling ${symbol} as collateral...`,
                });
            } else {
                // Enter Market
                const hash = await writeContractAsync({
                    address: VENUS_COMPTROLLER as `0x${string}`,
                    abi: COMPTROLLER_ABI,
                    functionName: 'enterMarkets',
                    args: [[vTokenAddress as `0x${string}`]],
                });
                toast({
                    title: "Transaction Sent",
                    description: `Enabling ${symbol} as collateral...`,
                });
            }
        } catch (error: any) {
            console.error("Collateral toggle error:", error);
            toast({
                title: "Error",
                description: error.shortMessage || "Failed to toggle collateral",
                variant: "destructive",
            });
        } finally {
            setTogglingAssets(prev => ({ ...prev, [vTokenAddress]: false }));
        }
    };

    const renderPositionsTable = (positions: any[], protocolId: string) => {
        if (!positions || positions.length === 0) {
            return <div className="p-4 text-center text-muted-foreground text-xs">No active positions found.</div>;
        }
        return (
            <div className="bg-muted/30 p-4 rounded-b-lg border-t border-border animate-in slide-in-from-top-2">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-muted-foreground uppercase tracking-wider text-[10px] text-left">
                            <th className="pb-2 pl-2">Asset</th>
                            <th className="pb-2 text-right">Supply APY</th>
                            <th className="pb-2 text-center">Supplied</th>
                            {protocolId === 'venus' && <th className="pb-2 text-center px-4">Collateral</th>}
                            <th className="pb-2 text-right">Borrow APY</th>
                            <th className="pb-2 text-right">Borrowed</th>
                            <th className="pb-2 text-right">Value (USD)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {positions.map((pos, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                                <td className="py-2 pl-2 font-bold flex items-center gap-2">
                                    <AssetIcon symbol={pos.symbol} size={20} />
                                    {pos.symbol}
                                </td>
                                <td className="py-2 text-right font-mono text-emerald-400">
                                    {pos.apy ? `+${pos.apy.toFixed(2)}%` : '-'}
                                </td>
                                <td className="py-2 text-center">
                                    <div className="text-emerald-500">{pos.supply > 0 ? pos.supply.toFixed(4) : '-'}</div>
                                    {pos.supplyUSD > 0 && <div className="text-[10px] text-muted-foreground">${pos.supplyUSD.toFixed(2)}</div>}
                                </td>
                                {protocolId === 'venus' && (
                                    <td className="py-2 text-center px-4">
                                        <div className="flex justify-center items-center">
                                            {togglingAssets[pos.vTokenAddress] ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                            ) : (
                                                <Switch
                                                    checked={pos.isCollateral}
                                                    onCheckedChange={() => handleCollateralToggle(pos.vTokenAddress, pos.symbol, pos.isCollateral)}
                                                    disabled={togglingAssets[pos.vTokenAddress]}
                                                />
                                            )}
                                        </div>
                                    </td>
                                )}
                                <td className="py-2 text-right font-mono text-red-400">
                                    {pos.borrowApy ? `-${pos.borrowApy.toFixed(2)}%` : '-'}
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

    const protocols = [
        { id: 'venus', name: 'Venus', img: '/venus.png', supply: venusSupply, borrow: venusBorrow, health: venusHealth, positions: venusPositions },
        { id: 'kinza', name: 'Kinza', img: '/kinza.png', supply: kinzaSupply, borrow: kinzaBorrow, health: kinzaHealth, positions: kinzaPositions },
        { id: 'radiant', name: 'Radiant', img: '/radiant.jpeg', supply: radiantSupply, borrow: radiantBorrow, health: radiantHealth, positions: radiantPositions },
    ];

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
                        <p className="text-xs text-muted-foreground mt-1">Total Equity</p>
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
                        <div className="text-3xl font-bold text-emerald-500">${totalSupplied.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Collateral & Liquidity</p>
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
                        <div className="text-3xl font-bold text-red-500">${totalDebt.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Global Borrowed Amount</p>
                    </CardContent>
                </Card>

                {/* Health Status */}
                <Card className="border-l-4 border-l-blue-500/80">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Health Status</CardTitle>
                        <div className="p-2 bg-blue-500/10 rounded-full">
                            <Heart className="w-4 h-4 text-blue-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-3xl font-bold ${overallStatus.color}`}>
                            {overallStatus.text}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Score: <span className={`font-bold ${overallScore >= 7 ? 'text-emerald-400' : overallScore >= 4 ? 'text-amber-400' : 'text-red-400'}`}>{overallScore.toFixed(1)}/10</span>
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Protocol Allocation Chart */}
                <Card className="col-span-1 border border-border bg-card">
                    <CardHeader>
                        <CardTitle>Protocol Allocation</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] relative">
                        {allocationData.length > 0 ? (
                            <>
                                <CenterHealthLabel score={overallScore} />
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={allocationData}
                                            innerRadius={70}
                                            outerRadius={95}
                                            paddingAngle={4}
                                            dataKey="value"
                                            cornerRadius={8}
                                            stroke="none"
                                        >
                                            {allocationData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            content={<CustomTooltip />}
                                            wrapperStyle={{ zIndex: 40 }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Legend */}
                                <div className="flex justify-center gap-4 -mt-2">
                                    {allocationData.map((entry, index) => (
                                        <div key={index} className="flex items-center gap-1.5 text-xs">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                            <span className="text-muted-foreground">{entry.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
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

                {/* Protocol Breakdown Table */}
                <Card className="col-span-2 border border-border bg-card">
                    <CardHeader>
                        <CardTitle>Protocol Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Desktop Table */}
                        <div className="rounded-md border border-border overflow-hidden hidden md:block">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground">
                                    <tr>
                                        <th className="p-4 font-medium">Protocol</th>
                                        <th className="p-4 font-medium text-right">Liquidity / Collateral</th>
                                        <th className="p-4 font-medium text-right">Debt</th>
                                        <th className="p-4 font-medium text-center">Health</th>
                                        <th className="p-4 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {protocols.map((proto) => (
                                        <React.Fragment key={proto.id}>
                                            <tr className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => toggleExpand(proto.id)}>
                                                <td className="p-4 font-bold flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full overflow-hidden bg-white">
                                                        <img src={proto.img} className="w-full h-full object-cover" alt={proto.name} />
                                                    </div>
                                                    {proto.name}
                                                    {expandedProtocol === proto.id ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                                                </td>
                                                <td className="p-4 text-right font-mono">${proto.supply.toFixed(2)}</td>
                                                <td className="p-4 text-right font-mono text-red-400">${proto.borrow.toFixed(2)}</td>
                                                <td className="p-4 text-center">
                                                    <HealthBadge health={proto.health} />
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button className="text-xs bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1 rounded-full transition-colors font-medium">
                                                        Manage
                                                    </button>
                                                </td>
                                            </tr>
                                            {expandedProtocol === proto.id && (
                                                <tr>
                                                    <td colSpan={5} className="p-0">
                                                        {renderPositionsTable(proto.positions, proto.id)}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-4">
                            {protocols.map((proto) => (
                                <div key={proto.id} className="rounded-xl border border-border bg-card overflow-hidden">
                                    <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(proto.id)}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-white/10">
                                                <img src={proto.img} className="w-full h-full object-cover" alt={proto.name} />
                                            </div>
                                            <div>
                                                <div className="font-bold flex items-center gap-2">
                                                    {proto.name}
                                                    <HealthBadge health={proto.health} />
                                                </div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                    <span>Sup: ${proto.supply.toFixed(2)}</span>
                                                    <span>•</span>
                                                    <span>Brw: ${proto.borrow.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {expandedProtocol === proto.id ? <ChevronUp size={20} className="text-muted-foreground" /> : <ChevronDown size={20} className="text-muted-foreground" />}
                                    </div>
                                    {expandedProtocol === proto.id && (
                                        <div className="border-t border-border">
                                            {renderPositionsTable(proto.positions, proto.id)}
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
