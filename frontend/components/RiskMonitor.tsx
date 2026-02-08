import { ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

interface RiskMonitorProps {
    healthFactor: number;
    liquidationThreshold: number;
}

export function RiskMonitor({ healthFactor, liquidationThreshold }: RiskMonitorProps) {
    const isSafe = healthFactor > 1.5;
    const isRisky = healthFactor <= 1.5 && healthFactor > 1.1;
    const isDanger = healthFactor <= 1.1;

    const color = isSafe ? 'text-emerald-500' : isRisky ? 'text-yellow-500' : 'text-red-500';
    const bgColor = isSafe ? 'bg-emerald-500/10' : isRisky ? 'bg-yellow-500/10' : 'bg-red-500/10';
    const borderColor = isSafe ? 'border-emerald-500/20' : isRisky ? 'border-yellow-500/20' : 'border-red-500/20';

    return (
        <div className={`p-4 rounded-xl border ${bgColor} ${borderColor} transition-all duration-300`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    <ShieldCheck size={16} />
                    Risk Monitor
                </div>
                {isDanger && (
                    <div className="flex items-center gap-1 text-xs font-bold text-red-500 animate-pulse">
                        <AlertTriangle size={14} /> LIQUIDATION RISK
                    </div>
                )}
            </div>

            <div className="flex items-end justify-between">
                <div>
                    <div className={`text-3xl font-bold ${color}`}>
                        {healthFactor > 100 ? '∞' : healthFactor.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                        Health Factor (Target &gt; 1.5)
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-sm font-mono font-bold text-foreground">
                        {(liquidationThreshold * 100).toFixed(0)}%
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase">
                        Collat. Factor
                    </div>
                </div>
            </div>

            {/* Visual Gauge */}
            <div className="mt-3 w-full h-2 bg-background rounded-full overflow-hidden relative border border-border/50">
                {/* Safe Zone */}
                <div className="absolute left-0 top-0 h-full bg-red-500 w-1/3 opacity-80"></div>
                <div className="absolute left-1/3 top-0 h-full bg-yellow-500 w-1/3 opacity-80"></div>
                <div className="absolute left-2/3 top-0 h-full bg-emerald-500 w-1/3 opacity-80"></div>

                {/* Indicator */}
                <div
                    className="absolute top-0 h-full w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10 transition-all duration-500"
                    style={{ left: `${Math.min(Math.max((healthFactor / 3) * 100, 0), 100)}%` }}
                ></div>
            </div>

            {isDanger && (
                <div className="mt-3 p-2 rounded bg-red-500/20 border border-red-500/30 text-xs text-red-200 flex gap-2 items-start">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>
                        <strong>Action Required:</strong> Your position is close to liquidation.
                        Please <u>Repay Debt</u> or <u>Add Collateral</u> immediately.
                    </span>
                </div>
            )}
        </div>
    );
}
