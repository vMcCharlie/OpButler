'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { AssetIcon } from "@/components/ui/asset-icon";
import { useYields } from "@/hooks/useYields";
import { useTokenPrices } from "@/hooks/useTokenPrices";
import {
    ArrowRight,
    ChevronDown,
    Loader2,
    Layers,
    X,
    AlertTriangle,
    Check,
    Info
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import {
    getProtocolAddress,
    UNDERLYING_TOKENS,
    ERC20_ABI,
} from '@/lib/pool-config';
import { RiskMonitor } from './RiskMonitor';
import { formatUnits } from 'viem';
import { toPlainString, formatSmallNumber } from "@/lib/utils";
import { StrategyInfoModal } from './StrategyInfoModal';

// --- Types & Helper Components ---

function TokenSelect({ value, options, onChange, label, disabled = false }: {
    value: string,
    options: string[],
    onChange: (val: string) => void,
    label: string,
    disabled?: boolean
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className="flex-1 space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">{label}</label>
            <div className="relative">
                <button
                    disabled={disabled}
                    onClick={() => setOpen(!open)}
                    className="w-full h-12 px-3 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                    <div className="flex items-center gap-2">
                        <AssetIcon symbol={value} size={24} />
                        <span className="font-bold text-sm">{value}</span>
                    </div>
                    <ChevronDown size={14} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && !disabled && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}></div>
                        <div className="absolute top-full left-0 w-full mt-1 bg-[#121216] border border-white/10 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                            {options.map((opt) => (
                                <div
                                    key={opt}
                                    className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-white/5 transition-colors ${value === opt ? 'bg-[#CEFF00]/10' : ''}`}
                                    onClick={() => { onChange(opt); setOpen(false); }}
                                >
                                    <AssetIcon symbol={opt} size={20} />
                                    <span className={`text-sm ${value === opt ? 'font-bold text-[#CEFF00]' : 'text-white'}`}>{opt}</span>
                                    {value === opt && <Check size={14} className="text-[#CEFF00] ml-auto" />}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}


interface StrategyModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: {
        protocol: 'venus' | 'kinza' | 'radiant';
        supplyAsset: string;
        borrowAsset: string;
    };
}

export function StrategyModal({ isOpen, onClose, initialData }: StrategyModalProps) {
    const { address } = useAccount();
    const { toast } = useToast();
    const { openConnectModal } = useConnectModal();
    const { data: yields } = useYields();
    const { data: priceData } = useTokenPrices();
    const getPrice = priceData?.getPrice || ((_s: string) => 0);

    // -- State --
    const [protocol, setProtocol] = useState<'venus' | 'kinza' | 'radiant'>('venus');
    const [tokenA, setTokenA] = useState('USDC'); // Supply
    const [tokenB, setTokenB] = useState('USDT'); // Borrow
    const [inputToken, setInputToken] = useState('BNB');
    const [amount, setAmount] = useState('1000');

    const [leverage, setLeverage] = useState(1.5);
    const [isInfoOpen, setIsInfoOpen] = useState(false);

    // Initialize from props
    useEffect(() => {
        if (isOpen && initialData) {
            setProtocol(initialData.protocol);
            setTokenA(initialData.supplyAsset);
            setTokenB(initialData.borrowAsset);
            // Reset state
            setAmount('');
            setAmount('1000');
        }
    }, [isOpen, initialData]);

    // -- Wallet Balance Hooks --


    // -- Effects for Stepper --

    // -- Calculated Data --
    const protocolYields = useMemo(() => {
        if (!yields) return [];
        return yields.filter(y => y.project.toLowerCase().includes(protocol));
    }, [yields, protocol]);

    const availableTokens = useMemo(() => {
        return Array.from(new Set(protocolYields.map(y => y.symbol))).sort();
    }, [protocolYields]);

    const walletTokens = ['BNB', 'USDT', 'USDC', 'ETH', 'BTCB', 'FDUSD'];

    const poolA = protocolYields.find(y => y.symbol === tokenA);
    const poolB = protocolYields.find(y => y.symbol === tokenB);

    const ltv = poolA?.ltv || 0.8;
    const maxLeverage = Math.min(4, 1 / (1 - ltv));

    const priceA = getPrice(tokenA);
    const priceB = getPrice(tokenB);

    const principalUSD = parseFloat(amount) || 0;
    const totalExposureUSD = principalUSD * leverage;
    const totalDebtUSD = totalExposureUSD - principalUSD;

    const healthFactor = totalDebtUSD > 0 ? (totalExposureUSD * ltv) / totalDebtUSD : 999;
    const netApy = principalUSD > 0
        ? (((poolA?.apy || 0) * totalExposureUSD) - ((poolB?.apyBaseBorrow || 0) * totalDebtUSD)) / principalUSD
        : 0;

    // -- Projections --
    const projections = useMemo(() => {
        if (!principalUSD || principalUSD <= 0) return null;
        const rate = netApy / 100;

        const calculateReturn = (years: number) => {
            return principalUSD * Math.pow(1 + rate, years) - principalUSD;
        };

        return [
            { label: '1 Month', value: calculateReturn(1 / 12), time: '1m' },
            { label: '3 Months', value: calculateReturn(3 / 12), time: '3m' },
            { label: '6 Months', value: calculateReturn(0.5), time: '6m' },
            { label: '1 Year', value: calculateReturn(1), time: '1y' },
            { label: '3 Years', value: calculateReturn(3), time: '3y' }
        ];
    }, [principalUSD, netApy]);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[1000px] h-auto max-h-[85vh] sm:h-auto overflow-y-auto bg-[#0f0f12] border-white/10 text-white p-0 gap-0 rounded-2xl sm:rounded-3xl">
                    <div className="sticky top-0 z-20 flex items-center justify-between p-4 md:p-6 border-b border-white/10 bg-[#0f0f12]/80 backdrop-blur-md">
                        <div>
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                <Layers className="text-[#CEFF00] w-5 h-5" />
                                {tokenA} / {tokenB} Strategy
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-1">
                                Execute a multi-step loop on {protocol.toUpperCase()}
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsInfoOpen(true)}
                                className="p-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-white"
                                title="How it works"
                            >
                                <Info size={20} />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="p-4 md:p-6 space-y-6 md:space-y-8">
                        {/* 1. Selection Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4 flex flex-col justify-center">
                                <div className="text-center space-y-2">
                                    <h3 className="text-lg font-bold text-white">Simulation Mode</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Simulating a <span className="text-[#CEFF00] font-bold">$1,000</span> initial deposit strategy.
                                    </p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                                <span className="flex items-center gap-2 text-[#CEFF00] mb-2 font-bold text-sm uppercase tracking-widest">
                                    Strategy Config
                                </span>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-white text-sm">Target Leverage</span>
                                        <span className="text-xl font-black text-[#CEFF00] font-mono">{leverage.toFixed(2)}x</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max={maxLeverage.toFixed(2)}
                                        step="0.05"
                                        value={leverage}
                                        onChange={(e) => setLeverage(parseFloat(e.target.value))}
                                        className="w-full accent-[#CEFF00] h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                        <span>Safe</span>
                                        <span className="text-red-500/80">High Risk</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center">
                                <span className="text-[10px] uppercase text-muted-foreground mb-1 font-bold">Net APY</span>
                                <span className="text-lg font-bold text-[#CEFF00]">+{netApy.toFixed(2)}%</span>
                                <div className="flex gap-2 text-[9px] text-muted-foreground mt-1">
                                    <span className="text-emerald-400">Supply: +{(poolA?.apy || 0).toFixed(2)}%</span>
                                    <span className="text-white/20">|</span>
                                    <span className="text-red-400">Borrow: -{(poolB?.apyBaseBorrow || 0).toFixed(2)}%</span>
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center">
                                <span className="text-[10px] uppercase text-muted-foreground mb-1 font-bold">Health Factor</span>
                                <span className={`text-lg font-bold ${healthFactor > 1.5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {healthFactor > 100 ? '>100' : healthFactor.toFixed(2)}
                                </span>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center">
                                <span className="text-[10px] uppercase text-muted-foreground mb-1 font-bold">Total Debt</span>
                                <span className="text-lg font-bold text-white">${totalDebtUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center">
                                <span className="text-[10px] uppercase text-muted-foreground mb-1 font-bold">Exposure</span>
                                <span className="text-lg font-bold text-white">${totalExposureUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                        </div>

                        {/* 3. Beta Warning */}
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                            <div className="space-y-1">
                                <h4 className="font-bold text-amber-500 text-sm">Beta Feature</h4>
                                <p className="text-xs text-muted-foreground">
                                    Simulate earnings only. Transaction execution is currently disabled for further testing.
                                </p>
                            </div>
                        </div>

                        {/* 4. Projections Table - Visible when Amount > 0 */}
                        <div className={`transition-all duration-500 overflow-hidden space-y-4 ${(parseFloat(amount) > 0) ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            {projections && (
                                <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                                    <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                                        <h3 className="font-bold text-white text-sm">Projected Earnings</h3>
                                        <span className="text-xs text-muted-foreground">Based on current rates</span>
                                    </div>
                                    <div className="divide-y divide-white/5">
                                        {projections.map((p) => (
                                            <div key={p.time} className="flex justify-between items-center p-4 hover:bg-white/[0.02] transition-colors">
                                                <span className="text-sm text-muted-foreground">{p.label}</span>
                                                <div className="text-right">
                                                    <div className="font-bold text-[#CEFF00] font-mono">
                                                        +${p.value.toFixed(2)}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        Total: ${(principalUSD + p.value).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2">
                            <Button
                                variant="outline"
                                className="w-full h-12 bg-[#CEFF00] text-black border-none hover:bg-[#b8e600] font-bold"
                                onClick={onClose}
                            >
                                Exit Simulation
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <StrategyInfoModal
                isOpen={isInfoOpen}
                onClose={() => setIsInfoOpen(false)}
            />
        </>
    );
}
