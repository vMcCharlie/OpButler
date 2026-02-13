"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AssetIcon } from "@/components/ui/asset-icon";
import { Loader2, Check, X, ArrowUpDown, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { VENUS_VTOKENS, VTOKEN_ABI } from "@/lib/pool-config";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatMoney, formatTokenAmount } from "@/lib/utils";
import { useTokenPrices } from "@/hooks/useTokenPrices";
import { useVenusPortfolio } from "@/hooks/useVenusPortfolio";

interface BorrowModalProps {
    isOpen: boolean;
    onClose: () => void;
    pool: {
        symbol: string;
        project: string;
        apyBaseBorrow?: number;
        apyRewardBorrow?: number;
        tvlUsd: number;
        totalBorrowUsd?: number;
    };
}

export function BorrowModal({ isOpen, onClose, pool }: BorrowModalProps) {
    const { isConnected, address } = useAccount();
    const { openConnectModal } = useConnectModal();
    const [amount, setAmount] = useState("");
    const [activeTab, setActiveTab] = useState<"borrow" | "repay">("borrow");
    const [step, setStep] = useState<"idle" | "approving" | "mining" | "success">("idle");

    const isVenus = pool.project === 'venus';
    const vTokenAddress = isVenus ? VENUS_VTOKENS[pool.symbol] : undefined;
    const isNative = pool.symbol === 'BNB';

    // Prices
    const { data: prices } = useTokenPrices();
    const tokenPrice = prices ? prices.getPrice(pool.symbol) : 0;

    // User Portfolio Data (for Debt / Wallet Balance)
    const { positions: venusPositions = [] } = useVenusPortfolio();

    // Find gathered position for this pool
    // Note: We use the aggregated key approach or just find by symbol since we're in the modal for a specific pool context
    // But `pool` passed here might be aggregated.
    // Let's match by symbol roughly or use `venusPositions` logic
    const userPosition = venusPositions.find((p: any) => p.symbol === pool.symbol);
    const borrowedAmount = userPosition?.borrow || 0;
    const borrowedAmountUSD = userPosition?.borrowUSD || 0;

    // Wallet Balance
    const { data: balanceData } = useBalance({
        address: address,
        token: isNative ? undefined : undefined // TODO: Handle Underlying Token Address fetch
    });
    // Valid for BNB, but for others we need token address. 
    // For now assuming BNB or just 0 for visual parity until we fix token address fetching completely.
    const walletBalance = isNative && balanceData ? parseFloat(balanceData.formatted) : 0;


    const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        if (isConfirmed) {
            setStep("success");
            setTimeout(() => {
                // optional auto-close
            }, 3000);
        } else if (isConfirming || isPending) {
            setStep("mining");
        } else {
            setStep("idle");
        }
    }, [isConfirmed, isConfirming, isPending]);

    const handleAction = () => {
        if (!isConnected) {
            openConnectModal?.();
            return;
        }

        if (!vTokenAddress || !isVenus) {
            alert("Contract integration pending for this asset.");
            return;
        }

        try {
            const amountBig = parseUnits(amount, 18); // Assume 18 decimals

            if (activeTab === 'borrow') {
                writeContract({
                    address: vTokenAddress,
                    abi: VTOKEN_ABI,
                    functionName: 'borrow',
                    args: [amountBig]
                });
            } else {
                // Repay
                if (isNative) {
                    writeContract({
                        address: vTokenAddress,
                        abi: VTOKEN_ABI,
                        functionName: 'repayBorrow',
                        value: amountBig
                    });
                } else {
                    // TODO: Approve Underlying Token first
                    writeContract({
                        address: vTokenAddress,
                        abi: VTOKEN_ABI,
                        functionName: 'repayBorrow',
                        args: [amountBig]
                    });
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const isButtonDisabled = !amount || parseFloat(amount) <= 0 || step === 'mining' || step === 'success';
    const borrowApy = (pool.apyBaseBorrow || 0) + (pool.apyRewardBorrow || 0);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[420px] bg-[#09090b] border-white/10 text-white p-0 gap-0 overflow-hidden rounded-3xl">
                {/* Header Section */}
                <div className="p-6 pb-4 relative">
                    <div className="flex items-center gap-3">
                        <AssetIcon symbol={pool.symbol} className="w-10 h-10" />
                        <div>
                            <h2 className="text-xl font-bold">{pool.symbol}</h2>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="uppercase">{pool.project}</span>
                                <span className="w-1 h-1 bg-white/20 rounded-full" />
                                <span className="text-blue-400">Borrow Market</span>
                            </div>
                        </div>
                    </div>
                    {/* Removed duplicate Close button */}
                </div>

                {/* Stats Card */}
                <div className="px-6 mb-6">
                    <div className="bg-[#121216] border border-white/5 rounded-2xl p-4 grid grid-cols-2 gap-y-4 gap-x-8">
                        <div>
                            <div className="text-[10px] uppercase text-blue-400 font-bold mb-1">Your Debt</div>
                            <div className="text-lg font-mono text-blue-400">
                                {borrowedAmount > 0 ? `${formatTokenAmount(borrowedAmount)} ${pool.symbol}` : '0'}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                                ≈ {formatMoney(borrowedAmountUSD)}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] uppercase text-muted-foreground font-bold mb-1">Health Factor</div>
                            <div className="text-lg font-bold font-mono text-emerald-400">Safe</div>
                            <div className="text-[10px] text-muted-foreground">Liquidity used: 0%</div>
                        </div>

                        <div className="col-span-2 h-[1px] bg-white/5 my-1" />

                        <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                Borrow APY <ArrowUpDown className="w-3 h-3" />
                            </span>
                            <span className="text-blue-400 font-bold font-mono text-sm bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20">
                                -{borrowApy.toFixed(2)}%
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Available Liquidity</span>
                            <div className="text-right">
                                <span className="text-white font-bold text-sm block">{formatMoney((pool.tvlUsd || 0) - (pool.totalBorrowUsd || 0))}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Tabs */}
                <div className="px-6 mb-4">
                    <div className="bg-[#121216] rounded-xl p-1 flex relative">
                        <motion.div
                            className="absolute top-1 bottom-1 bg-[#1a1a20] rounded-lg shadow-sm"
                            initial={false}
                            animate={{
                                left: activeTab === 'borrow' ? '4px' : '50%',
                                width: 'calc(50% - 4px)',
                                x: activeTab === 'borrow' ? 0 : 0
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                        <button
                            onClick={() => setActiveTab('borrow')}
                            className={`flex-1 relative z-10 py-2 text-sm font-bold transition-colors ${activeTab === 'borrow' ? 'text-white' : 'text-muted-foreground'}`}
                        >
                            Borrow
                        </button>
                        <button
                            onClick={() => setActiveTab('repay')}
                            className={`flex-1 relative z-10 py-2 text-sm font-bold transition-colors ${activeTab === 'repay' ? 'text-white' : 'text-muted-foreground'}`}
                        >
                            Repay
                        </button>
                    </div>
                </div>

                {/* Input Section */}
                <div className="px-6 pb-6">
                    <div className="bg-[#121216] border border-white/5 rounded-2xl p-4 mb-4">
                        <div className="flex justify-between text-xs text-muted-foreground mb-3 uppercase font-bold tracking-wider">
                            <span>
                                {activeTab === 'borrow' ? 'Borrow Amount' : 'Repay Amount'}
                            </span>
                            <div className="flex gap-2">
                                <span>
                                    {activeTab === 'repay' ? 'Wallet: ' : 'Available: '}
                                    {activeTab === 'repay' ? formatTokenAmount(walletBalance) : '-'} {pool.symbol}
                                </span>
                                <div className="flex gap-1">
                                    <button className="text-[10px] bg-white/10 hover:bg-white/20 px-1.5 rounded" onClick={() => setAmount((walletBalance / 2).toString())}>HALF</button>
                                    <button className="text-[10px] bg-white/10 hover:bg-white/20 px-1.5 rounded" onClick={() => setAmount(walletBalance.toString())}>MAX</button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-black/40 px-2 py-1.5 rounded-lg border border-white/5">
                                <AssetIcon symbol={pool.symbol} className="w-6 h-6" />
                                <span className="font-bold text-sm">{pool.symbol}</span>
                            </div>
                            <input
                                type="number"
                                placeholder="0.00"
                                className="bg-transparent text-right text-2xl font-mono font-bold w-full outline-none text-white"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                        {/* Dynamic USD Calculation */}
                        <div className="text-right text-xs text-muted-foreground mt-1">
                            ≈ {formatMoney(parseFloat(amount || '0') * tokenPrice)}
                        </div>
                    </div>

                    <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-yellow-200">
                            Ensure you manage your health factor. If it drops below 1.0, you may be liquidated.
                        </div>
                    </div>

                    {/* Action Button */}
                    <Button
                        onClick={handleAction}
                        disabled={isButtonDisabled}
                        className={`w-full h-14 text-lg font-bold rounded-xl relative overflow-hidden transition-all ${step === 'success' ? 'bg-emerald-500 hover:bg-emerald-500' :
                            activeTab === 'borrow' ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-white hover:bg-gray-200 text-black'
                            }`}
                    >
                        <AnimatePresence mode="wait">
                            {step === 'idle' && (
                                <motion.span
                                    key="idle"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    {isConnected ? (activeTab === 'borrow' ? 'Borrow' : 'Repay') : 'Connect Wallet'}
                                </motion.span>
                            )}

                            {step === 'mining' && (
                                <motion.div
                                    key="mining"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-2"
                                >
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Processing...</span>
                                </motion.div>
                            )}

                            {step === 'success' && (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center gap-2 text-white"
                                >
                                    <div className="bg-white text-emerald-500 rounded-full p-1">
                                        <Check className="w-4 h-4 stroke-[4]" />
                                    </div>
                                    <span>Success!</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
