"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AssetIcon } from "@/components/ui/asset-icon";
import { Loader2, Check, ExternalLink, X, ArrowUpDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseEther, parseUnits, formatUnits } from "viem";
import { VENUS_VTOKENS, VTOKEN_ABI, ERC20_ABI } from "@/lib/pool-config";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatMoney } from "@/lib/utils";

interface EarnModalProps {
    isOpen: boolean;
    onClose: () => void;
    pool: {
        symbol: string;
        project: string;
        apy: number;
        tvlUsd: number;
        userDeposited?: number; // Placeholder for now
        userEarnings?: number; // Placeholder for now
    };
}

export function EarnModal({ isOpen, onClose, pool }: EarnModalProps) {
    const { address, isConnected } = useAccount();
    const { openConnectModal } = useConnectModal();
    const [amount, setAmount] = useState("");
    const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
    const [step, setStep] = useState<"idle" | "approving" | "mining" | "success">("idle");

    // --- Contract Config ---
    // Only supporting Venus for explicit demo logic right now.
    // Others will show a "Coming Soon" or generic handling.
    const isVenus = pool.project === 'venus';
    const vTokenAddress = isVenus ? VENUS_VTOKENS[pool.symbol] : undefined;
    const isNative = pool.symbol === 'BNB';

    // Transaction Hooks
    const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    // Read Allowance (If ERC20)
    // NOTE: In a real app we need the underlying token address. 
    // We are skipping looking that up dynamically for this demo and assuming we can't do approval without it.
    // However, for vBNB (Native), no approval needed.
    // For others, we'd need a map of Symbol -> TokenAddress.

    useEffect(() => {
        if (isConfirmed) {
            setStep("success");
            // Reset after delay or keep success state?
            // Design says "show checkmark animation".
            setTimeout(() => {
                // optional auto-close or reset
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
            const amountBig = parseUnits(amount, 18); // Assume 18 decimals for simplicity in demo

            if (activeTab === 'deposit') {
                if (isNative) {
                    // Mint vBNB (payable)
                    writeContract({
                        address: vTokenAddress,
                        abi: VTOKEN_ABI,
                        functionName: 'mint',
                        value: amountBig
                    });
                } else {
                    // Mint vToken (ERC20)
                    // TODO: Add Approve Step. For now assuming approved or skipping to mint call which will fail if not approved.
                    // To do it properly we need the Token Address.
                    writeContract({
                        address: vTokenAddress,
                        abi: VTOKEN_ABI,
                        functionName: 'mint',
                        args: [amountBig]
                    });
                }
            } else {
                // Withdraw (Redeem Underlying)
                writeContract({
                    address: vTokenAddress,
                    abi: VTOKEN_ABI,
                    functionName: 'redeemUnderlying',
                    args: [amountBig]
                });
            }
        } catch (e) {
            console.error(e);
        }
    };

    const isButtonDisabled = !amount || parseFloat(amount) <= 0 || step === 'mining' || step === 'success';

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
                                <span className="text-emerald-400">Stable</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 text-muted-foreground hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Stats Card */}
                <div className="px-6 mb-6">
                    <div className="bg-[#121216] border border-white/5 rounded-2xl p-4 grid grid-cols-2 gap-y-4">
                        <div>
                            <div className="text-[10px] uppercase text-emerald-400 font-bold mb-1">Your Earnings</div>
                            <div className="text-lg font-mono text-emerald-400">-</div> {/* Placeholder */}
                            <div className="text-[10px] text-muted-foreground">Lifetime</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] uppercase text-muted-foreground font-bold mb-1">Deposited</div>
                            <div className="text-lg font-bold font-mono">0.00 {pool.symbol}</div>
                            <div className="text-[10px] text-muted-foreground">$0.00</div>
                        </div>

                        <div className="col-span-2 h-[1px] bg-white/5 my-1" />

                        <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                APY <ArrowUpDown className="w-3 h-3" />
                            </span>
                            <span className="text-emerald-400 font-bold font-mono text-sm bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                                {pool.apy.toFixed(2)}%
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Vault TVL</span>
                            <div className="text-right">
                                <span className="text-white font-bold text-sm block">{formatMoney(pool.tvlUsd)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Tabs */}
                <div className="px-6 mb-4">
                    <div className="bg-[#121216] rounded-xl p-1 flex relative">
                        {/* Sliding Background */}
                        <motion.div
                            className="absolute top-1 bottom-1 bg-[#1a1a20] rounded-lg shadow-sm"
                            initial={false}
                            animate={{
                                left: activeTab === 'deposit' ? '4px' : '50%',
                                width: 'calc(50% - 4px)',
                                x: activeTab === 'deposit' ? 0 : 0
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />

                        <button
                            onClick={() => setActiveTab('deposit')}
                            className={`flex-1 relative z-10 py-2 text-sm font-bold transition-colors ${activeTab === 'deposit' ? 'text-white' : 'text-muted-foreground hover:text-white/70'}`}
                        >
                            Deposit
                        </button>
                        <button
                            onClick={() => setActiveTab('withdraw')}
                            className={`flex-1 relative z-10 py-2 text-sm font-bold transition-colors ${activeTab === 'withdraw' ? 'text-white' : 'text-muted-foreground hover:text-white/70'}`}
                        >
                            Withdraw
                        </button>
                    </div>
                </div>

                {/* Input Section */}
                <div className="px-6 pb-6">
                    <div className="bg-[#121216] border border-white/5 rounded-2xl p-4 mb-4">
                        <div className="flex justify-between text-xs text-muted-foreground mb-3 uppercase font-bold tracking-wider">
                            <span>{activeTab === 'deposit' ? 'Deposit' : 'Withdraw'}</span>
                            <div className="flex gap-2">
                                <span>Wallet: 0.00 {pool.symbol}</span>
                                <div className="flex gap-1">
                                    <button className="text-[10px] bg-white/10 hover:bg-white/20 px-1.5 rounded transition-colors" onClick={() => { }}>HALF</button>
                                    <button className="text-[10px] bg-white/10 hover:bg-white/20 px-1.5 rounded transition-colors" onClick={() => { }}>MAX</button>
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
                                className="bg-transparent text-right text-2xl font-mono font-bold w-full outline-none placeholder:text-muted-foreground/30 text-white"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                        <div className="text-right text-xs text-muted-foreground mt-1">
                            ≈ $0.00
                        </div>
                    </div>

                    {/* Action Button */}
                    <Button
                        onClick={handleAction}
                        disabled={isButtonDisabled}
                        className={`w-full h-14 text-lg font-bold rounded-xl relative overflow-hidden transition-all ${step === 'success' ? 'bg-emerald-500 hover:bg-emerald-500' :
                                activeTab === 'deposit' ? 'bg-[#CEFF00] hover:bg-[#b5e000] text-black' : 'bg-white hover:bg-gray-200 text-black'
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
                                    {isConnected ? (activeTab === 'deposit' ? 'Deposit' : 'Withdraw') : 'Connect to Deposit'}
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
