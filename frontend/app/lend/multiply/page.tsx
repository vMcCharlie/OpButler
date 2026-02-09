'use client';

import { Suspense } from 'react';
import { StrategyBuilder } from "@/components/StrategyBuilder";
import { TopLoops } from "@/components/TopLoops";
import { Loader2 } from 'lucide-react';

function MultiplyContent() {
    return (
        <div className="space-y-8">
            {/* Compact Top Loops Section */}
            <div className="bg-[#0f0f12] border border-white/5 rounded-2xl p-6">
                <TopLoops compact={true} maxItems={6} showFilters={true} />
            </div>

            {/* Strategy Builder */}
            <div className="max-w-3xl mx-auto">
                <StrategyBuilder />
            </div>
        </div>
    );
}

export default function MultiplyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[50vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        }>
            <MultiplyContent />
        </Suspense>
    );
}
