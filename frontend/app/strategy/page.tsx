'use client';

import { Suspense } from 'react';
import { StrategyBuilder } from "@/components/StrategyBuilder";
import { TopLoops } from "@/components/TopLoops";
import { Loader2 } from 'lucide-react';

function StrategyContent() {
    return (
        <div className="container pt-32 pb-12 max-w-screen-2xl mx-auto px-8 md:px-16 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Lend</h1>
                    <p className="text-muted-foreground">
                        Create, simulate, and execute advanced DeFi loop strategies.
                    </p>
                </div>
            </div>

            {/* Compact Top Loops */}
            <div className="bg-[#0f0f12] border border-white/5 rounded-2xl p-6">
                <TopLoops compact={true} maxItems={6} showFilters={true} />
            </div>

            <div className="grid gap-8">
                <StrategyBuilder />
            </div>
        </div>
    );
}

export default function StrategyPage() {
    return (
        <Suspense fallback={
            <div className="container pt-32 pb-12 flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        }>
            <StrategyContent />
        </Suspense>
    );
}
