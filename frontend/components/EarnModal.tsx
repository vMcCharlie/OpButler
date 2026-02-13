"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AssetIcon } from "@/components/ui/asset-icon";
import { Loader2, Check, ArrowUpDown, AlertTriangle, Shield, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useReadContracts, useBalance } from "wagmi";
import { parseUnits, formatUnits, maxUint256 } from "viem";
import {
    VENUS_VTOKENS, VTOKEN_ABI, VBNB_ABI, ERC20_ABI,
    KINZA_POOL, KINZA_POOL_ABI,
    RADIANT_LENDING_POOL, RADIANT_POOL_ABI,
    WETH_GATEWAY_ABI, KINZA_GATEWAY, RADIANT_GATEWAY,
    getUnderlyingAddress, getApprovalTarget,
} from "@/lib/pool-config";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatMoney, formatSmallNumber, getTokenDecimals } from "@/lib/utils";
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
        userDepositedUSD?: number;
    };
}

export function EarnModal({ isOpen, onClose, pool }: EarnModalProps) {
    const { toast } = useToast();
    const { address, isConnected } = useAccount();
    const { openConnectModal } = useConnectModal();
    const [amount, setAmount] = useState("");
    const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
    const [step, setStep] = useState<"idle" | "approving" | "mining" | "success">("idle");
    const { data: prices } = useTokenPrices();

    // Protocol detection
    const isVenus = pool.project === 'venus';
    const isKinza = pool.project === 'kinza-finance';
    const isRadiant = pool.project === 'radiant-v2';
    const isNative = pool.symbol === 'BNB' || pool.symbol === 'WBNB';
    const decimals = getTokenDecimals(pool.symbol);
    const tokenPrice = prices ? prices.getPrice(pool.symbol) : 0;

    // Venus-specific addresses
    const vTokenAddress = isVenus ? VENUS_VTOKENS[pool.symbol] : undefined;

    // Underlying token address (for ERC20 balance + approval)
    const underlyingAddress = getUnderlyingAddress(pool.symbol, pool.project);
    const approvalTarget = getApprovalTarget(pool.project, pool.symbol);

    // Venus collateral awareness
    const collateral = useVenusCollateral(pool.symbol);

    // Transaction hooks
    const { writeContract, data: hash, isPending, error: writeError, reset: resetWrite } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    // =========================================================================
    //                       WALLET BALANCE
    // =========================================================================
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

    let walletBalance = 0;
    if (isNative && nativeBalance) {
        walletBalance = parseFloat(nativeBalance.formatted);
    } else if (tokenBalanceRaw) {
        walletBalance = parseFloat(formatUnits(tokenBalanceRaw, decimals));
    }

    // =========================================================================
    //                   DEPOSITED BALANCE (per protocol)
    // =========================================================================

    // Venus: vToken balance * exchange rate
    const { data: venusData, refetch: refetchVenus } = useReadContracts({
        contracts: [
            { address: vTokenAddress, abi: VTOKEN_ABI, functionName: 'balanceOf', args: address ? [address] : undefined },
            { address: vTokenAddress, abi: VTOKEN_ABI, functionName: 'exchangeRateStored' },
        ],
        query: { enabled: !!address && isVenus && !!vTokenAddress, refetchInterval: 10000 }
    });

    // Kinza: getUserReserveData → aTokenBalance
    const KINZA_DATA_PROVIDER = '0x09ddc4ae826601b0f9671b9edffdf75e7e6f5d61' as `0x${string}`;
    const { data: kinzaReserve, refetch: refetchKinza } = useReadContract({
        address: KINZA_DATA_PROVIDER,
        abi: [{ name: 'getUserReserveData', type: 'function', stateMutability: 'view', inputs: [{ name: 'asset', type: 'address' }, { name: 'user', type: 'address' }], outputs: [{ name: 'currentATokenBalance', type: 'uint256' }, { name: 'currentStableDebtBalance', type: 'uint256' }, { name: 'currentVariableDebtBalance', type: 'uint256' }, { name: 'principalStableDebt', type: 'uint256' }, { name: 'scaledVariableDebt', type: 'uint256' }, { name: 'stableBorrowRate', type: 'uint256' }, { name: 'liquidityRate', type: 'uint256' }, { name: 'stableRateLastUpdated', type: 'uint40' }, { name: 'usedAsCollateralEnabled', type: 'bool' }] }] as const,
        functionName: 'getUserReserveData',
        args: underlyingAddress && address ? [
            isNative ? '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as `0x${string}` : underlyingAddress,
            address
        ] : undefined,
        query: { enabled: !!address && isKinza && (!!underlyingAddress || isNative), refetchInterval: 10000 }
    });

    // Radiant: We need to get aToken address, then read its balanceOf
    const { data: radiantReserveData } = useReadContract({
        address: RADIANT_LENDING_POOL,
        abi: [{ name: 'getReserveData', type: 'function', stateMutability: 'view', inputs: [{ name: 'asset', type: 'address' }], outputs: [{ name: 'configuration', type: 'uint256' }, { name: 'liquidityIndex', type: 'uint128' }, { name: 'currentLiquidityRate', type: 'uint128' }, { name: 'variableBorrowIndex', type: 'uint128' }, { name: 'currentVariableBorrowRate', type: 'uint128' }, { name: 'currentStableBorrowRate', type: 'uint128' }, { name: 'lastUpdateTimestamp', type: 'uint40' }, { name: 'aTokenAddress', type: 'address' }, { name: 'stableDebtTokenAddress', type: 'address' }, { name: 'variableDebtTokenAddress', type: 'address' }, { name: 'interestRateStrategyAddress', type: 'address' }, { name: 'id', type: 'uint8' }] }] as const,
        functionName: 'getReserveData',
        args: (underlyingAddress || isNative) ? [
            isNative ? '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as `0x${string}` : underlyingAddress!
        ] : undefined,
        query: { enabled: !!address && isRadiant && (!!underlyingAddress || isNative), staleTime: 60 * 60 * 1000 }
    });

    const radiantATokenAddress = radiantReserveData ? (radiantReserveData as unknown as any[])[7] as `0x${string}` : undefined;

    const { data: radiantATokenBalance, refetch: refetchRadiant } = useReadContract({
        address: radiantATokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address && isRadiant && !!radiantATokenAddress, refetchInterval: 10000 }
    });

    // Compute deposited amount
    let depositedAmount = 0;
    let depositedAmountUSD = 0;

    if (isVenus && venusData) {
        if (venusData[0].status === 'success' && venusData[1].status === 'success') {
            const vBal = venusData[0].result as bigint;
            const exchangeRate = venusData[1].result as bigint;
            // Venus exchange rate has 18 + underlyingDecimals - 8 precision
            // For 18 decimal tokens: exchangeRate is scaled by 1e28
            // underlying = vToken * exchangeRate / 1e18
            const rawUnderlying = (vBal * exchangeRate) / BigInt(1e18);
            depositedAmount = parseFloat(formatUnits(rawUnderlying, decimals));
        }
    } else if (isKinza && kinzaReserve) {
        const data = kinzaReserve as unknown as any[];
        const aTokenBal = data[0] as bigint;
        depositedAmount = parseFloat(formatUnits(aTokenBal, decimals));
    } else if (isRadiant && radiantATokenBalance) {
        depositedAmount = parseFloat(formatUnits(radiantATokenBalance, decimals));
    }

    // Use passed-in value if our query returned 0 but parent had data
    if (depositedAmount === 0 && pool.userDeposited && pool.userDeposited > 0) {
        depositedAmount = pool.userDeposited;
    }
    depositedAmountUSD = depositedAmount * tokenPrice;

    // =========================================================================
    //                      ALLOWANCE CHECK (for ERC20 approval)
    // =========================================================================
    const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
        address: underlyingAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address && approvalTarget ? [address, approvalTarget] : undefined,
        query: { enabled: !!address && !isNative && !!underlyingAddress && !!approvalTarget && activeTab === 'deposit' }
    });

    // =========================================================================
    //                        TX STATE MACHINE
    // =========================================================================
    useEffect(() => {
        if (isConfirmed) {
            if (step === 'approving') {
                // Approval succeeded — now do the actual deposit
                setStep('idle');
                refetchAllowance();
            } else {
                setStep("success");
                refetchVenus?.();
                refetchKinza?.();
                refetchRadiant?.();
            }
        } else if (isConfirming || isPending) {
            if (step !== 'approving') setStep("mining");
        }
    }, [isConfirmed, isConfirming, isPending, step, refetchAllowance, refetchVenus, refetchKinza, refetchRadiant]);

    // =========================================================================
    //                      DEPOSIT / WITHDRAW HANDLERS
    // =========================================================================
    const handleAction = useCallback(() => {
        if (!isConnected) { openConnectModal?.(); return; }

        const amountNum = parseFloat(amount || '0');
        if (amountNum <= 0) return;

        const amountBig = parseUnits(amount, decimals);

        try {
            if (activeTab === 'deposit') {
                // --- Check approval first (ERC20 only) ---
                const needsApproval = !isNative && underlyingAddress && approvalTarget && (currentAllowance || BigInt(0)) < amountBig;

                if (isVenus) {
                    if (isNative && vTokenAddress) {
                        // Venus Native Mint (BNB)
                        writeContract({ address: vTokenAddress, abi: VBNB_ABI, functionName: 'mint', value: amountBig });
                    } else if (!isNative && vTokenAddress) {
                        // Venus ERC20 Mint
                        if (needsApproval) {
                            setStep('approving');
                            writeContract({ address: underlyingAddress, abi: ERC20_ABI, functionName: 'approve', args: [approvalTarget!, maxUint256] });
                        } else {
                            writeContract({ address: vTokenAddress, abi: VTOKEN_ABI, functionName: 'mint', args: [amountBig] });
                        }
                    }
                } else if (isKinza || isRadiant) {
                    const poolAddress = isKinza ? KINZA_POOL : RADIANT_LENDING_POOL;

                    if (isNative) {
                        // Kinza/Radiant Native Deposit (BNB) via Gateway
                        const gatewayAddress = isKinza ? KINZA_GATEWAY : RADIANT_GATEWAY;
                        if (gatewayAddress) {
                            writeContract({
                                address: gatewayAddress,
                                abi: WETH_GATEWAY_ABI,
                                functionName: 'depositETH',
                                args: [poolAddress, address!, 0],
                                value: amountBig
                            });
                        }
                    } else {
                        // Kinza/Radiant ERC20 Supply
                        if (needsApproval) {
                            setStep('approving');
                            writeContract({ address: underlyingAddress, abi: ERC20_ABI, functionName: 'approve', args: [approvalTarget!, amountBig] });
                        } else {
                            if (isKinza) {
                                writeContract({ address: KINZA_POOL, abi: KINZA_POOL_ABI, functionName: 'supply', args: [underlyingAddress!, amountBig, address!, 0] });
                            } else {
                                writeContract({ address: RADIANT_LENDING_POOL, abi: RADIANT_POOL_ABI, functionName: 'deposit', args: [underlyingAddress!, amountBig, address!, 0] });
                            }
                        }
                    }
                }
            } else { // activeTab === 'withdraw'
                // --- WITHDRAW ---
                if (isVenus) {
                    if (vTokenAddress) {
                        // Check collateral impact...
                        const collateralInfo = collateral as any; // Cast to avoid type error if needed, or use specific type
                        if (collateralInfo?.isCollateral && maxWithdrawable && parseFloat(amount) > maxWithdrawable) {
                            toast({
                                title: "Cannot Withdraw",
                                description: "This withdrawal would put your account underwater. Repay some debt first.",
                                variant: "destructive"
                            });
                            setStep('idle');
                            return;
                        }

                        if (isNative) {
                            writeContract({ address: vTokenAddress, abi: VBNB_ABI, functionName: 'redeemUnderlying', args: [amountBig] });
                        } else {
                            writeContract({ address: vTokenAddress, abi: VTOKEN_ABI, functionName: 'redeemUnderlying', args: [amountBig] });
                        }
                    }
                } else if (isKinza || isRadiant) {
                    const poolAddress = isKinza ? KINZA_POOL : RADIANT_LENDING_POOL;

                    if (isNative) {
                        // Native Withdraw via Gateway
                        const gatewayAddress = isKinza ? KINZA_GATEWAY : RADIANT_GATEWAY;
                        if (gatewayAddress) {
                            writeContract({
                                address: gatewayAddress,
                                abi: WETH_GATEWAY_ABI,
                                functionName: 'withdrawETH',
                                args: [poolAddress, amountBig, address!]
                            });
                        }
                    } else {
                        // ERC20 Withdraw
                        if (isKinza) {
                            writeContract({ address: KINZA_POOL, abi: KINZA_POOL_ABI, functionName: 'withdraw', args: [underlyingAddress!, amountBig, address!] });
                        } else {
                            writeContract({ address: RADIANT_LENDING_POOL, abi: RADIANT_POOL_ABI, functionName: 'withdraw', args: [underlyingAddress!, amountBig, address!] });
                        }
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
    }, [amount, activeTab, isConnected, isNative, isVenus, isKinza, isRadiant, address, vTokenAddress, underlyingAddress, approvalTarget, currentAllowance, decimals, step, refetchAllowance, refetchVenus, refetchKinza, refetchRadiant]);

    // =========================================================================
    //                           MAX / HALF
    // =========================================================================
    // =========================================================================
    //                           MAX / HALF
    // =========================================================================
    const isWithdrawBlocked = activeTab === 'withdraw' && isVenus && (collateral as any)?.isCollateral && (collateral as any)?.borrowBalance > 0;
    const maxWithdrawable = isVenus && collateral.isCollateral ? collateral.maxWithdrawable : depositedAmount;

    const setHalf = () => {
        const base = activeTab === 'deposit' ? walletBalance : maxWithdrawable;
        setAmount((base / 2).toString());
    };
    const setMax = () => {
        if (activeTab === 'deposit') {
            const max = isNative && walletBalance > 0.01 ? walletBalance - 0.01 : walletBalance;
            setAmount(max.toString());
        } else {
            setAmount(maxWithdrawable.toString());
        }
    };

    const amountNum = parseFloat(amount || '0');
    const isButtonDisabled = !amount || amountNum <= 0 || step === 'mining' || step === 'approving' || step === 'success' || isWithdrawBlocked;

    const protocolDisplay = isVenus ? 'Venus' : isKinza ? 'Kinza' : isRadiant ? 'Radiant' : pool.project;

    // =========================================================================
    //                              UI
    // =========================================================================
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[420px] bg-[#09090b] border-white/10 text-white p-0 gap-0 overflow-hidden rounded-3xl">
                {/* Header */}
                <div className="p-6 pb-4">
                    <div className="flex items-center gap-3">
                        <AssetIcon symbol={pool.symbol} className="w-10 h-10" />
                        <div>
                            <h2 className="text-xl font-bold">{pool.symbol}</h2>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="uppercase">{protocolDisplay}</span>
                                <span className="w-1 h-1 bg-white/20 rounded-full" />
                                <span className="text-emerald-400">Earn</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="px-6 mb-6">
                    <div className="bg-[#121216] border border-white/5 rounded-2xl p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-[10px] uppercase text-muted-foreground font-bold mb-1">Deposited</div>
                                <div className="text-lg font-bold font-mono">{formatSmallNumber(depositedAmount)} {pool.symbol}</div>
                                <div className="text-[10px] text-muted-foreground">≈ {formatMoney(depositedAmountUSD)}</div>
                            </div>
                            <div className="text-right">
                                {isVenus && (
                                    <>
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
                                    </>
                                )}
                                {!isVenus && (
                                    <>
                                        <div className="text-[10px] uppercase text-muted-foreground font-bold mb-1">Protocol</div>
                                        <div className="text-sm text-muted-foreground">{protocolDisplay}</div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="h-[1px] bg-white/5" />

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">APY <ArrowUpDown className="w-3 h-3" /></span>
                                <span className="text-emerald-400 font-bold font-mono text-sm bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                                    {pool.apy.toFixed(2)}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Vault TVL</span>
                                <span className="text-white font-bold text-sm">{formatMoney(pool.tvlUsd)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Debt warning (Venus collateral) */}
                {activeTab === 'withdraw' && isWithdrawBlocked && (
                    <div className="px-6 mb-4">
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <div className="text-sm font-bold text-red-400 mb-1">Active Debt Prevents Withdrawal</div>
                                <div className="text-xs text-red-300/80 mb-2">
                                    This collateral backs a debt of {formatSmallNumber(collateral.borrowBalance)} ({formatMoney(collateral.borrowBalanceUSD)}).
                                    Repay your debt first.
                                </div>
                                <a href="/lend/borrow" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-500/30 transition-colors">
                                    <ExternalLink className="w-3.5 h-3.5" />Go to Repay Debt
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="px-6 mb-4">
                    <div className="bg-[#121216] rounded-xl p-1 flex relative">
                        <motion.div
                            className="absolute top-1 bottom-1 bg-[#1a1a20] rounded-lg shadow-sm"
                            initial={false}
                            animate={{ left: activeTab === 'deposit' ? '4px' : '50%', width: 'calc(50% - 4px)' }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                        <button onClick={() => { setActiveTab('deposit'); setAmount(''); resetWrite(); setStep('idle'); }} className={`flex-1 relative z-10 py-2 text-sm font-bold transition-colors ${activeTab === 'deposit' ? 'text-white' : 'text-muted-foreground hover:text-white/70'}`}>Deposit</button>
                        <button onClick={() => { setActiveTab('withdraw'); setAmount(''); resetWrite(); setStep('idle'); }} className={`flex-1 relative z-10 py-2 text-sm font-bold transition-colors ${activeTab === 'withdraw' ? 'text-white' : 'text-muted-foreground hover:text-white/70'}`}>Withdraw</button>
                    </div>
                </div>

                {/* Input */}
                <div className="px-6 pb-6">
                    <div className="bg-[#121216] border border-white/5 rounded-2xl p-4 mb-4">
                        <div className="flex justify-between text-xs text-muted-foreground mb-3 uppercase font-bold tracking-wider">
                            <span>{activeTab === 'deposit' ? 'Deposit Amount' : 'Withdraw Amount'}</span>
                            <div className="flex gap-2">
                                <span>
                                    {activeTab === 'deposit' ? 'Wallet' : 'Available'}:{' '}
                                    {formatSmallNumber(activeTab === 'deposit' ? walletBalance : maxWithdrawable)} {pool.symbol}
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
                                type="number" placeholder="0.00"
                                className="bg-transparent text-right text-2xl font-mono font-bold w-full outline-none placeholder:text-muted-foreground/30 text-white"
                                value={amount} onChange={(e) => setAmount(e.target.value)}
                                disabled={isWithdrawBlocked}
                            />
                        </div>
                        <div className="text-right text-xs text-muted-foreground mt-2">
                            ≈ {formatMoney(amountNum * tokenPrice)}
                        </div>

                        {/* Write error display */}
                        {writeError && step === 'idle' && (
                            <div className="text-xs text-red-400 mt-2 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {writeError.message.slice(0, 100)}
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    <Button
                        onClick={handleAction}
                        disabled={isButtonDisabled}
                        className={`w-full h-14 text-lg font-bold rounded-xl relative overflow-hidden transition-all ${step === 'success' ? 'bg-emerald-500 hover:bg-emerald-500' :
                            activeTab === 'deposit' ? 'bg-[#CEFF00] hover:bg-[#b5e000] text-black' :
                                'bg-white hover:bg-gray-200 text-black'
                            }`}
                    >
                        <AnimatePresence mode="wait">
                            {step === 'idle' && (
                                <motion.span key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                    {!isConnected ? 'Connect to Deposit' : isWithdrawBlocked ? '🔒 Repay Debt First' : activeTab === 'deposit' ? 'Deposit' : 'Withdraw'}
                                </motion.span>
                            )}
                            {step === 'approving' && (
                                <motion.div key="approving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" /><span>Approving...</span>
                                </motion.div>
                            )}
                            {step === 'mining' && (
                                <motion.div key="mining" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" /><span>Processing...</span>
                                </motion.div>
                            )}
                            {step === 'success' && (
                                <motion.div key="success" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 text-white">
                                    <div className="bg-white text-emerald-500 rounded-full p-1"><Check className="w-4 h-4 stroke-[4]" /></div><span>Success!</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
