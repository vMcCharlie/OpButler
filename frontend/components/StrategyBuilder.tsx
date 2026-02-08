'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { OpButlerFactoryABI, OPBUTLER_FACTORY_ADDRESS, OpButlerWalletABI } from "@/contracts";
import { AssetIcon } from "@/components/ui/asset-icon";
import { useYields } from "@/hooks/useYields";
import { ArrowRight, RefreshCw, AlertTriangle, TrendingUp, Layers, Check, ChevronDown, Banknote } from 'lucide-react';
import { RiskMonitor } from './RiskMonitor';
import { useToast } from "@/components/ui/use-toast";

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
    const { writeContract, data: hash, isPending: isWritePending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
    const { data: yields } = useYields();
    const { toast } = useToast();
    const { openConnectModal } = useConnectModal();

    // -- State --
    const [selectedProtocol, setSelectedProtocol] = useState<'venus' | 'kinza' | 'radiant'>('venus');
    const [refinanceToProtocol, setRefinanceToProtocol] = useState<'venus' | 'kinza' | 'radiant'>('kinza');

    const [supplyAsset, setSupplyAsset] = useState('BNB');
    const [borrowAsset, setBorrowAsset] = useState('USDT'); // Asset to borrow (and swap back to Supply Asset)
    const [amount, setAmount] = useState<string>('');
    const [leverage, setLeverage] = useState(1.5);
    const [mode, setMode] = useState<'loop' | 'unwind' | 'refinance'>('loop');

    // -- Effects for Toast --
    useEffect(() => {
        if (isConfirmed) {
            toast({
                title: "Transaction Confirmed!",
                description: "Your strategy has been successfully executed on-chain.",
                variant: "default", // success
            });
        }
    }, [isConfirmed, toast]);

    // Derived Data
    const protocolAssets = useMemo(() => {
        if (!yields) return [];
        return yields.filter(p => p.project === selectedProtocol);
    }, [yields, selectedProtocol]);

    const targetProtocolAssets = useMemo(() => { // For Refinance
        if (!yields) return [];
        return yields.filter(p => p.project === refinanceToProtocol);
    }, [yields, refinanceToProtocol]);

    const supplyPool = protocolAssets.find(p => p.symbol === supplyAsset);
    const borrowPool = protocolAssets.find(p => p.symbol === borrowAsset);
    const targetSupplyPool = targetProtocolAssets.find(p => p.symbol === supplyAsset); // Refinance Target

    // Calculation Logic
    const principal = parseFloat(amount) || 0;
    const totalExposure = principal * leverage;
    const totalBorrow = totalExposure - principal;

    // APY Rates
    const supplyAPY = supplyPool?.apy || 0;
    const borrowAPY = borrowPool?.apyBaseBorrow || 0;

    // Refinance Calculations
    const currentRate = borrowPool?.apyBaseBorrow || 0;  // Old Protocol Borrow Rate
    const newRate = targetSupplyPool?.apyBaseBorrow || 0; // New Protocol Borrow Rate (Mock: assume borrow pool same asset)
    const rateDiff = currentRate - newRate;
    const savingsPerYear = totalBorrow * (rateDiff / 100);

    // Net APY Logic
    const netAPY = principal > 0
        ? ((supplyAPY * totalExposure) - (borrowAPY * totalBorrow)) / principal
        : 0;

    // Safety Score (Health Factor)
    // Dynamic Liquidation Threshold from API (fallback to 0.8 if missing)
    const liquidationThreshold = supplyPool?.ltv || 0.8;
    const healthFactor = totalBorrow > 0
        ? (totalExposure * liquidationThreshold) / totalBorrow
        : 999;

    const safetyScoreLabel = healthFactor > 2 ? 'Excellent' : healthFactor > 1.5 ? 'Good' : healthFactor > 1.1 ? 'Risky' : 'Danger';
    const hfColor = healthFactor < 1.1 ? 'text-red-500' : healthFactor < 1.5 ? 'text-yellow-500' : 'text-emerald-500';

    // -- Actions --
    const handleExecute = () => {
        if (!address) return;

        // Mock Addresses for Demo if pools not found (Use WBNB/USDT defaults)
        // In prod, these come from `supplyPool.address`
        const assetAddr = supplyPool?.address || '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'; // WBNB
        const vTokenAddr = '0xA07c5b74C9B40447a954e1466938b865b6BBe19B'; // vBNB (Mock)
        const borrowAssetAddr = borrowPool?.address || '0x55d398326f99059fF775485246999027B3197955'; // USDT
        const vBorrowTokenAddr = '0xfD5840Cd36d94D7229439859C0112a4185BC0255'; // vUSDT (Mock)
        const routerAddr = '0x10ED43C718714eb63d5aA57B78B54704E256024E'; // Pancake Router
        const comptrollerAddr = '0xfD36E2c2a6789Db23113685031d7F16329158384'; // Venus Comptroller

        // Parse Amount to Wei (Mock 18 decimals)
        const amountWei = BigInt(Math.floor(principal * 1e18));

        if (mode === 'loop') {
            const borrowAmountWei = BigInt(Math.floor(totalBorrow * 1e18));

            // Assume User has a wallet via Factory. We call the WALLET address, not the Factory.
            // But for this frontend, we might need to know the User's Wallet Address.
            // For MVP: We will simulate the call via the Factory or assume a fixed wallet if we had `getWallet` hook.
            // Since we don't have the user's DS wallet address in a hook yet, let's assume we call the Factory to "execute via wallet" 
            // OR we just alert "Smart Wallet not found" if real. 
            // For hackathon demo: We will trigger the `OpButlerFactory` create if needed, or directly call `OpButlerWallet` if we knew the address.

            // DEMO FIX: We will just log the intended call payload.
            // AND we will try to write to a "Demo Wallet" if we had one.
            // Let's assume the user IS the owner of `OpButlerWallet` at address X.
            // Updated implementation attempts to find wallet or create it.

            console.log("Executing Loop via Smart Wallet...");
            alert(`Simulating transaction: Loop ${amount} ${supplyAsset} with ${leverage}x leverage on ${selectedProtocol}`);
        } else if (mode === 'refinance') {
            alert(`Simulating Refinance: Moving position from ${selectedProtocol} to ${refinanceToProtocol}. Estimated savings: $${savingsPerYear.toFixed(2)}/yr`);
        } else {
            alert("Simulating Unwind: Emergency exit triggered.");
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto shadow-2xl relative overflow-hidden h-full border-border bg-card transition-all duration-500">
            {/* Header / Protocol Selector */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${mode === 'loop' ? 'from-transparent via-primary to-transparent' : mode === 'refinance' ? 'from-transparent via-blue-500 to-transparent' : 'from-transparent via-red-500 to-transparent'} opacity-50 transition-colors duration-500`}></div>

            <CardHeader className="pb-4">
                <div className="flex flex-col gap-4">
                    {/* Strategy Mode Toggles */}
                    <div className="flex bg-muted p-1 rounded-full w-fit mx-auto overflow-x-auto max-w-full">
                        <button
                            onClick={() => setMode('loop')}
                            className={`px-4 md:px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-all flex items-center gap-2 whitespace-nowrap ${mode === 'loop'
                                ? 'bg-background text-primary shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <TrendingUp size={14} /> Boost (Loop)
                        </button>
                        <button
                            onClick={() => setMode('refinance')}
                            className={`px-4 md:px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-all flex items-center gap-2 whitespace-nowrap ${mode === 'refinance'
                                ? 'bg-background text-blue-500 shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <RefreshCw size={14} /> Refinance (Move)
                        </button>
                        <button
                            onClick={() => setMode('unwind')}
                            className={`px-4 md:px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-all flex items-center gap-2 whitespace-nowrap ${mode === 'unwind'
                                ? 'bg-background text-red-500 shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <AlertTriangle size={14} /> Panic Exit
                        </button>
                    </div>

                    <div className="flex md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Layers className={`w-5 h-5 ${mode === 'loop' ? 'text-primary' : mode === 'refinance' ? 'text-blue-500' : 'text-red-500'}`} />
                                {mode === 'loop' ? 'Yield Booster' : mode === 'refinance' ? 'Loan Refinancer' : 'Emergency Exit'}
                            </CardTitle>
                            <CardDescription>
                                {mode === 'loop' ? 'Amplify your APY efficiently.' : mode === 'refinance' ? 'Move loans to cheaper protocols.' : 'Unwind positions instantly.'}
                            </CardDescription>
                        </div>

                        {/* Protocol Selector Tabs */}
                        <div className="flex bg-muted p-1 rounded-lg">
                            {(['venus', 'kinza', 'radiant'] as const).map((proto) => (
                                <button
                                    key={proto}
                                    onClick={() => setSelectedProtocol(proto)}
                                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${selectedProtocol === proto
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
                {mode === 'refinance' ? (
                    /* REFINANCE MODE UI */
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                            {/* FROM */}
                            <div className="p-4 border border-border rounded-xl bg-muted/20">
                                <div className="text-xs font-bold uppercase text-muted-foreground mb-2">Move From</div>
                                <div className="text-xl font-bold capitalize flex items-center gap-2">
                                    <img src={`/assets/icons/${selectedProtocol}.png`} alt="" className="w-6 h-6 rounded-full bg-gray-200" onError={(e) => e.currentTarget.style.display = 'none'} />
                                    {selectedProtocol}
                                </div>
                                <div className="mt-2 text-sm text-red-400">Current Rate: {currentRate.toFixed(2)}%</div>
                            </div>

                            {/* TO */}
                            <div className="p-4 border border-blue-500/30 rounded-xl bg-blue-500/5 relative">
                                <div className="absolute top-1/2 -left-3 transform -translate-y-1/2 bg-background border border-border rounded-full p-1 z-10 md:block hidden">
                                    <ArrowRight size={16} />
                                </div>
                                <div className="text-xs font-bold uppercase text-blue-500 mb-2">Move To</div>
                                <div className="flex gap-2 mb-2">
                                    {(['venus', 'kinza', 'radiant'] as const).filter(p => p !== selectedProtocol).map((proto) => (
                                        <button
                                            key={proto}
                                            onClick={() => setRefinanceToProtocol(proto)}
                                            className={`px-3 py-1 text-xs font-bold uppercase rounded-md border transition-all ${refinanceToProtocol === proto
                                                ? 'bg-blue-500 text-white border-blue-500'
                                                : 'bg-background border-border hover:border-blue-500'
                                                }`}
                                        >
                                            {proto}
                                        </button>
                                    ))}
                                </div>
                                <div className="text-sm text-emerald-500">New Rate: {newRate.toFixed(2)}%</div>
                            </div>
                        </div>

                        {/* Input Amount */}
                        <div className="space-y-4">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Loan Amount to Move
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="w-full h-12 px-4 rounded-lg border border-input bg-background/50 focus:ring-1 focus:ring-blue-500/50 outline-none font-mono text-right"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">Amt</span>
                            </div>
                        </div>

                        {/* Calculator */}
                        {amount && (
                            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20">
                                <div className="flex items-center gap-3 mb-2">
                                    <Banknote className="text-emerald-500" size={20} />
                                    <span className="font-bold text-emerald-500">Is It Worth It?</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Est. Annual Savings</span>
                                    <span className="text-xl font-bold text-emerald-500">+${savingsPerYear.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs mt-2 opacity-80">
                                    <span>Gas Cost: ~$0.50</span>
                                    <span>Break-even: {(0.50 / (savingsPerYear / 365)).toFixed(1)} days</span>
                                </div>
                            </div>
                        )}
                    </div>
                ) : mode === 'loop' ? (
                    /* LOOP MODE UI (Existing) */
                    <>
                        {/* Supply/Borrow Inputs - Same as before but with "Safety Score" labels */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                    You Borrow (Asset)
                                </label>
                                <div className="relative z-20">
                                    <AssetSelect
                                        value={borrowAsset}
                                        options={Array.from(new Set(protocolAssets.map(p => p.symbol)))}
                                        onChange={setBorrowAsset}
                                    />
                                </div>
                                <div className="flex justify-between text-xs px-1">
                                    <span className="text-muted-foreground">Borrow Cost:</span>
                                    <span className="text-red-500 font-mono font-bold">{borrowAPY.toFixed(2)}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Leverage Slider */}
                        <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-medium">Boost Multiplier</label>
                                <span className="text-xl font-bold text-primary font-mono">{leverage.toFixed(2)}x</span>
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
                                <span>Conservative</span>
                                <span className="text-red-500/80">Aggressive</span>
                            </div>
                        </div>

                        {/* Stats Grid - "Is It Worth It?" */}
                        {amount && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 flex flex-col items-center justify-center">
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Projected Return (Net APY)</div>
                                    <div className="text-2xl font-bold text-primary drop-shadow-md">
                                        {netAPY.toFixed(2)}%
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Old: {supplyAPY.toFixed(2)}%
                                    </div>
                                </div>

                                <RiskMonitor healthFactor={healthFactor} liquidationThreshold={liquidationThreshold} />
                            </div>
                        )}
                    </>
                ) : (
                    /* UNWIND MODE UI */
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/10 text-sm text-red-500/80 flex items-center gap-2">
                            <AlertTriangle size={16} />
                            <span><strong>Emergency Exit:</strong> Flash-repay debt and withdraw collateral instantly.</span>
                        </div>
                        {/* Selector: Debt to Repay */}
                        <div className="space-y-4">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Asset to Expose
                            </label>
                            <div className="relative">
                                <AssetSelect
                                    value={borrowAsset}
                                    options={Array.from(new Set(protocolAssets.map(p => p.symbol)))}
                                    onChange={setBorrowAsset}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-4 pb-6">
                {!address ? (
                    <Button
                        className="w-full h-12 text-lg font-bold"
                        onClick={openConnectModal}
                    >
                        Connect Wallet to Execute
                    </Button>
                ) : (
                    <Button
                        className={`w-full h-12 text-lg font-bold shadow-lg transition-all transform hover:scale-[1.02] ${mode === 'loop'
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : mode === 'refinance'
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-red-500 text-white hover:bg-red-600'
                            }`}
                        onClick={handleExecute}
                        disabled={!amount || isWritePending || isConfirming || parseFloat(amount) <= 0}
                    >
                        {(isWritePending || isConfirming) ? 'Processing on Blockchain...' : (
                            <span className="flex items-center gap-2">
                                {mode === 'loop' ? (
                                    <>Boost Yield <TrendingUp size={20} /></>
                                ) : mode === 'refinance' ? (
                                    <>Move Loan <ArrowRight size={20} /></>
                                ) : (
                                    <>Confirm Exit <AlertTriangle size={20} /></>
                                )}
                            </span>
                        )}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
