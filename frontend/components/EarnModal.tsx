import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AssetIcon } from "@/components/ui/asset-icon";
import { Loader2, Check, ExternalLink, X, ArrowUpDown, AlertTriangle, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useReadContracts, useBalance } from "wagmi";
import { parseEther, parseUnits, formatUnits } from "viem";
import { VENUS_VTOKENS, VTOKEN_ABI, ERC20_ABI, UNDERLYING_TOKENS } from "@/lib/pool-config";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatMoney, formatTokenAmount } from "@/lib/utils";
import { useTokenPrices } from "@/hooks/useTokenPrices";
import { useVenusCollateral } from "@/hooks/useVenusCollateral";

interface EarnModalProps {
    isOpen: boolean;
    onClose: () => void;
    pool: {
        symbol: string;
        project: string;
        apy: number;
        tvlUsd: number;
        userDeposited?: number;
        userEarnings?: number;
    };
}

export function EarnModal({ isOpen, onClose, pool }: EarnModalProps) {
    const { address, isConnected } = useAccount();
    const { openConnectModal } = useConnectModal();
    const [amount, setAmount] = useState("");
    const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
    const [step, setStep] = useState<"idle" | "approving" | "mining" | "success">("idle");
    const { data: prices } = useTokenPrices();

    // Collateral awareness
    const collateral = useVenusCollateral(pool.symbol);

    // Get Price
    const tokenPrice = prices ? prices.getPrice(pool.symbol) : 0;

    // --- Contract Config ---
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
        const rawUnderlying = (vBalance * exchangeRate) / BigInt(1e18);
        depositedAmount = parseFloat(formatUnits(rawUnderlying, 18));
        depositedValueUSD = depositedAmount * tokenPrice;
    }

    useEffect(() => {
        if (isConfirmed) {
            setStep("success");
            refetchPoolData();
            setTimeout(() => {
            }, 3000);
        } else if (isConfirming || isPending) {
            setStep("mining");
        } else {
            setStep("idle");
        }
    }, [isConfirmed, isConfirming, isPending, refetchPoolData]);

    // --- Withdraw Gating Logic ---
    const isWithdrawBlocked = activeTab === 'withdraw' && collateral.isCollateral && collateral.borrowBalance > 0;
    const withdrawLimitedByCollateral = activeTab === 'withdraw' && collateral.isCollateral && collateral.maxWithdrawable < depositedAmount;

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
            const amountBig = parseUnits(amount, 18);

            if (activeTab === 'deposit') {
                if (isNative) {
                    writeContract({
                        address: vTokenAddress,
                        abi: VTOKEN_ABI,
                        functionName: 'mint',
                        value: amountBig
                    });
                } else {
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
            const maxAmount = collateral.isCollateral ? collateral.maxWithdrawable : depositedAmount;
            setAmount((maxAmount / 2).toString());
        }
    };

    const setMax = () => {
        if (activeTab === 'deposit') {
            if (isNative) {
                const max = walletBalance > 0.01 ? walletBalance - 0.01 : 0;
                setAmount(max.toString());
            } else {
                setAmount(walletBalance.toString());
            }
        } else {
            const maxAmount = collateral.isCollateral ? collateral.maxWithdrawable : depositedAmount;
            setAmount(maxAmount.toString());
        }
    };

    const amountNum = parseFloat(amount || '0');
    const exceedsWithdrawLimit = activeTab === 'withdraw' && collateral.isCollateral && amountNum > collateral.maxWithdrawable && collateral.maxWithdrawable >= 0;
    const isButtonDisabled = !amount || amountNum <= 0 || step === 'mining' || step === 'success' || (activeTab === 'withdraw' && isWithdrawBlocked) || exceedsWithdrawLimit;

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
                    <div className="bg-[#121216] border border-white/5 rounded-2xl p-4 space-y-3">
                        {/* Row 1: Deposited & Collateral Status */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-[10px] uppercase text-muted-foreground font-bold mb-1">Deposited</div>
                                <div className="text-lg font-bold font-mono">{formatTokenAmount(depositedAmount)} {pool.symbol}</div>
                                <div className="text-[10px] text-muted-foreground">≈ {formatMoney(depositedAmount * tokenPrice)}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] uppercase text-muted-foreground font-bold mb-1">Collateral</div>
                                {collateral.isLoading ? (
                                    <div className="text-sm text-muted-foreground">Loading...</div>
                                ) : collateral.isCollateral ? (
                                    <div className="flex items-center justify-end gap-1.5">
                                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                                        <span className="text-sm font-bold text-amber-400">Active</span>
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground">Not Collateral</div>
                                )}
                                {collateral.borrowBalance > 0 && (
                                    <div className="text-[10px] text-red-400 mt-0.5">
                                        Borrow: {formatTokenAmount(collateral.borrowBalance)} ({formatMoney(collateral.borrowBalanceUSD)})
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="h-[1px] bg-white/5" />

                        {/* Row 2: APY & TVL */}
                        <div className="grid grid-cols-2 gap-4">
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
                                <span className="text-white font-bold text-sm">{formatMoney(pool.tvlUsd)}</span>
                            </div>
                        </div>

                        {/* Row 3: Withdraw limits (only in withdraw mode with collateral) */}
                        {activeTab === 'withdraw' && collateral.isCollateral && !collateral.isLoading && (
                            <>
                                <div className="h-[1px] bg-white/5" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-[10px] text-muted-foreground uppercase">Max Withdrawable</span>
                                        <div className="text-sm font-mono font-medium text-white">
                                            {formatTokenAmount(collateral.maxWithdrawable)} {pool.symbol}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-muted-foreground uppercase">Account Liquidity</span>
                                        <div className={`text-sm font-mono font-medium ${collateral.shortfall > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {collateral.shortfall > 0 ? `-${formatMoney(collateral.shortfall)}` : formatMoney(collateral.liquidity)}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Collateral + Debt Warning Banner */}
                {activeTab === 'withdraw' && isWithdrawBlocked && (
                    <div className="px-6 mb-4">
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <div className="text-sm font-bold text-red-400 mb-1">Active Debt Prevents Withdrawal</div>
                                <div className="text-xs text-red-300/80 mb-2">
                                    This asset is being used as collateral for a debt of{' '}
                                    <span className="font-mono font-bold">{formatTokenAmount(collateral.borrowBalance)} {pool.symbol}</span>
                                    {' '}({formatMoney(collateral.borrowBalanceUSD)}).
                                    You need to repay your debt before you can withdraw this collateral.
                                </div>
                                <a
                                    href="/lend/borrow"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-500/30 transition-colors"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Go to Repay Debt
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* Withdraw limit warning (collateral but partial withdrawal allowed) */}
                {activeTab === 'withdraw' && withdrawLimitedByCollateral && !isWithdrawBlocked && (
                    <div className="px-6 mb-4">
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-200">
                                This asset is used as collateral. Max safe withdrawal:{' '}
                                <span className="font-mono font-bold">{formatTokenAmount(collateral.maxWithdrawable)} {pool.symbol}</span>.
                                Withdrawing more may cause liquidation.
                            </div>
                        </div>
                    </div>
                )}

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
                                <span>
                                    {activeTab === 'deposit' ? 'Wallet' : 'Available'}:{' '}
                                    {formatTokenAmount(activeTab === 'deposit' ? walletBalance : (collateral.isCollateral ? collateral.maxWithdrawable : depositedAmount))}{' '}
                                    {pool.symbol}
                                </span>
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
                                disabled={isWithdrawBlocked}
                            />
                        </div>
                        <div className="text-right text-xs text-muted-foreground mt-1">
                            <div className="text-right text-xs text-muted-foreground mt-1">
                                ≈ {formatMoney(parseFloat(amount || '0') * tokenPrice)}
                            </div>
                        </div>

                        {/* Exceeds limit warning */}
                        {exceedsWithdrawLimit && (
                            <div className="text-xs text-red-400 mt-2 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Amount exceeds safe withdrawal limit of {formatTokenAmount(collateral.maxWithdrawable)} {pool.symbol}
                            </div>
                        )}
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
                                    {!isConnected
                                        ? 'Connect to Deposit'
                                        : isWithdrawBlocked
                                            ? '🔒 Repay Debt First'
                                            : (activeTab === 'deposit' ? 'Deposit' : 'Withdraw')}
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
