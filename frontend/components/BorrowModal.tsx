"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AssetIcon } from "@/components/ui/asset-icon";
import { Loader2, Check, ArrowUpDown, AlertTriangle, ShieldAlert, ArrowRight, Info, X } from "lucide-react";
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
import { formatMoney, formatSmallNumber, getTokenDecimals, toPlainString, cn } from "@/lib/utils";
import { useTokenPrices } from "@/hooks/useTokenPrices";
import { useVenusPortfolio } from "@/hooks/useVenusPortfolio";
import { useKinzaPortfolio } from "@/hooks/useKinzaPortfolio";
import { useRadiantPortfolio } from "@/hooks/useRadiantPortfolio";
import { useToast } from "@/components/ui/use-toast";
import { useAggregatedHealth } from "@/hooks/useAggregatedHealth";

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

interface BorrowModalContentProps {
    onClose: () => void;
    pool: any;
    isEmbedded?: boolean;
}

export function BorrowModalContent({ onClose, pool, isEmbedded = false }: BorrowModalContentProps) {
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
    const price = tokenPrice;

    // Portfolio data
    const { positions: venusPositions = [], refetch: refetchVenus } = useVenusPortfolio();
    const { positions: kinzaPositions = [], refetch: refetchKinza } = useKinzaPortfolio();
    const { positions: radiantPositions = [], refetch: refetchRadiant } = useRadiantPortfolio();

    let borrowedAmount = 0;
    let borrowedAmountUSD = 0;
    const findPosition = (positions: any[]) => positions.find((p: any) => p.symbol === pool.symbol);

    if (isVenus) { const pos = findPosition(venusPositions); borrowedAmount = pos?.borrow || 0; borrowedAmountUSD = pos?.borrowUSD || 0; }
    else if (isKinza) { const pos = findPosition(kinzaPositions); borrowedAmount = pos?.borrow || 0; borrowedAmountUSD = pos?.borrowUSD || 0; }
    else if (isRadiant) { const pos = findPosition(radiantPositions); borrowedAmount = pos?.borrow || 0; borrowedAmountUSD = pos?.borrowUSD || 0; }

    if (borrowedAmount === 0 && pool.userBorrowed && pool.userBorrowed > 0) {
        borrowedAmount = pool.userBorrowed;
        borrowedAmountUSD = pool.userBorrowedUSD || (borrowedAmount * tokenPrice);
    }

    // Wallet Balance
    const { data: nativeBalance, refetch: refetchNative } = useBalance({ address, query: { enabled: !!address && isNative } });
    const { data: tokenBalanceRaw, refetch: refetchToken } = useReadContract({
        address: underlyingAddress, abi: ERC20_ABI, functionName: 'balanceOf', args: address ? [address] : undefined,
        query: { enabled: !!address && !isNative && !!underlyingAddress }
    });

    let walletBalance = 0;
    if (isNative && nativeBalance) walletBalance = parseFloat(nativeBalance.formatted);
    else if (tokenBalanceRaw) walletBalance = parseFloat(formatUnits(tokenBalanceRaw, decimals));

    const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
        address: underlyingAddress, abi: ERC20_ABI, functionName: 'allowance', args: address && approvalTarget ? [address, approvalTarget] : undefined,
        query: { enabled: !!address && !isNative && !!underlyingAddress && !!approvalTarget && activeTab === 'repay' }
    });

    const { venus, kinza, radiant, isLoading: isHealthLoading, refetch: refetchHealth } = useAggregatedHealth();
    const activeHealth = isVenus ? venus : isKinza ? kinza : radiant;
    const protocolDebt = activeHealth.debtUSD;
    const protocolPower = activeHealth.borrowPowerUSD;

    const amountUSD = (parseFloat(amount) || 0) * price;
    const currentHF = activeHealth.healthFactor || 10;

    const newHF = useMemo(() => {
        if (!amountUSD || amountUSD <= 0) return currentHF;
        let newDebt = protocolDebt;
        if (activeTab === 'borrow') newDebt += amountUSD;
        else newDebt = Math.max(0, protocolDebt - amountUSD);
        if (newDebt <= 0) return 10;
        return protocolPower / newDebt;
    }, [activeTab, protocolDebt, protocolPower, amountUSD, currentHF]);

    const isRisky = newHF < 1.1;
    const safeMaxUSD = (protocolPower * 0.95) - protocolDebt;
    const safeMaxAmount = Math.max(0, safeMaxUSD / price);

    const { writeContract, data: hash, isPending, error: writeError, reset: resetWrite } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        if (isConfirmed) {
            if (step === 'approving') { setStep('idle'); refetchAllowance(); }
            else {
                setStep("success");
                refetchVenus?.(); refetchKinza?.(); refetchRadiant?.();
                refetchNative?.(); refetchToken?.(); refetchAllowance?.(); refetchHealth?.();
            }
        } else if (isConfirming || isPending) { if (step !== 'approving') setStep("mining"); }
    }, [isConfirmed, isConfirming, isPending, step, refetchAllowance, refetchVenus, refetchKinza, refetchRadiant, refetchNative, refetchToken, refetchHealth]);

    const handleAction = useCallback(() => {
        if (!isConnected) { openConnectModal?.(); return; }
        const amountNum = parseFloat(amount || '0'); if (amountNum <= 0) return;
        const amountBig = parseUnits(amount, decimals);

        try {
            if (activeTab === 'borrow') {
                if (isVenus && vTokenAddress) {
                    if (isNative) writeContract({ address: vTokenAddress, abi: VBNB_ABI, functionName: 'borrow', args: [amountBig] });
                    else writeContract({ address: vTokenAddress, abi: VTOKEN_ABI, functionName: 'borrow', args: [amountBig] });
                } else if (isKinza || isRadiant) {
                    const poolAddress = isKinza ? KINZA_POOL : RADIANT_LENDING_POOL;
                    if (isNative) {
                        const gatewayAddress = isKinza ? KINZA_GATEWAY : RADIANT_GATEWAY;
                        if (gatewayAddress) writeContract({ address: gatewayAddress, abi: WETH_GATEWAY_ABI, functionName: 'borrowETH', args: [poolAddress, amountBig, BigInt(2), 0] });
                    } else {
                        if (isKinza) writeContract({ address: KINZA_POOL, abi: KINZA_POOL_ABI, functionName: 'borrow', args: [underlyingAddress!, amountBig, BigInt(2), 0, address!] });
                        else writeContract({ address: RADIANT_LENDING_POOL, abi: RADIANT_POOL_ABI, functionName: 'borrow', args: [underlyingAddress!, amountBig, BigInt(2), 0, address!] });
                    }
                }
            } else {
                if (!isNative && underlyingAddress && approvalTarget) {
                    const allowance = currentAllowance || BigInt(0);
                    if (allowance < amountBig) {
                        setStep('approving');
                        writeContract({ address: underlyingAddress, abi: ERC20_ABI, functionName: 'approve', args: [approvalTarget, maxUint256] });
                        return;
                    }
                }
                if (isVenus && vTokenAddress) {
                    if (isNative) writeContract({ address: vTokenAddress, abi: VBNB_ABI, functionName: 'repayBorrow', value: amountBig });
                    else writeContract({ address: vTokenAddress, abi: VTOKEN_ABI, functionName: 'repayBorrow', args: [amountBig] });
                } else if (isKinza || isRadiant) {
                    const poolAddress = isKinza ? KINZA_POOL : RADIANT_LENDING_POOL;
                    if (isNative) {
                        const gatewayAddress = isKinza ? KINZA_GATEWAY : RADIANT_GATEWAY;
                        if (gatewayAddress) writeContract({ address: gatewayAddress, abi: WETH_GATEWAY_ABI, functionName: 'repayETH', args: [poolAddress, amountBig, BigInt(2), address!], value: amountBig });
                    } else {
                        const assetAddr = underlyingAddress!;
                        if (isKinza) writeContract({ address: KINZA_POOL, abi: KINZA_POOL_ABI, functionName: 'repay', args: [assetAddr, amountBig, BigInt(2), address!] });
                        else writeContract({ address: RADIANT_LENDING_POOL, abi: RADIANT_POOL_ABI, functionName: 'repay', args: [assetAddr, amountBig, BigInt(2), address!] });
                    }
                }
            }
        } catch (e) { console.error(e); }
    }, [amount, activeTab, isConnected, isNative, isVenus, isKinza, isRadiant, address, vTokenAddress, underlyingAddress, approvalTarget, currentAllowance, decimals, writeContract, openConnectModal]);

    const repayMax = Math.min(walletBalance, borrowedAmount);
    const setHalf = () => { if (activeTab === 'repay') setAmount(toPlainString(repayMax / 2)); };
    const setMax = () => { if (activeTab === 'repay') { const max = isNative && repayMax > 0.01 ? repayMax - 0.01 : repayMax; setAmount(toPlainString(max)); } };

    const isButtonDisabled = !amount || parseFloat(amount) <= 0 || step === 'mining' || step === 'approving' || step === 'success';
    const borrowApy = (pool.apyBaseBorrow || 0) + (pool.apyRewardBorrow || 0);
    const availableLiquidity = (pool.tvlUsd || 0) - (pool.totalBorrowUsd || 0);

    return (
        <>
            {!isEmbedded && (
                <div className="p-4 md:p-6 pb-2 md:pb-4 border-b border-white/5 bg-[#09090b] sticky top-0 z-20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AssetIcon symbol={pool.symbol} className="w-8 h-8 md:w-10 md:h-10" />
                            <div>
                                <h2 className="text-lg md:text-xl font-bold">{pool.symbol}</h2>
                                <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted-foreground">
                                    <span className="uppercase">{protocolDisplay}</span>
                                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                                    <span className="text-blue-400 font-medium">Borrow Market</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-muted-foreground hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}

            <div className="px-4 md:px-6 pt-4 md:pt-6 mb-4 md:mb-6">
                <div className="bg-[#121216] border border-white/5 rounded-2xl p-3 md:p-4 grid grid-cols-2 gap-y-3 md:gap-y-4 gap-x-6 md:gap-x-8">
                    <div>
                        <div className="text-[9px] md:text-[10px] uppercase text-blue-400 font-bold mb-1">Your Debt</div>
                        <div className="text-base md:text-lg font-mono text-blue-400 tracking-tight">{borrowedAmount > 0 ? <>{formatSmallNumber(borrowedAmount)} {pool.symbol}</> : '0'}</div>
                        <div className="text-[9px] md:text-[10px] text-muted-foreground">≈ {formatMoney(borrowedAmountUSD)}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[9px] md:text-[10px] uppercase text-muted-foreground font-bold mb-1">Health Factor</div>
                        <div className="text-base md:text-lg font-bold font-mono text-emerald-400">{borrowedAmount > 0 ? 'Monitor' : 'Safe'}</div>
                    </div>
                    <div className="col-span-2 h-[1px] bg-white/5 my-0.5 md:my-1" />
                    <div className="flex justify-between items-center"><span className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">Borrow APY <ArrowUpDown className="w-2.5 h-2.5" /></span><span className="text-blue-400 font-bold font-mono text-[11px] md:text-sm bg-blue-400/10 px-1.5 md:px-2 py-0.5 rounded-full border border-blue-400/20">-{borrowApy.toFixed(2)}%</span></div>
                    <div className="flex justify-between items-center"><span className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">Available Liquidity</span><span className="text-white font-bold text-[11px] md:text-sm">{formatMoney(availableLiquidity)}</span></div>
                </div>
            </div>

            <div className="px-4 md:px-6 mb-4">
                <div className="bg-[#121216] rounded-xl p-1 flex relative">
                    <motion.div className="absolute top-1 bottom-1 bg-[#1a1a20] rounded-lg shadow-sm" initial={false} animate={{ left: activeTab === 'borrow' ? '4px' : '50%', width: 'calc(50% - 4px)' }} transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                    <button onClick={() => { setActiveTab('borrow'); setAmount(''); resetWrite(); setStep('idle'); }} className={`flex-1 relative z-10 py-1.5 md:py-2 text-sm font-bold transition-colors ${activeTab === 'borrow' ? 'text-white' : 'text-muted-foreground'}`}>Borrow</button>
                    <button onClick={() => { setActiveTab('repay'); setAmount(''); resetWrite(); setStep('idle'); }} className={`flex-1 relative z-10 py-1.5 md:py-2 text-sm font-bold transition-colors ${activeTab === 'repay' ? 'text-white' : 'text-muted-foreground'}`}>Repay</button>
                </div>
            </div>

            <div className="px-4 md:px-6 pb-6 text-white">
                <div className="bg-[#121216] border border-white/5 rounded-2xl p-3 md:p-4 mb-4">
                    <div className="flex justify-between text-[9px] md:text-xs text-muted-foreground mb-3 uppercase font-bold tracking-wider">
                        <span>{activeTab === 'borrow' ? 'Borrow Amount' : 'Repay Amount'}</span>
                        <div className="flex gap-2">
                            {activeTab === 'repay' && (
                                <div className="flex gap-1"><button className="text-[9px] md:text-[10px] bg-white/10 hover:bg-white/20 px-1.5 rounded transition-colors" onClick={setHalf}>HALF</button><button className="text-[9px] md:text-[10px] bg-white/10 hover:bg-white/20 px-1.5 rounded transition-colors" onClick={setMax}>MAX</button></div>
                            )}
                            {activeTab === 'borrow' && (
                                <div className="flex gap-1"><button onClick={() => setAmount(toPlainString(safeMaxAmount))} className="text-[9px] md:text-[10px] text-[#CEFF00] font-bold border border-[#CEFF00]/30 px-2 py-0.5 rounded hover:bg-[#CEFF00]/10">SAFE MAX</button></div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="flex items-center gap-1.5 md:gap-2 bg-black/40 px-1.5 md:px-2 py-1 md:py-1.5 rounded-lg border border-white/5 flex-shrink-0"><AssetIcon symbol={pool.symbol} className="w-5 h-5 md:w-6 md:h-6" /><span className="font-bold text-xs md:text-sm">{pool.symbol}</span></div>
                        <input type="number" placeholder="0.00" className="bg-transparent text-right text-xl md:text-2xl font-mono font-bold w-full outline-none text-white placeholder:text-muted-foreground/30" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    </div>
                    <div className="flex justify-between items-center text-[10px] md:text-xs mt-2">
                        <div className="text-muted-foreground/60 font-medium">
                            {activeTab === 'repay' ? 'Wallet: ' : 'Available: '}
                            <span className="text-white font-bold ml-1">{formatSmallNumber(activeTab === 'repay' ? walletBalance : availableLiquidity / (tokenPrice || 1))} {pool.symbol}</span>
                        </div>
                        <div className="text-muted-foreground">≈ {formatMoney(parseFloat(amount || '0') * tokenPrice)}</div>
                    </div>
                    {writeError && step === 'idle' && (<div className="text-[10px] md:text-xs text-red-400 mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /><span className="truncate">{writeError.message}</span></div>)}
                </div>

                <div className="bg-[#121216] border border-white/5 rounded-2xl p-3 md:p-4 space-y-2 md:space-y-3 mb-4">
                    <div className="flex justify-between items-center text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60"><span>Transaction Impact</span></div>
                    <div className="flex justify-between items-center w-full"><span className="text-[10px] md:text-xs text-muted-foreground font-medium">Health Factor</span><div className="flex items-center gap-2"><span className="text-[10px] md:text-xs font-bold text-white/40">{(currentHF > 5 ? 5.0 : currentHF).toFixed(2)}</span><ArrowRight className="w-2.5 h-2.5 md:w-3 md:h-3 text-muted-foreground/30" /><span className={cn("text-xs md:text-sm font-bold", newHF < 1.1 ? "text-red-400" : newHF < 1.5 ? "text-amber-400" : "text-[#CEFF00]")}>{newHF > 5 ? '> 5.0' : (newHF || 0).toFixed(2)}</span></div></div>
                    {(amountUSD > 0) && (
                        <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden"><motion.div className={cn("h-full bg-gradient-to-r", newHF < 1.1 ? "from-red-500 to-orange-500" : "from-[#CEFF00] to-emerald-400")} initial={{ width: 0 }} animate={{ width: `${Math.min(100, (1 / (newHF || 1)) * 100)}%` }} transition={{ duration: 0.5 }} /></div>
                    )}
                    <div className="flex justify-between w-full text-[10px] md:text-xs items-center pt-1 border-t border-white/5"><span className="text-muted-foreground">Borrow APY</span><span className="text-red-400 font-mono font-bold">-{borrowApy.toFixed(2)}%</span></div>
                </div>

                {isRisky && amountUSD > 0 && (<div className="flex items-start gap-2 mb-4 p-2 md:p-3 rounded-xl bg-red-500/10 border border-red-500/20"><ShieldAlert className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-500 shrink-0 mt-0.5" /><div className="text-[10px] md:text-[11px] text-red-200">This borrow amount will put your position at high risk of liquidation. Consider a smaller amount or more collateral.</div></div>)}

                <Button onClick={handleAction} disabled={isButtonDisabled} className={`w-full h-12 md:h-14 text-base md:text-lg font-bold rounded-xl md:rounded-2xl relative overflow-hidden transition-all ${step === 'success' ? 'bg-emerald-500 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' : activeTab === 'borrow' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_20px_rgba(37,99,235,0.2)]' : 'bg-white hover:bg-gray-200 text-black'}`}>
                    <AnimatePresence mode="wait">
                        {step === 'idle' && (<motion.span key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>{isConnected ? (activeTab === 'borrow' ? 'Borrow' : 'Repay') : 'Connect Wallet'}</motion.span>)}
                        {step === 'approving' && (<motion.div key="approving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /><span>Approving...</span></motion.div>)}
                        {step === 'mining' && (<motion.div key="mining" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /><span>Processing...</span></motion.div>)}
                        {step === 'success' && (<motion.div key="success" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 text-white"><div className="bg-white text-emerald-500 rounded-full p-1"><Check className="w-4 h-4 stroke-[4]" /></div><span>Success!</span></motion.div>)}
                    </AnimatePresence>
                </Button>
            </div>
        </>
    );
}

export function BorrowModal({ isOpen, onClose, pool }: BorrowModalProps) {
    if (!isOpen) return null;
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[95vw] sm:max-w-[420px] max-h-[90vh] overflow-y-auto bg-[#09090b] border-white/10 text-white p-0 gap-0 rounded-3xl scrollbar-hide">
                <BorrowModalContent onClose={onClose} pool={pool} isEmbedded={false} />
            </DialogContent>
        </Dialog>
    );
}
