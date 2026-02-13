"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X, Loader2 } from "lucide-react";
import { AssetIcon } from "@/components/ui/asset-icon";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { EarnModalContent } from "./EarnModal";
import { BorrowModalContent } from "./BorrowModal";

interface MarketModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode: "earn" | "borrow";
    pool: any;
}

export function MarketModal({ isOpen, onClose, initialMode, pool }: MarketModalProps) {
    const [mode, setMode] = useState<"earn" | "borrow">(initialMode);
    const [isSwitching, setIsSwitching] = useState(false);

    // Sync mode if initialMode changes while open (unlikely but good for safety)
    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
        }
    }, [isOpen, initialMode]);

    const handleModeSwitch = (newMode: "earn" | "borrow") => {
        if (newMode === mode) return;
        setIsSwitching(true);
        setMode(newMode);
        // Artificial delay for smooth transition and re-fetching simulation
        setTimeout(() => setIsSwitching(false), 300);
    };

    const protocolDisplay = pool.project === 'venus' ? 'Venus' : pool.project === 'kinza-finance' ? 'Kinza' : 'Radiant';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[95vw] sm:max-w-[420px] max-h-[90vh] overflow-y-auto bg-[#09090b] border-white/10 text-white p-0 gap-0 rounded-3xl scrollbar-hide">
                <div className="sr-only">
                    <DialogTitle>{pool.symbol} Market - {protocolDisplay}</DialogTitle>
                </div>
                {/* Unified Header */}
                <div className="p-4 md:p-6 pb-2 md:pb-4 border-b border-white/5 bg-[#09090b] sticky top-0 z-20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AssetIcon symbol={pool.symbol} className="w-8 h-8 md:w-10 md:h-10" />
                            <div>
                                <h2 className="text-lg md:text-xl font-bold">{pool.symbol}</h2>
                                <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted-foreground uppercase">
                                    <span>{protocolDisplay}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Mode Toggle */}
                            <div className="flex items-center bg-white/5 p-1 rounded-full border border-white/5">
                                <button
                                    onClick={() => handleModeSwitch("earn")}
                                    className={cn(
                                        "px-3 py-1 rounded-full text-[10px] md:text-xs font-bold transition-all",
                                        mode === "earn"
                                            ? "bg-emerald-500 text-white shadow-lg"
                                            : "text-muted-foreground hover:text-white"
                                    )}
                                >
                                    Supply
                                </button>
                                <button
                                    onClick={() => handleModeSwitch("borrow")}
                                    className={cn(
                                        "px-3 py-1 rounded-full text-[10px] md:text-xs font-bold transition-all",
                                        mode === "borrow"
                                            ? "bg-blue-600 text-white shadow-lg"
                                            : "text-muted-foreground hover:text-white"
                                    )}
                                >
                                    Borrow
                                </button>
                            </div>

                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-muted-foreground hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <AnimatePresence mode="wait">
                        {isSwitching ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="h-[400px] flex flex-col items-center justify-center gap-3"
                            >
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                <span className="text-xs text-muted-foreground animate-pulse font-medium">Updating Market Data...</span>
                            </motion.div>
                        ) : (
                            <motion.div
                                key={mode}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                {mode === "earn" ? (
                                    <EarnModalContent pool={pool} onClose={onClose} isEmbedded={true} />
                                ) : (
                                    <BorrowModalContent pool={pool} onClose={onClose} isEmbedded={true} />
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}
