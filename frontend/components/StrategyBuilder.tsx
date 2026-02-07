'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAccount, useWriteContract } from 'wagmi';
import { OpButlerFactoryABI, OPBUTLER_FACTORY_ADDRESS } from "@/contracts";
import { AssetIcon } from "@/components/ui/asset-icon";
import { useYields } from "@/hooks/useYields";
import { ArrowRight, RefreshCw, AlertTriangle, TrendingUp, Layers, Check, ChevronDown } from 'lucide-react';

// Custom Dropdown Component for Theme Consistency
function AssetSelect({ value, options, onChange }: { value: string, options: string[], onChange: (val: string) => void }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="w-full h-12 pl-3 pr-3 rounded-lg border border-input bg-card flex items-center justify-between hover:bg-accent hover:text-accent-foreground transition-colors"
            >
                <div className="flex items-center gap-2">
                    <AssetIcon symbol={value} size={24} />
                    <span className="font-bold">{value}</span>
                </div>
                <ChevronDown size={16} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}></div>
                    <div className="absolute top-full left-0 w-full mt-1 bg-popover border border-border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                        {options.map((opt) => (
                            <div
                                key={opt}
                                className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors ${value === opt ? 'bg-accent/50' : ''}`}
                                onClick={() => { onChange(opt); setOpen(false); }}
                            >
                                <AssetIcon symbol={opt} size={20} />
                                <span className={`flex-1 ${value === opt ? 'font-bold' : ''}`}>{opt}</span>
                                {value === opt && <Check size={14} className="text-primary" />}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export function StrategyBuilder() {
    const { address } = useAccount();
    const { writeContract, isPending } = useWriteContract();
    const { data: yields } = useYields();

    // -- State --
    const [selectedProtocol, setSelectedProtocol] = useState<'venus' | 'kinza' | 'radiant'>('venus');
    const [supplyAsset, setSupplyAsset] = useState('BNB');
    const [borrowAsset, setBorrowAsset] = useState('USDT'); // Asset to borrow (and swap back to Supply Asset)
    const [amount, setAmount] = useState<string>('');
    const [leverage, setLeverage] = useState(1.5);
    const [mode, setMode] = useState<'loop' | 'unwind'>('loop');

    // Unwind Constants (Mock)
    const repayAmount = parseFloat(amount) || 0;
    const netReturn = repayAmount * 0.5; // Mock: assume 50% equity
    const collateralRelease = repayAmount * 1.5; // Mock: collateral is 1.5x debt

    // -- Derived Data --
    // 1. Get available assets for this protocol
    const protocolAssets = useMemo(() => {
        if (!yields) return [];
        return yields.filter(p => p.project === selectedProtocol);
    }, [yields, selectedProtocol]);

    // 2. Identify the specific API data for selected tokens
    const supplyPool = protocolAssets.find(p => p.symbol === supplyAsset);
    const borrowPool = protocolAssets.find(p => p.symbol === borrowAsset);

    // 3. Calculation Logic
    const principal = parseFloat(amount) || 0;
    const totalExposure = principal * leverage; // Total Supply after loop
    const totalBorrow = totalExposure - principal; // Total Debt

    // APY Rates (Fallback to 0 if not found)
    const supplyAPY = supplyPool?.apy || 0;
    const borrowAPY = borrowPool?.apyBaseBorrow || 0;

    // Net APY Calculation:
    // (Supply APY * Total Supply) - (Borrow APY * Total Borrow) / Principal
    const netAPY = principal > 0
        ? ((supplyAPY * totalExposure) - (borrowAPY * totalBorrow)) / principal
        : 0;

    // Health Factor (Mock Calculation for Demo)
    // HF = (Collateral * LiquidationThreshold) / Debt
    // Assuming LiquidationThreshold ~ 0.8 for most assets
    const liquidationThreshold = 0.8;
    const healthFactor = totalBorrow > 0
        ? (totalExposure * liquidationThreshold) / totalBorrow
        : 999;

    const hfColor = healthFactor < 1.1 ? 'text-red-500' : healthFactor < 1.5 ? 'text-yellow-500' : 'text-emerald-500';

    // -- Actions --
    const handleCreateWallet = () => {
        writeContract({
            address: OPBUTLER_FACTORY_ADDRESS as `0x${string}`,
            abi: OpButlerFactoryABI,
            functionName: 'createWallet',
            args: [address],
        });
    };

    const handleExecute = () => {
        if (mode === 'loop') {
            console.log(`Executing Loop: Supply ${amount} ${supplyAsset}, Borrow ${borrowAsset}`);
        } else {
            console.log(`Executing Unwind: Repay ${amount} ${borrowAsset}, Unlock ${collateralRelease} ${supplyAsset}`);
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto shadow-2xl relative overflow-hidden h-full border-border bg-card transition-all duration-500">
            {/* Header / Protocol Selector */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${mode === 'loop' ? 'from-transparent via-primary to-transparent' : 'from-transparent via-red-500 to-transparent'} opacity-50 transition-colors duration-500`}></div>

            <CardHeader className="pb-4">
                <div className="flex flex-col gap-4">
                    {/* Strategy Mode Toggles */}
                    <div className="flex bg-muted p-1 rounded-full w-fit mx-auto">
                        <button
                            onClick={() => setMode('loop')}
                            className={`px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-all flex items-center gap-2 ${mode === 'loop'
                                ? 'bg-background text-primary shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <TrendingUp size={14} /> Loop (Long)
                        </button>
                        <button
                            onClick={() => setMode('unwind')}
                            className={`px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-all flex items-center gap-2 ${mode === 'unwind'
                                ? 'bg-background text-red-500 shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <RefreshCw size={14} className="rotate-180" /> Unwind (Exit)
                        </button>
                    </div>

                    <div className="flex md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Layers className={`w-5 h-5 ${mode === 'loop' ? 'text-primary' : 'text-red-500'}`} />
                                {mode === 'loop' ? 'Strategy Builder' : 'The Unwinder'}
                            </CardTitle>
                            <CardDescription>
                                {mode === 'loop' ? 'Simulate and execute recursive yield loops.' : 'Panic exit? Unwind positions instantly.'}
                            </CardDescription>
                        </div>

                        {/* Protocol Selector Tabs */}
                        <div className="flex bg-muted p-1 rounded-lg">
                            {(['venus', 'kinza', 'radiant'] as const).map((proto) => (
                                <button
                                    key={proto}
                                    onClick={() => setSelectedProtocol(proto)}
                                    className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${selectedProtocol === proto
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {proto}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-8">
                {mode === 'loop' ? (
                    /* LOOP MODE UI (Existing) */
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* ... (Existing Supply/Borrow Inputs) ... */}
                            {/* Left: Supply Config */}
                            {/* Left: Supply Config */}
                            <div className="space-y-4">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    You Supply (Collateral)
                                </label>

                                <div className="flex gap-2">
                                    <div className="relative w-1/3 min-w-[140px] z-20">
                                        <AssetSelect
                                            value={supplyAsset}
                                            options={Array.from(new Set(protocolAssets.map(p => p.symbol)))}
                                            onChange={setSupplyAsset}
                                        />
                                    </div>

                                    <div className="relative flex-1 z-10">
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            className="w-full h-12 px-4 rounded-lg border border-input bg-background/50 focus:ring-1 focus:ring-primary/50 outline-none font-mono text-right"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">Amt</span>
                                    </div>
                                </div>

                                <div className="flex justify-between text-xs px-1">
                                    <span className="text-muted-foreground">Supply APY:</span>
                                    <span className="text-emerald-500 font-mono font-bold">{supplyAPY.toFixed(2)}%</span>
                                </div>
                            </div>

                            {/* Right: Borrow Config */}
                            <div className="space-y-4">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    You Borrow (Loop Asset)
                                </label>

                                <div className="relative z-20">
                                    <AssetSelect
                                        value={borrowAsset}
                                        options={Array.from(new Set(protocolAssets.map(p => p.symbol)))}
                                        onChange={setBorrowAsset}
                                    />
                                </div>

                                <div className="flex justify-between text-xs px-1">
                                    <span className="text-muted-foreground">Borrow APY:</span>
                                    <span className="text-red-500 font-mono font-bold">{borrowAPY.toFixed(2)}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Leverage Slider (Existing) */}
                        <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-medium">Leverage Multiplier</label>
                                <span className="text-xl font-bold text-primary font-mono">{leverage.toFixed(2)}x</span>
                            </div>

                            <div className="flex justify-between text-[10px] text-muted-foreground mb-2">
                                <span>Max LTV: <strong className="text-foreground">{(supplyPool?.ltv ? supplyPool.ltv * 100 : 0).toFixed(0)}%</strong></span>
                                <span>Max Leverage: <strong className="text-foreground">{(1 / (1 - (supplyPool?.ltv || 0.6))).toFixed(2)}x</strong></span>
                            </div>

                            <input
                                type="range"
                                min="1.0"
                                max={(1 / (1 - (supplyPool?.ltv || 0.6))).toFixed(2)}
                                step="0.05"
                                className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                                value={leverage}
                                onChange={(e) => setLeverage(Math.min(parseFloat(e.target.value), 1 / (1 - (supplyPool?.ltv || 0.6))))}
                            />

                            <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                <span>Safe (1x)</span>
                                <span className="text-red-500/80">Liquidation Risk</span>
                            </div>
                        </div>

                        {/* Simulation ... */}
                        {amount && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* ... existing Visualization ... */}
                                <div className="relative p-6 rounded-xl border border-dashed border-border bg-background/50">
                                    <div className="absolute -top-3 left-4 px-2 bg-card text-xs font-bold text-muted-foreground">
                                        Loop Visualization
                                    </div>

                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-500">
                                                <TrendingUp size={16} />
                                            </div>
                                            <span className="font-mono text-emerald-500 font-bold">
                                                +{(totalExposure - principal).toFixed(2)} {supplyAsset}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">Extra Exposure</span>
                                        </div>

                                        <div className="flex-1 px-4 flex flex-col items-center">
                                            <div className="w-full h-px bg-border relative">
                                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-primary/50 to-emerald-500/0 animate-pulse"></div>
                                            </div>
                                            <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                                                <RefreshCw size={10} className="animate-spin-slow" />
                                                Auto-Compounding
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center gap-2">
                                            <div className="p-2 rounded-full bg-red-500/10 text-red-500">
                                                <AlertTriangle size={16} />
                                            </div>
                                            <span className="font-mono text-red-500 font-bold">
                                                -{(totalBorrow).toFixed(2)} {borrowAsset}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">Total Debt</span>
                                        </div>
                                    </div>

                                    {/* Swap Warning if Assets Differ */}
                                    {supplyAsset !== borrowAsset && (
                                        <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-3 text-xs text-blue-400">
                                            <RefreshCw size={14} />
                                            <div>
                                                <strong>Auto-Swap Active:</strong> We borrow {borrowAsset}, swap it to {supplyAsset} instantly, and re-supply.
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 flex flex-col items-center justify-center">
                                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Projected Net APY</div>
                                        <div className="text-3xl font-bold text-primary drop-shadow-md">
                                            {netAPY.toFixed(2)}%
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            vs {supplyAPY.toFixed(2)}% (Base)
                                        </div>
                                    </div>

                                    <div className={`p-4 rounded-xl border flex flex-col items-center justify-center ${healthFactor < 1.1 ? 'bg-red-500/10 border-red-500/20' : 'bg-muted/30 border-border'
                                        }`}>
                                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Health Factor</div>
                                        <div className={`text-3xl font-bold ${hfColor}`}>
                                            {healthFactor === 999 ? '∞' : healthFactor.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Liq. Threshold: {liquidationThreshold}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* UNWIND MODE UI */
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/10 text-sm text-red-500/80 flex items-center gap-2">
                            <AlertTriangle size={16} />
                            <span><strong>Panic Mode:</strong> This will flash-repay your debt and return remaining collateral to your wallet.</span>
                        </div>

                        {/* Selector: Debt to Repay */}
                        <div className="space-y-4">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                Asset to Repay (Debt)
                            </label>

                            <div className="flex gap-2">
                                <div className="relative w-1/3 min-w-[140px] z-20">
                                    <AssetSelect
                                        value={borrowAsset}
                                        options={Array.from(new Set(protocolAssets.map(p => p.symbol)))}
                                        onChange={setBorrowAsset}
                                    />
                                </div>

                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        className="w-full h-12 px-4 rounded-lg border border-input bg-background/50 focus:ring-1 focus:ring-red-500/50 outline-none font-mono text-right"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">Debts</span>
                                </div>
                            </div>
                            <div className="text-right text-[10px] text-muted-foreground cursor-pointer hover:text-primary">
                                Max Debt: 0.00 (Connect Wallet)
                            </div>
                        </div>

                        {/* Result Visualization */}
                        {amount && (
                            <div className="p-6 rounded-xl border border-dashed border-red-500/20 bg-background/50 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Total Repayment Used</span>
                                    <span className="font-mono font-bold text-red-500">-{repayAmount.toFixed(2)} {borrowAsset}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-border pt-4">
                                    <span className="text-sm text-muted-foreground">Available to Withdraw</span>
                                    {/* Mock Logic: Collateral (1.5x debt) - Debt */}
                                    <span className="font-mono font-bold text-emerald-500">~{netReturn.toFixed(2)} {borrowAsset}</span>
                                </div>
                                <div className="text-[10px] text-center text-muted-foreground">
                                    (After Flash Loan Fee & Swap Slippage)
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-4 pb-6">
                {!address ? (
                    <Button
                        className="w-full h-12 text-lg font-bold"
                        onClick={() => alert("Please connect your wallet first!")}
                    >
                        Connect Wallet to Execute
                    </Button>
                ) : (
                    <Button
                        className={`w-full h-12 text-lg font-bold shadow-[0_0_20px_rgba(0,0,0,0.2)] transition-all transform hover:scale-[1.02] ${mode === 'loop'
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(206,255,0,0.2)]'
                            : 'bg-red-500 text-white hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                            }`}
                        onClick={handleExecute}
                        disabled={!amount || isPending || parseFloat(amount) <= 0}
                    >
                        {isPending ? 'Processing...' : (
                            <span className="flex items-center gap-2">
                                {mode === 'loop' ? (
                                    <>Execute Strategy <ArrowRight size={20} /></>
                                ) : (
                                    <>Confirm Unwind <AlertTriangle size={20} /></>
                                )}
                            </span>
                        )}
                    </Button>
                )}

                {amount && (
                    <div className="absolute bottom-2 left-0 w-full text-center">
                        <span className="text-[10px] text-muted-foreground/60">
                            Protocol Fee: 0.05% • Est. Gas: ~$0.45
                        </span>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
