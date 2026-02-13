import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AssetIcon } from "@/components/ui/asset-icon";
import { Loader2, Check, ExternalLink, X, ArrowUpDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useReadContracts, useBalance } from "wagmi";
import { parseEther, parseUnits, formatUnits } from "viem";
import { VENUS_VTOKENS, VTOKEN_ABI, ERC20_ABI, UNDERLYING_TOKENS } from "@/lib/pool-config";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatMoney, formatTokenAmount } from "@/lib/utils";
import { useTokenPrices } from "@/hooks/useTokenPrices";

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
    const { data: prices } = useTokenPrices();

    // Get Price
    const tokenPrice = prices ? prices.getPrice(pool.symbol) : 0;

    // --- Contract Config ---
    // Only supporting Venus for explicit demo logic right now.
    // Others will show a "Coming Soon" or generic handling.
    const isVenus = pool.project === 'venus';
    const vTokenAddress = isVenus ? VENUS_VTOKENS[pool.symbol] : undefined;
    const isNative = pool.symbol === 'BNB';
    const underlyingAddress = UNDERLYING_TOKENS[pool.symbol];

    // Transaction Hooks
    const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    // --- 1. Fetch Wallet Balance (Underlying) ---
    const { data: nativeBalance } = useBalance({
        address,
        query: { enabled: !!address && isNative }
    });

    const { data: tokenBalanceRaw } = useReadContract({
        address: underlyingAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address && !isNative && !!underlyingAddress }
    });

    // Determine Wallet Balance
    let walletBalance = 0;
    let walletBalanceRaw = BigInt(0);

    if (isNative) {
        if (nativeBalance) {
            walletBalance = parseFloat(nativeBalance.formatted);
            walletBalanceRaw = nativeBalance.value;
        }
    } else {
        if (tokenBalanceRaw) {
            // Assume 18 decimals generally for BSC main tokens, or we could fetch decimals.
            // Safe default for these majors is 18.
            walletBalance = parseFloat(formatUnits(tokenBalanceRaw, 18));
            walletBalanceRaw = tokenBalanceRaw;
        }
    }

    // --- 2. Fetch User Protocol Data (Deposited Balance) ---
    const { data: poolData, refetch: refetchPoolData } = useReadContracts({
        contracts: [
            {
                address: vTokenAddress,
                abi: VTOKEN_ABI,
                functionName: 'balanceOf',
                args: address ? [address] : undefined
            },
            {
                address: vTokenAddress,
                abi: VTOKEN_ABI,
                functionName: 'exchangeRateStored'
            },
            {
                address: vTokenAddress,
                abi: ERC20_ABI, // vToken is ERC20
                functionName: 'decimals'
            }
        ],
        query: {
            enabled: !!address && !!vTokenAddress,
            refetchInterval: 5000
        }
    });

    // Calculate Deposited Amount
    let depositedAmount = 0;
    let depositedValueUSD = 0;

    if (poolData && poolData[0].status === 'success' && poolData[1].status === 'success') {
        const vBalance = poolData[0].result as bigint;
        const exchangeRate = poolData[1].result as bigint;

        // Decimals (vTokens are 8)
        // Exchange Rate scaling = 18 + underlyingDecimals - 8
        // We need to know underlying decimals. 
        // For MVP, we can assume standard 18 for most, or try to deduce?
        // Let's hardcode 18 for now as widely used, or use a map if we had one here.
        // Actually, simple formula: Underlying = (vToken * ExchangeRate) / 1e18
        // This works regardless of decimals IF the exchange rate is scaled by 1e18 relative to the textual representation.
        // But solidity math:
        // Underlying Amount = (vTokenBalance * ExchangeRate) / 1e18

        const rawUnderlying = (vBalance * exchangeRate) / BigInt(1e18);

        // Now format units based on Underlying Decimals.
        // Most tokens in our list are 18 decimals (BNB, BTCB, ETH, USDT, USDC).
        // Let's assume 18.
        depositedAmount = parseFloat(formatUnits(rawUnderlying, 18));
    }

    useEffect(() => {
        if (isConfirmed) {
            setStep("success");
            refetchPoolData(); // Refresh balance
            setTimeout(() => {
                // optional auto-close or reset
            }, 3000);
        } else if (isConfirming || isPending) {
            setStep("mining");
        } else {
            setStep("idle");
        }
    }, [isConfirmed, isConfirming, isPending, refetchPoolData]);

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

    const setHalf = () => {
        if (activeTab === 'deposit') {
            setAmount((walletBalance / 2).toString());
        } else {
            setAmount((depositedAmount / 2).toString());
        }
    };

    const setMax = () => {
        if (activeTab === 'deposit') {
            // For native BNB, leave some dust (0.01)
            if (isNative) {
                const max = walletBalance > 0.01 ? walletBalance - 0.01 : 0;
                setAmount(max.toString());
            } else {
                setAmount(walletBalance.toString());
            }
        } else {
            setAmount(depositedAmount.toString());
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
                </div>

                {/* Stats Card */}
                <div className="px-6 mb-6">
                    <div className="bg-[#121216] border border-white/5 rounded-2xl p-4 grid grid-cols-2 gap-y-4 gap-x-8">
                        <div>
                            <div className="text-[10px] uppercase text-emerald-400 font-bold mb-1">Your Earnings</div>
                            <div className="text-lg font-mono text-emerald-400">-</div> {/* Placeholder */}
                            <div className="text-[10px] text-muted-foreground">Lifetime</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] uppercase text-muted-foreground font-bold mb-1">Deposited</div>
                            <div className="text-lg font-bold font-mono">{formatTokenAmount(depositedAmount)} {pool.symbol}</div>
                            <div className="text-[10px] text-muted-foreground">≈ {formatMoney(depositedAmount * tokenPrice)} (Est)</div>
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
                            <span>{activeTab === 'deposit' ? 'Deposit Amount' : 'Withdraw Amount'}</span>
                            <div className="flex gap-2">
                                <span>{activeTab === 'deposit' ? 'Wallet Balance' : 'Deposited'}: {formatTokenAmount(activeTab === 'deposit' ? walletBalance : depositedAmount)} {pool.symbol}</span>
                                <div className="flex gap-1">
                                    <button className="text-[10px] bg-white/10 hover:bg-white/20 px-1.5 rounded transition-colors" onClick={setHalf}>HALF</button>
                                    <button className="text-[10px] bg-white/10 hover:bg-white/20 px-1.5 rounded transition-colors" onClick={setMax}>MAX</button>
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
                            <div className="text-right text-xs text-muted-foreground mt-1">
                                ≈ {formatMoney(parseFloat(amount || '0') * tokenPrice)}
                            </div>
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
            </DialogContent >
        </Dialog >
    );
}
