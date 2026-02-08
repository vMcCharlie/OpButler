'use client';

import { useState, useMemo } from 'react';
import { AssetIcon } from "@/components/ui/asset-icon";
import { Button } from "@/components/ui/button";
import { ArrowRight, Info, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { simulateLoop } from '@/lib/simulation';


// --- DATA DEFINITIONS ---

type Protocol = 'Venus' | 'Kinza' | 'Radiant';

interface Asset {
    symbol: string;
    name: string;
    protocol: Protocol;
    apy: number; // Supply APY or Borrow APY
    isStable: boolean;
    maxLTV: number; // For collateral
    price: number; // Mock price
}

const COLLATERAL_OPTIONS: Asset[] = [
    { symbol: 'USDT', name: 'Tether', protocol: 'Venus', apy: 8.5, isStable: true, maxLTV: 0.80, price: 1.0 },
    { symbol: 'USDC', name: 'USDC', protocol: 'Venus', apy: 6.2, isStable: true, maxLTV: 0.82, price: 1.0 },
    { symbol: 'BNB', name: 'BNB', protocol: 'Venus', apy: 0.5, isStable: false, maxLTV: 0.75, price: 320.0 },
    { symbol: 'BTCB', name: 'Bitcoin BEP2', protocol: 'Venus', apy: 0.1, isStable: false, maxLTV: 0.70, price: 42000.0 },
    { symbol: 'ETH', name: 'Ethereum', protocol: 'Venus', apy: 0.2, isStable: false, maxLTV: 0.75, price: 2300.0 },

    { symbol: 'USDT', name: 'Tether', protocol: 'Kinza', apy: 12.1, isStable: true, maxLTV: 0.78, price: 1.0 },
    { symbol: 'BTCB', name: 'Bitcoin', protocol: 'Kinza', apy: 0.05, isStable: false, maxLTV: 0.72, price: 42000.0 },

    { symbol: 'USDT', name: 'Tether', protocol: 'Radiant', apy: 9.8, isStable: true, maxLTV: 0.80, price: 1.0 },
    { symbol: 'ETH', name: 'Ethereum', protocol: 'Radiant', apy: 1.2, isStable: false, maxLTV: 0.75, price: 2300.0 },
];

const DEBT_OPTIONS: Asset[] = [
    { symbol: 'USDT', name: 'Tether', protocol: 'Venus', apy: -10.2, isStable: true, maxLTV: 0, price: 1.0 },
    { symbol: 'USDC', name: 'USDC', protocol: 'Venus', apy: -8.5, isStable: true, maxLTV: 0, price: 1.0 },
    { symbol: 'BNB', name: 'BNB', protocol: 'Venus', apy: -2.1, isStable: false, maxLTV: 0, price: 320.0 },

    { symbol: 'USDT', name: 'Tether', protocol: 'Kinza', apy: -14.5, isStable: true, maxLTV: 0, price: 1.0 },
    { symbol: 'BNB', name: 'BNB', protocol: 'Kinza', apy: -3.5, isStable: false, maxLTV: 0, price: 320.0 },

    { symbol: 'USDT', name: 'Tether', protocol: 'Radiant', apy: -11.0, isStable: true, maxLTV: 0, price: 1.0 },
];

export function LoopSelector() {
    const [activeProtocol, setActiveProtocol] = useState<Protocol>('Venus');
    const [selectedCollateral, setSelectedCollateral] = useState<Asset>(COLLATERAL_OPTIONS.filter(c => c.protocol === 'Venus')[0]);
    const [selectedDebt, setSelectedDebt] = useState<Asset>(DEBT_OPTIONS.filter(d => d.protocol === 'Venus')[0]);
    const [leverage, setLeverage] = useState([1.5]); // 1x to 5x

    // Filter Assets based on Protocol
    const protocolCollaterals = useMemo(() => {
        return COLLATERAL_OPTIONS.filter(c => c.protocol === activeProtocol);
    }, [activeProtocol]);

    const protocolDebts = useMemo(() => {
        return DEBT_OPTIONS.filter(d => d.protocol === activeProtocol);
    }, [activeProtocol]);

    // Loop Net APY Calculation
    const { netApy, healthFactor, liquidationPrice } = useMemo(() => {
        // Use simulateLoop for centralized logic
        // Assuming 1 unit of collateral for calculation
        // Adjust typing if needed
        const result = simulateLoop(1, leverage[0], selectedCollateral as any, selectedDebt as any);
        return result;
    }, [selectedCollateral, selectedDebt, leverage]);

    const isRisky = parseFloat(healthFactor) < 1.1;

    // Handle Protocol Switch
    const handleProtocolChange = (protocol: Protocol) => {
        setActiveProtocol(protocol);
        // Reset selections to first available asset in new protocol
        const firstCol = COLLATERAL_OPTIONS.find(c => c.protocol === protocol) || COLLATERAL_OPTIONS[0];
        const firstDebt = DEBT_OPTIONS.find(d => d.protocol === protocol) || DEBT_OPTIONS[0];
        setSelectedCollateral(firstCol);
        setSelectedDebt(firstDebt);
    };

    // Handle Collateral Change
    const handleCollateralChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const symbol = e.target.value;
        const newCol = protocolCollaterals.find(c => c.symbol === symbol) || protocolCollaterals[0];
        setSelectedCollateral(newCol);

        // Reset debt if needed (though now constrained by protocol, double check symbol logic)
        // Actually, debt list is already filtered by protocol, so picking generic default is safer or keep if exists
        const currentDebtExists = protocolDebts.find(d => d.symbol === selectedDebt.symbol);
        if (!currentDebtExists) {
            setSelectedDebt(protocolDebts[0]);
        }
    };

    return (
        <Card className="w-full max-w-4xl mx-auto bg-[#121216] border border-white/10 shadow-2xl overflow-hidden">
            {/* Header Tabs */}
            <div className="flex border-b border-white/5 bg-black/20">
                <button className="flex-1 py-4 text-center font-bold text-[#CEFF00] border-b-2 border-[#CEFF00] bg-[#CEFF00]/5 uppercase tracking-wide text-sm">
                    <span className="mr-2">⚡</span> Yield Booster (Loop)
                </button>
                <button className="flex-1 py-4 text-center font-bold text-muted-foreground hover:text-white transition-colors uppercase tracking-wide text-sm">
                    <span className="mr-2">🔄</span> Refinance (Move)
                </button>
                <button className="flex-1 py-4 text-center font-bold text-muted-foreground hover:text-red-400 transition-colors uppercase tracking-wide text-sm">
                    <span className="mr-2">⚠️</span> Panic Exit
                </button>
            </div>

            <div className="p-8 space-y-8">
                {/* Description & Protocol Selector */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-2">Yield Booster</h3>
                        <p className="text-muted-foreground">Amplify your APY efficiently.</p>
                    </div>
                    {/* Protocol Selector Pills */}
                    <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                        {(['Venus', 'Kinza', 'Radiant'] as Protocol[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => handleProtocolChange(p)}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all uppercase tracking-wide ${activeProtocol === p
                                    ? 'bg-white text-black shadow-lg'
                                    : 'text-muted-foreground hover:text-white'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Selection Row */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Collateral Side */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500"></div> You Supply (Collateral)
                        </label>
                        <div className="relative">
                            <select
                                className="w-full h-16 pl-14 pr-4 bg-white/5 border border-white/10 rounded-xl text-lg font-bold appearance-none hover:bg-white/10 focus:ring-1 focus:ring-[#CEFF00] transition-all outline-none"
                                onChange={handleCollateralChange}
                                value={selectedCollateral.symbol}
                            >
                                {protocolCollaterals.map((opt) => (
                                    <option key={opt.symbol} value={opt.symbol}>
                                        {opt.symbol} ({opt.apy}% APY)
                                    </option>
                                ))}
                            </select>
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <AssetIcon symbol={selectedCollateral.symbol} size={28} />
                            </div>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-sm">
                                Amt 0.00
                            </div>
                        </div>
                        <div className="flex justify-between text-xs font-bold px-1">
                            <span className="text-muted-foreground">Supply APY:</span>
                            <span className="text-emerald-400">{selectedCollateral.apy}%</span>
                        </div>
                    </div>

                    {/* Debt Side */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-red-500"></div> You Borrow (Asset)
                        </label>
                        <div className="relative">
                            <select
                                className="w-full h-16 pl-14 pr-4 bg-white/5 border border-white/10 rounded-xl text-lg font-bold appearance-none hover:bg-white/10 focus:ring-1 focus:ring-red-400/50 transition-all outline-none"
                                value={selectedDebt.symbol}
                                onChange={(e) => {
                                    const symbol = e.target.value;
                                    const newDebt = protocolDebts.find(d => d.symbol === symbol) || protocolDebts[0];
                                    setSelectedDebt(newDebt);
                                }}
                            >
                                {protocolDebts.map((opt) => (
                                    <option key={opt.symbol} value={opt.symbol}>
                                        {opt.symbol} ({opt.apy}% APY)
                                    </option>
                                ))}
                            </select>
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <AssetIcon symbol={selectedDebt.symbol} size={28} />
                            </div>
                        </div>
                        <div className="flex justify-between text-xs font-bold px-1">
                            <span className="text-muted-foreground">Borrow Cost:</span>
                            <span className="text-red-500">{Math.abs(selectedDebt.apy)}%</span>
                        </div>
                    </div>
                </div>

                {/* Leverage Slider */}
                <div className="pt-4 space-y-6 bg-black/20 p-6 rounded-xl border border-white/5">
                    <div className="flex justify-between items-end">
                        <label className="text-sm font-bold text-white uppercase tracking-wider">Boost Multiplier</label>
                        <span className="text-3xl font-bold text-[#CEFF00] font-mono">{leverage[0]}x</span>
                    </div>

                    <Slider
                        defaultValue={[1.5]}
                        max={4.0}
                        min={1.1}
                        step={0.1}
                        onValueChange={setLeverage}
                        className="py-4"
                    />

                    <div className="flex justify-between text-[10px] font-bold tracking-widest text-muted-foreground">
                        <span>CONSERVATIVE</span>
                        <span className="text-red-500">AGGRESSIVE</span>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 text-center py-4">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Net APY</div>
                        <div className="text-2xl font-bold text-[#CEFF00]">{netApy}%</div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Health Factor</div>
                        <div className={`text-2xl font-bold ${isRisky ? 'text-red-500' : 'text-emerald-500'}`}>
                            {healthFactor > '100' ? '∞' : healthFactor}
                        </div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Liquidation Price</div>
                        <div className="flex justify-center flex-col mt-1">
                            <div className="text-xl font-bold text-white">${liquidationPrice}</div>
                            <div className="text-[10px] text-muted-foreground">Est. price of {selectedCollateral.symbol}</div>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <div className="pt-4">
                    <ConnectButton.Custom>
                        {({ account, chain, openConnectModal, authenticationStatus, mounted }) => {
                            const ready = mounted && authenticationStatus !== 'loading';
                            const connected =
                                ready &&
                                account &&
                                chain &&
                                (!authenticationStatus ||
                                    authenticationStatus === 'authenticated');

                            return (
                                <Button
                                    onClick={!connected ? openConnectModal : undefined}
                                    className="w-full h-16 text-xl font-bold bg-[#CEFF00] text-black hover:bg-[#b8e600] rounded-xl shadow-[0_0_30px_rgba(206,255,0,0.3)] hover:scale-[1.01] transition-all uppercase tracking-wider"
                                >
                                    {connected ? 'Execute Strategy' : 'Connect Wallet to Execute'}
                                </Button>
                            );
                        }}
                    </ConnectButton.Custom>
                    <div className="text-center mt-3 flex justify-center items-center gap-2 text-xs text-muted-foreground">
                        <ShieldCheck size={12} className="text-emerald-500" />
                        Audited by CertiK • Non-Custodial • Flashloan Powered
                    </div>
                </div>
            </div>
        </Card>
    );
}
