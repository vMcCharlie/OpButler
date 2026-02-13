"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AssetIcon } from "@/components/ui/asset-icon";
import { Loader2, Check, ArrowUpDown, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance } from "wagmi";
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
import { useVenusPortfolio } from "@/hooks/useVenusPortfolio";
import { useKinzaPortfolio } from "@/hooks/useKinzaPortfolio";
import { useRadiantPortfolio } from "@/hooks/useRadiantPortfolio";

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
        userBorrowed?: number;
        userBorrowedUSD?: number;
    };
}

export function BorrowModal({ isOpen, onClose, pool }: BorrowModalProps) {
    const { isConnected, address } = useAccount();
    const { openConnectModal } = useConnectModal();
    const [amount, setAmount] = useState("");
    const [activeTab, setActiveTab] = useState<"borrow" | "repay">("borrow");
    const [step, setStep] = useState<"idle" | "approving" | "mining" | "success">("idle");

    // Protocol detection
    const isVenus = pool.project === 'venus';
    const isKinza = pool.project === 'kinza-finance';
    const isRadiant = pool.project === 'radiant-v2';
    const isNative = pool.symbol === 'BNB' || pool.symbol === 'WBNB';
    const decimals = getTokenDecimals(pool.symbol);
    const vTokenAddress = isVenus ? VENUS_VTOKENS[pool.symbol] : undefined;
    const underlyingAddress = getUnderlyingAddress(pool.symbol, pool.project);
    const approvalTarget = getApprovalTarget(pool.project, pool.symbol);
    const protocolDisplay = isVenus ? 'Venus' : isKinza ? 'Kinza' : isRadiant ? 'Radiant' : pool.project;

    // Prices
    const { data: prices } = useTokenPrices();
    const tokenPrice = prices ? prices.getPrice(pool.symbol) : 0;

    // Portfolio data for borrowed amount
    const { positions: venusPositions = [] } = useVenusPortfolio();
    const { positions: kinzaPositions = [] } = useKinzaPortfolio();
    const { positions: radiantPositions = [] } = useRadiantPortfolio();

    let borrowedAmount = 0;
    let borrowedAmountUSD = 0;
    const findPosition = (positions: any[]) => positions.find((p: any) => p.symbol === pool.symbol);

    if (isVenus) {
        const pos = findPosition(venusPositions);
        borrowedAmount = pos?.borrow || 0;
        borrowedAmountUSD = pos?.borrowUSD || 0;
    } else if (isKinza) {
        const pos = findPosition(kinzaPositions);
        borrowedAmount = pos?.borrow || 0;
        borrowedAmountUSD = pos?.borrowUSD || 0;
    } else if (isRadiant) {
        const pos = findPosition(radiantPositions);
        borrowedAmount = pos?.borrow || 0;
        borrowedAmountUSD = pos?.borrowUSD || 0;
    }

    // Fallback to passed props if hooks return 0 (e.g. initial load)
    if (borrowedAmount === 0 && pool.userBorrowed && pool.userBorrowed > 0) {
        borrowedAmount = pool.userBorrowed;
        borrowedAmountUSD = pool.userBorrowedUSD || (borrowedAmount * tokenPrice);
    }

    // Wallet Balance (for repay)
    const { data: nativeBalance } = useBalance({ address, query: { enabled: !!address && isNative } });
    const { data: tokenBalanceRaw } = useReadContract({
        address: underlyingAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address && !isNative && !!underlyingAddress }
    });

    let walletBalance = 0;
    if (isNative && nativeBalance) walletBalance = parseFloat(nativeBalance.formatted);
    else if (tokenBalanceRaw) walletBalance = parseFloat(formatUnits(tokenBalanceRaw, decimals));

    // Allowance (for repay ERC20)
    const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
        address: underlyingAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address && approvalTarget ? [address, approvalTarget] : undefined,
        query: { enabled: !!address && !isNative && !!underlyingAddress && !!approvalTarget && activeTab === 'repay' }
    });

    // Transaction hooks
    const { writeContract, data: hash, isPending, error: writeError, reset: resetWrite } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        if (isConfirmed) {
            if (step === 'approving') {
                setStep('idle');
                refetchAllowance();
            } else {
                setStep("success");
            }
        } else if (isConfirming || isPending) {
            if (step !== 'approving') setStep("mining");
        }
    }, [isConfirmed, isConfirming, isPending]);

    const handleAction = useCallback(() => {
        if (!isConnected) { openConnectModal?.(); return; }

        const amountNum = parseFloat(amount || '0');
        if (amountNum <= 0) return;

        const amountBig = parseUnits(amount, decimals);
        const wbnbAddress = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as `0x${string}`;

        try {
            if (activeTab === 'borrow') {
                // --- BORROW ---
                if (isVenus && vTokenAddress) {
                    if (isNative) {
                        writeContract({ address: vTokenAddress, abi: VBNB_ABI, functionName: 'borrow', args: [amountBig] });
                    } else {
                        writeContract({ address: vTokenAddress, abi: VTOKEN_ABI, functionName: 'borrow', args: [amountBig] });
                    }
                } else if (isKinza || isRadiant) {
                    const poolAddress = isKinza ? KINZA_POOL : RADIANT_LENDING_POOL;

                    if (isNative) {
                        // Native Borrow via Gateway
                        const gatewayAddress = isKinza ? KINZA_GATEWAY : RADIANT_GATEWAY;
                        if (gatewayAddress) {
                            writeContract({
                                address: gatewayAddress,
                                abi: WETH_GATEWAY_ABI,
                                functionName: 'borrowETH',
                                args: [poolAddress, amountBig, BigInt(2), 0]
                            });
                        }
                    } else {
                        // ERC20 Borrow
                        const abi = isKinza ? KINZA_POOL_ABI : RADIANT_POOL_ABI;
                        if (isKinza) {
                            writeContract({ address: KINZA_POOL, abi: KINZA_POOL_ABI, functionName: 'borrow', args: [underlyingAddress!, amountBig, BigInt(2), 0, address!] });
                        } else {
                            writeContract({ address: RADIANT_LENDING_POOL, abi: RADIANT_POOL_ABI, functionName: 'borrow', args: [underlyingAddress!, amountBig, BigInt(2), 0, address!] });
                        }
                    }
                }
            } else {
                // --- REPAY ---
                // Check approval first (ERC20 only)
                // Note: repayETH is payable, so no approval needed for the repayer (user).
                if (!isNative && underlyingAddress && approvalTarget) {
                    const allowance = currentAllowance || BigInt(0);
                    if (allowance < amountBig) {
                        setStep('approving');
                        writeContract({
                            address: underlyingAddress,
                            abi: ERC20_ABI,
                            functionName: 'approve',
                            args: [approvalTarget, maxUint256]
                        });
                        return;
                    }
                }

                if (isVenus && vTokenAddress) {
                    if (isNative) {
                        writeContract({ address: vTokenAddress, abi: VBNB_ABI, functionName: 'repayBorrow', value: amountBig });
                    } else {
                        writeContract({ address: vTokenAddress, abi: VTOKEN_ABI, functionName: 'repayBorrow', args: [amountBig] });
                    }
                } else if (isKinza || isRadiant) {
                    const poolAddress = isKinza ? KINZA_POOL : RADIANT_LENDING_POOL;

                    if (isNative) {
                        // Native Repay via Gateway
                        const gatewayAddress = isKinza ? KINZA_GATEWAY : RADIANT_GATEWAY;
                        if (gatewayAddress) {
                            writeContract({
                                address: gatewayAddress,
                                abi: WETH_GATEWAY_ABI,
                                functionName: 'repayETH',
                                args: [poolAddress, amountBig, BigInt(2), address!],
                                value: amountBig
                            });
                        }
                    } else {
                        // ERC20 Repay
                        const assetAddr = underlyingAddress!;
                        if (isKinza) {
                            writeContract({ address: KINZA_POOL, abi: KINZA_POOL_ABI, functionName: 'repay', args: [assetAddr, amountBig, BigInt(2), address!] });
                        } else {
                            writeContract({ address: RADIANT_LENDING_POOL, abi: RADIANT_POOL_ABI, functionName: 'repay', args: [assetAddr, amountBig, BigInt(2), address!] });
                        }
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
    }, [amount, activeTab, isConnected, isNative, isVenus, isKinza, isRadiant, address, vTokenAddress, underlyingAddress, approvalTarget, currentAllowance, decimals]);

    // MAX / HALF
    const repayMax = Math.min(walletBalance, borrowedAmount);
    const setHalf = () => {
        if (activeTab === 'repay') setAmount((repayMax / 2).toString());
    };
    const setMax = () => {
        if (activeTab === 'repay') {
            const max = isNative && repayMax > 0.01 ? repayMax - 0.01 : repayMax;
            setAmount(max.toString());
        }
    };

    const isButtonDisabled = !amount || parseFloat(amount) <= 0 || step === 'mining' || step === 'approving' || step === 'success';
    const borrowApy = (pool.apyBaseBorrow || 0) + (pool.apyRewardBorrow || 0);
    const availableLiquidity = (pool.tvlUsd || 0) - (pool.totalBorrowUsd || 0);

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
                                <span className="text-blue-400">Borrow Market</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="px-6 mb-6">
                    <div className="bg-[#121216] border border-white/5 rounded-2xl p-4 grid grid-cols-2 gap-y-4 gap-x-8">
                        <div>
                            <div className="text-[10px] uppercase text-blue-400 font-bold mb-1">Your Debt</div>
                            <div className="text-lg font-mono text-blue-400">
                                {borrowedAmount > 0 ? <>{formatSmallNumber(borrowedAmount)} {pool.symbol}</> : '0'}
                            </div>
                            <div className="text-[10px] text-muted-foreground">≈ {formatMoney(borrowedAmountUSD)}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] uppercase text-muted-foreground font-bold mb-1">Health Factor</div>
                            <div className="text-lg font-bold font-mono text-emerald-400">
                                {borrowedAmount > 0 ? 'Monitor' : 'Safe'}
                            </div>
                        </div>

                        <div className="col-span-2 h-[1px] bg-white/5 my-1" />

                        <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">Borrow APY <ArrowUpDown className="w-3 h-3" /></span>
                            <span className="text-blue-400 font-bold font-mono text-sm bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20">
                                -{borrowApy.toFixed(2)}%
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Available Liquidity</span>
                            <span className="text-white font-bold text-sm">{formatMoney(availableLiquidity)}</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-6 mb-4">
                    <div className="bg-[#121216] rounded-xl p-1 flex relative">
                        <motion.div
                            className="absolute top-1 bottom-1 bg-[#1a1a20] rounded-lg shadow-sm"
                            initial={false}
                            animate={{ left: activeTab === 'borrow' ? '4px' : '50%', width: 'calc(50% - 4px)' }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                        <button onClick={() => { setActiveTab('borrow'); setAmount(''); resetWrite(); setStep('idle'); }} className={`flex-1 relative z-10 py-2 text-sm font-bold transition-colors ${activeTab === 'borrow' ? 'text-white' : 'text-muted-foreground'}`}>Borrow</button>
                        <button onClick={() => { setActiveTab('repay'); setAmount(''); resetWrite(); setStep('idle'); }} className={`flex-1 relative z-10 py-2 text-sm font-bold transition-colors ${activeTab === 'repay' ? 'text-white' : 'text-muted-foreground'}`}>Repay</button>
                    </div>
                </div>

                {/* Input */}
                <div className="px-6 pb-6">
                    <div className="bg-[#121216] border border-white/5 rounded-2xl p-4 mb-4">
                        <div className="flex justify-between text-xs text-muted-foreground mb-3 uppercase font-bold tracking-wider">
                            <span>{activeTab === 'borrow' ? 'Borrow Amount' : 'Repay Amount'}</span>
                            <div className="flex gap-2">
                                <span>
                                    {activeTab === 'repay' ? 'Wallet' : 'Available'}:{' '}
                                    {formatSmallNumber(
                                        activeTab === 'repay' ? walletBalance :
                                            availableLiquidity / (tokenPrice || 1)
                                    )} {pool.symbol}
                                </span>
                                {activeTab === 'repay' && (
                                    <div className="flex gap-1">
                                        <button className="text-[10px] bg-white/10 hover:bg-white/20 px-1.5 rounded transition-colors" onClick={setHalf}>HALF</button>
                                        <button className="text-[10px] bg-white/10 hover:bg-white/20 px-1.5 rounded transition-colors" onClick={setMax}>MAX</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-black/40 px-2 py-1.5 rounded-lg border border-white/5">
                                <AssetIcon symbol={pool.symbol} className="w-6 h-6" />
                                <span className="font-bold text-sm">{pool.symbol}</span>
                            </div>
                            <input type="number" placeholder="0.00" className="bg-transparent text-right text-2xl font-mono font-bold w-full outline-none text-white placeholder:text-muted-foreground/30" value={amount} onChange={(e) => setAmount(e.target.value)} />
                        </div>
                        <div className="text-right text-xs text-muted-foreground mt-2">
                            ≈ {formatMoney(parseFloat(amount || '0') * tokenPrice)}
                        </div>

                        {writeError && step === 'idle' && (
                            <div className="text-xs text-red-400 mt-2 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {writeError.message.slice(0, 100)}
                            </div>
                        )}
                    </div>

                    <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-yellow-200">
                            {activeTab === 'borrow'
                                ? 'Ensure you manage your health factor. If it drops below 1.0, you may be liquidated.'
                                : 'Repaying reduces your debt and improves your health factor.'}
                        </div>
                    </div>

                    {/* Action Button */}
                    <Button
                        onClick={handleAction}
                        disabled={isButtonDisabled}
                        className={`w-full h-14 text-lg font-bold rounded-xl relative overflow-hidden transition-all ${step === 'success' ? 'bg-emerald-500 hover:bg-emerald-500' :
                            activeTab === 'borrow' ? 'bg-blue-500 hover:bg-blue-600 text-white' :
                                'bg-white hover:bg-gray-200 text-black'
                            }`}
                    >
                        <AnimatePresence mode="wait">
                            {step === 'idle' && (
                                <motion.span key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                    {isConnected ? (activeTab === 'borrow' ? 'Borrow' : 'Repay') : 'Connect Wallet'}
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
