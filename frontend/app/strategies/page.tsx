'use client';

import { Suspense } from 'react';
import { StrategyBuilder } from "@/components/StrategyBuilder";
import { TopLoops } from "@/components/TopLoops";
import { Loader2 } from 'lucide-react';

function StrategiesContent() {
    return (
        <div className="pt-32 min-h-screen bg-[#0B0B0F] text-foreground">
            <div className="container py-12 space-y-8 max-w-screen-2xl mx-auto px-8 md:px-16">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Strategy Engine</h1>
                        <div className="text-sm text-muted-foreground">Automated leveraging and looping on BSC.</div>
                    </div>
                </div>

                {/* Compact Top Loops Section */}
                <div className="bg-[#0f0f12] border border-white/5 rounded-2xl p-6">
                    <TopLoops compact={true} maxItems={6} showFilters={true} />
                </div>

                {/* Strategy Builder */}
                <div className="max-w-3xl mx-auto">
                    <StrategyBuilder />
                </div>
            </div>
        </div>
    );
}

export default function StrategiesPage() {
    return (
        <Suspense fallback={
            <div className="pt-32 min-h-screen bg-[#0B0B0F] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        }>
            <StrategiesContent />
        </Suspense>
    );
}
