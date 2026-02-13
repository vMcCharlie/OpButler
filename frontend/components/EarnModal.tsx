"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AssetIcon } from "@/components/ui/asset-icon";
import { Loader2, Check, ArrowUpDown, AlertTriangle, Shield, ExternalLink, ArrowRight, ShieldAlert, X } from "lucide-react";
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
import { formatMoney, formatSmallNumber, getTokenDecimals, toPlainString, cn } from "@/lib/utils";
import { useTokenPrices } from "@/hooks/useTokenPrices";
import { useVenusCollateral } from "@/hooks/useVenusCollateral";
import { useAggregatedHealth } from "@/hooks/useAggregatedHealth";

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
        ltv?: number;
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
    const { data: balanceData, refetch: refetchBalance } = useBalance({
        address,
        query: { enabled: !!address && isNative }
    });

    const { data: tokenBalanceRaw, refetch: refetchToken } = useReadContract({
        address: underlyingAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address && !isNative && !!underlyingAddress }
    });

    let walletBalance = 0;
    if (isNative && balanceData) {
        walletBalance = parseFloat(balanceData.formatted);
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

    if (depositedAmount === 0 && pool.userDeposited && pool.userDeposited > 0) {
        depositedAmount = pool.userDeposited;
    }
    depositedAmountUSD = depositedAmount * tokenPrice;

    // =========================================================================
    //                       HEALTH & SAFETY
    // =========================================================================
    const { venus, kinza, radiant, isLoading: isHealthLoading, refetch: refetchHealth } = useAggregatedHealth();
    const activeHealth = isVenus ? venus : isKinza ? kinza : radiant;

    const protocolDebt = activeHealth.debtUSD;
    const protocolPowerUSD = activeHealth.borrowPowerUSD;
    const assetLTV = pool.ltv || 0.7;

    const safeWithdrawPower = Math.max(0, protocolPowerUSD - (protocolDebt / 0.95));
    const safeMaxWithdrawAmount = assetLTV > 0 ? safeWithdrawPower / (assetLTV * tokenPrice) : depositedAmount;
    const maxSafe = Math.min(depositedAmount, safeMaxWithdrawAmount);

    const withdrawAmount = parseFloat(amount) || 0;
    const withdrawUSD = withdrawAmount * tokenPrice;

    const newHF = useMemo(() => {
        if (!withdrawUSD && !amount) return activeHealth.healthFactor || 10;

        const changeUSD = (parseFloat(amount) || 0) * tokenPrice;
        if (changeUSD <= 0) return activeHealth.healthFactor || 10;

        let newPower = protocolPowerUSD;
        let newDebt = protocolDebt;

        if (activeTab === 'deposit') {
            newPower += changeUSD * assetLTV;
        } else {
            newPower = Math.max(0, protocolPowerUSD - (changeUSD * assetLTV));
        }

        if (newDebt <= 0) return 10;
        return newPower / newDebt;
    }, [activeTab, protocolPowerUSD, protocolDebt, amount, assetLTV, activeHealth.healthFactor, tokenPrice]);

    const isRisky = newHF < 1.1;

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
                setStep('idle');
                refetchAllowance();
            } else {
                setStep("success");
                refetchVenus?.();
                refetchKinza?.();
                refetchRadiant?.();
                refetchBalance?.();
                refetchToken?.();
                refetchHealth?.();
            }
        } else if (isConfirming || isPending) {
            if (step !== 'approving') setStep("mining");
        }
    }, [isConfirmed, isConfirming, isPending, step, refetchAllowance, refetchVenus, refetchKinza, refetchRadiant, refetchBalance, refetchToken, refetchHealth]);

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
                const needsApproval = !isNative && underlyingAddress && approvalTarget && (currentAllowance || BigInt(0)) < amountBig;

                if (isVenus) {
                    if (isNative && vTokenAddress) {
                        writeContract({ address: vTokenAddress, abi: VBNB_ABI, functionName: 'mint', value: amountBig });
                    } else if (!isNative && vTokenAddress) {
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
            } else {
                if (isVenus) {
                    if (vTokenAddress) {
                        if (collateral?.isCollateral && parseFloat(amount) > (collateral.maxWithdrawable || 0)) {
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
    }, [amount, activeTab, isConnected, isNative, isVenus, isKinza, isRadiant, address, vTokenAddress, underlyingAddress, approvalTarget, currentAllowance, decimals, step, refetchAllowance, refetchVenus, refetchKinza, refetchRadiant, toast, collateral]);

    // =========================================================================
    //                           MAX / HALF
    // =========================================================================
    const isWithdrawBlocked = activeTab === 'withdraw' && isVenus && collateral.isCollateral && collateral.borrowBalance > 0 && collateral.maxWithdrawable === 0;
    const maxWithdrawableAvailable = isVenus && collateral.isCollateral ? collateral.maxWithdrawable : depositedAmount;

    const setHalf = () => {
        const base = activeTab === 'deposit' ? walletBalance : maxWithdrawableAvailable;
        setAmount(toPlainString(base / 2));
    };
    const setMax = () => {
        if (activeTab === 'deposit') {
            const max = isNative && walletBalance > 0.01 ? walletBalance - 0.01 : walletBalance;
            setAmount(toPlainString(max));
        } else {
            setAmount(toPlainString(maxWithdrawableAvailable));
        }
    };

    const amountNum = parseFloat(amount || '0');
    const isButtonDisabled = !amount || amountNum <= 0 || step === 'mining' || step === 'approving' || step === 'success' || isWithdrawBlocked;
    const protocolDisplay = isVenus ? 'Venus' : isKinza ? 'Kinza' : isRadiant ? 'Radiant' : pool.project;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[95vw] sm:max-w-[420px] max-h-[90vh] overflow-y-auto bg-[#09090b] border-white/10 text-white p-0 gap-0 rounded-3xl scrollbar-hide">
                <div className="p-4 md:p-6 pb-2 md:pb-4 border-b border-white/5 bg-[#09090b] sticky top-0 z-20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AssetIcon symbol={pool.symbol} className="w-8 h-8 md:w-10 md:h-10" />
                            <div>
                                <h2 className="text-lg md:text-xl font-bold">{pool.symbol}</h2>
                                <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted-foreground">
                                    <span className="uppercase">{protocolDisplay}</span>
                                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                                    <span className="text-emerald-400 font-medium">Earn Market</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-muted-foreground hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="px-4 md:px-6 pt-4 md:pt-6 mb-4 md:mb-6">
                    <div className="bg-[#121216] border border-white/5 rounded-2xl p-3 md:p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-[9px] md:text-[10px] uppercase text-muted-foreground font-bold mb-1">Deposited</div>
                                <div className="text-base md:text-lg font-bold font-mono tracking-tight">{formatSmallNumber(depositedAmount)} {pool.symbol}</div>
                                <div className="text-[9px] md:text-[10px] text-muted-foreground">≈ {formatMoney(depositedAmountUSD)}</div>
                            </div>
                            <div className="text-right">
                                {isVenus && (
                                    <>
                                        <div className="text-[9px] md:text-[10px] uppercase text-muted-foreground font-bold mb-1">Collateral</div>
                                        {collateral.isLoading ? (
                                            <div className="text-[10px] text-muted-foreground uppercase">Loading...</div>
                                        ) : collateral.isCollateral ? (
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Shield className="w-3 md:w-3.5 h-3 md:h-3.5 text-amber-400" />
                                                <span className="text-[11px] md:text-sm font-bold text-amber-400">Active</span>
                                            </div>
                                        ) : (
                                            <div className="text-[11px] md:text-sm text-muted-foreground">Disabled</div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="h-[1px] bg-white/5" />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] md:text-xs text-muted-foreground">APY</span>
                                <span className="text-emerald-400 font-bold font-mono text-[11px] md:text-sm bg-emerald-400/10 px-1.5 md:px-2 py-0.5 rounded-full border border-emerald-400/20">
                                    {pool.apy.toFixed(2)}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-tighter">Vault TVL</span>
                                <span className="text-white font-bold text-[11px] md:text-sm">{formatMoney(pool.tvlUsd)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-4 md:px-6 mb-4">
                    <div className="bg-[#121216] rounded-xl p-1 flex relative">
                        <motion.div
                            className="absolute top-1 bottom-1 bg-[#1a1a20] rounded-lg shadow-sm"
                            initial={false}
                            animate={{ left: activeTab === 'deposit' ? '4px' : '50%', width: 'calc(50% - 4px)' }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                        <button onClick={() => { setActiveTab('deposit'); setAmount(''); resetWrite(); setStep('idle'); }} className={`flex-1 relative z-10 py-1.5 md:py-2 text-sm font-bold transition-colors ${activeTab === 'deposit' ? 'text-white' : 'text-muted-foreground hover:text-white/70'}`}>Deposit</button>
                        <button onClick={() => { setActiveTab('withdraw'); setAmount(''); resetWrite(); setStep('idle'); }} className={`flex-1 relative z-10 py-1.5 md:py-2 text-sm font-bold transition-colors ${activeTab === 'withdraw' ? 'text-white' : 'text-muted-foreground hover:text-white/70'}`}>Withdraw</button>
                    </div>
                </div>

                <div className="px-4 md:px-6 pb-6">
                    <div className="bg-[#121216] border border-white/5 rounded-2xl p-3 md:p-4 mb-4">
                        <div className="flex justify-between text-[9px] md:text-xs text-muted-foreground mb-3 uppercase font-bold tracking-wider">
                            <span>{activeTab === 'deposit' ? 'Deposit Amount' : 'Withdraw Amount'}</span>
                            <div className="flex gap-2">
                                {activeTab === 'withdraw' && (
                                    <button
                                        onClick={() => setAmount(toPlainString(maxSafe))}
                                        className="text-[9px] md:text-[10px] text-[#CEFF00] font-bold border border-[#CEFF00]/30 px-2 py-0.5 rounded hover:bg-[#CEFF00]/10"
                                    >
                                        SAFE MAX
                                    </button>
                                )}
                                <div className="flex gap-1">
                                    <button className="text-[9px] md:text-[10px] bg-white/10 hover:bg-white/20 px-1.5 rounded transition-colors" onClick={setHalf}>HALF</button>
                                    <button className="text-[9px] md:text-[10px] bg-white/10 hover:bg-white/20 px-1.5 rounded transition-colors" onClick={setMax}>MAX</button>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4">
                            <div className="flex items-center gap-1.5 md:gap-2 bg-black/40 px-1.5 md:px-2 py-1 md:py-1.5 rounded-lg border border-white/5 flex-shrink-0">
                                <AssetIcon symbol={pool.symbol} className="w-5 h-5 md:w-6 md:h-6" />
                                <span className="font-bold text-xs md:text-sm">{pool.symbol}</span>
                            </div>
                            <input
                                type="number" placeholder="0.00"
                                className="bg-transparent text-right text-xl md:text-2xl font-mono font-bold w-full outline-none placeholder:text-muted-foreground/30 text-white"
                                value={amount} onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-between items-center text-[10px] md:text-xs mt-2">
                            <div className="text-muted-foreground/60 font-medium">
                                {activeTab === 'deposit' ? 'Wallet: ' : 'Available: '}
                                <span className="text-white font-bold ml-1">
                                    {formatSmallNumber(activeTab === 'deposit' ? walletBalance : maxWithdrawableAvailable)} {pool.symbol}
                                </span>
                            </div>
                            <div className="text-muted-foreground">
                                ≈ {formatMoney(amountNum * tokenPrice)}
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#121216] border border-white/5 rounded-2xl p-3 md:p-4 space-y-2 md:space-y-3 mb-4">
                        <div className="flex justify-between items-center text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                            <span>{activeTab === 'deposit' ? 'Asset Quality & Impact' : 'Transaction Impact'}</span>
                        </div>

                        <div className="flex justify-between items-center w-full">
                            <span className="text-[10px] md:text-xs text-muted-foreground font-medium">
                                {activeTab === 'deposit' ? 'Collateral Buffer' : 'Health Factor'}
                            </span>
                            {activeTab === 'deposit' ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs md:text-sm font-bold text-[#CEFF00]">{((pool.ltv || 0) * 100).toFixed(0)}% LTV</span>
                                    {(parseFloat(amount) || 0) > 0 && (
                                        <>
                                            <ArrowRight className="w-2.5 h-2.5 md:w-3 md:h-3 text-muted-foreground/30" />
                                            <span className="text-[10px] md:text-xs font-bold text-white/60">HF: {newHF > 5 ? '> 5.0' : newHF.toFixed(2)}</span>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] md:text-xs font-bold text-white/40">{(activeHealth.healthFactor || 10) > 5 ? '5.0' : activeHealth.healthFactor.toFixed(2)}</span>
                                    <ArrowRight className="w-2.5 h-2.5 md:w-3 md:h-3 text-muted-foreground/30" />
                                    <span className={cn(
                                        "text-xs md:text-sm font-bold",
                                        newHF < 1.1 ? "text-red-400" : newHF < 1.5 ? "text-amber-400" : "text-[#CEFF00]"
                                    )}>
                                        {newHF > 5 ? '> 5.0' : (newHF || 0).toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {((activeTab === 'withdraw' && withdrawUSD > 0) || (activeTab === 'deposit' && (parseFloat(amount) || 0) > 0)) && (
                            <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    className={cn(
                                        "h-full bg-gradient-to-r",
                                        activeTab === 'deposit' ? "from-emerald-600 to-[#CEFF00]" : (newHF < 1.1 ? "from-red-500 to-orange-500" : "from-[#CEFF00] to-emerald-400")
                                    )}
                                    initial={{ width: 0 }}
                                    animate={{ width: activeTab === 'deposit' ? '100%' : `${Math.min(100, (1 / (newHF || 1)) * 100)}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                        )}

                        <div className="flex justify-between w-full text-[10px] md:text-xs items-center pt-1 border-t border-white/5">
                            <span className="text-muted-foreground">Earning APY</span>
                            <span className="text-emerald-400 font-mono font-bold">{pool.apy.toFixed(2)}%</span>
                        </div>
                    </div>

                    {isRisky && activeTab === 'withdraw' && (
                        <div className="p-2 md:p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-2 md:gap-3 items-start mb-4">
                            <ShieldAlert className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-[10px] md:text-[11px] text-red-200">
                                Warning: This withdrawal will put your account at risk of liquidation.
                                Repay some debt or leave more collateral to stay safe.
                            </p>
                        </div>
                    )}

                    <Button
                        onClick={handleAction}
                        disabled={isButtonDisabled}
                        className={`w-full h-12 md:h-14 text-base md:text-lg font-bold rounded-xl md:rounded-2xl transition-all ${step === 'success' ? 'bg-emerald-500 hover:bg-emerald-500' :
                            activeTab === 'deposit' ? 'bg-[#CEFF00] hover:bg-[#b5e000] text-black shadow-[0_0_20px_rgba(206,255,0,0.15)]' :
                                'bg-white hover:bg-gray-200 text-black shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                            }`}
                    >
                        <AnimatePresence mode="wait">
                            {step === 'idle' && (
                                <motion.span key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                    {!isConnected ? 'Connect Wallet' : activeTab === 'deposit' ? 'Deposit' : 'Withdraw'}
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
