'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { OpButlerFactoryABI, OPBUTLER_FACTORY_ADDRESS } from "@/contracts";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export function StrategyBuilder() {
    const { address } = useAccount();
    const { writeContract, isPending } = useWriteContract();

    const [asset, setAsset] = useState('USDT');
    const [amount, setAmount] = useState('');
    const [leverage, setLeverage] = useState(1.5);

    // Checking if User has a Smart Wallet
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

    // Simulation Logic
    const supplyAPY = 6.5;
    const borrowAPY = 4.2;
    const netAPY = (supplyAPY * leverage) - (borrowAPY * (leverage - 1));
    const hfValue = leverage === 1 ? 10 : (leverage / (leverage - 1));
    const healthFactor = hfValue > 10 ? '∞' : hfValue.toFixed(2);

    const gaugeData = [
        { name: 'Health', value: Math.min(hfValue, 3) },
        { name: 'Risk', value: 3 - Math.min(hfValue, 3) }
    ];
    const hfColor = hfValue < 1.1 ? '#ef4444' : hfValue < 1.5 ? '#eab308' : '#22c55e';

    const handleCreateWallet = () => {
        writeContract({
            address: OPBUTLER_FACTORY_ADDRESS as `0x${string}`,
            abi: OpButlerFactoryABI,
            functionName: 'createWallet',
            args: [address],
        });
    };

    const handleExecute = () => {
        // Logic for executing loop via Smart Wallet
        console.log(`Executing Loop: ${amount} ${asset} at ${leverage}x`);
        // 1. Approve Token -> Smart Wallet
        // 2. Call Smart Wallet -> executeStrategy(asset, amount, leverage)
        // * Fee is taken inside executeStrategy
    };

    return (
        <Card className="w-full max-w-lg mx-auto shadow-2xl relative overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>

            <CardHeader>
                <CardTitle className="text-xl">Strategy Builder</CardTitle>
                <CardDescription>Configure your loop parameters.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {!walletAddress ? (
                    <div className="text-center py-12 space-y-4">
                        <div className="text-primary text-4xl mb-4">🔐</div>
                        <h3 className="text-lg font-bold text-foreground">Initialize Smart Engine</h3>
                        <p className="text-sm text-muted-foreground px-4">
                            To execute advanced strategies, you need a Smart Strategy Account. It's secure, non-custodial, and enables one-click looping.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Asset Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Asset</label>
                            <select
                                className="w-full p-3 rounded-lg border border-input bg-background/50 text-foreground focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                                value={asset}
                                onChange={(e) => setAsset(e.target.value)}
                            >
                                <option value="USDT">USDT (Tether)</option>
                                <option value="BNB">BNB</option>
                                <option value="ETH">ETH</option>
                            </select>
                        </div>

                        {/* Amount Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="w-full p-3 rounded-lg border border-input bg-background/50 text-foreground focus:ring-1 focus:ring-primary/50 outline-none transition-all font-mono"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                                <span className="absolute right-4 top-3 text-xs text-muted-foreground font-bold">{asset}</span>
                            </div>
                        </div>

                        {/* Leverage Slider */}
                        <div className="space-y-4 pt-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Leverage</label>
                                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-sm border border-primary/20">{leverage}x</span>
                            </div>
                            <input
                                type="range"
                                min="1.0"
                                max="3.0"
                                step="0.1"
                                className="w-full accent-primary h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
                                value={leverage}
                                onChange={(e) => setLeverage(parseFloat(e.target.value))}
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest">
                                <span>Safe</span>
                                <span>Degenerate</span>
                            </div>
                        </div>

                        {/* Gauge & Stats */}
                        <div className="grid grid-cols-2 gap-4 mt-6">
                            {/* Net APY Box */}
                            <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/5 to-transparent border border-green-500/10 text-center flex flex-col justify-center items-center dark:from-green-500/5 dark:to-transparent bg-green-500/5">
                                <div className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">Net Flow</div>
                                <div className="text-2xl font-bold text-foreground drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]">
                                    {netAPY.toFixed(2)}%
                                </div>
                                <div className="text-[10px] text-green-400/60 mt-1">APY</div>
                            </div>

                            {/* Health Factor Gauge */}
                            <div className="relative h-24 flex items-center justify-center bg-muted/20 rounded-xl border border-border">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={gaugeData}
                                            cx="50%"
                                            cy="80%"
                                            startAngle={180}
                                            endAngle={0}
                                            innerRadius={30}
                                            outerRadius={40}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            <Cell key="health" fill={hfColor} />
                                            <Cell key="risk" fill="hsl(var(--muted))" />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute top-[55%] text-center">
                                    <div className="text-lg font-bold text-foreground" style={{ color: hfColor }}>{healthFactor}</div>
                                    <div className="text-[8px] text-muted-foreground uppercase">Health</div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>

            <CardFooter className="pt-2">
                {!walletAddress ? (
                    <Button
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-bold text-lg h-12 shadow-[0_0_20px_rgba(240,185,11,0.4)]"
                        onClick={handleCreateWallet}
                        disabled={isPending}
                    >
                        {isPending ? 'Creating...' : 'Create Smart Account'}
                    </Button>
                ) : (
                    <Button
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-bold text-lg h-12 shadow-[0_0_20px_rgba(240,185,11,0.4)]"
                        onClick={handleExecute}
                        disabled={!amount || isPending}
                    >
                        {isPending ? 'Executing...' : 'Execute Loop'}
                    </Button>
                )}
            </CardFooter>

            {/* Footer Fee Notice */}
            {walletAddress && (
                <div className="text-center pb-4 text-[10px] text-muted-foreground">
                    Protocol Fee: 0.1% of volume (deducted upon execution)
                </div>
            )}
        </Card>
    );
}
