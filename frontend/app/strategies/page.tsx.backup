'use client';

import { Suspense, useState } from 'react';
import { StrategyBuilder } from "@/components/StrategyBuilder";
import { TopLoops } from "@/components/TopLoops";
import { Loader2 } from 'lucide-react';
import { StrategyTabs } from "@/components/StrategyTabs";

function StrategiesContent() {
    const [activeTab, setActiveTab] = useState('Multiply');

    return (
        <div className="pt-32 min-h-screen bg-[#0B0B0F] text-foreground">
            <div className="container py-12 space-y-8 max-w-screen-2xl mx-auto px-8 md:px-16">
                <div className="flex flex-col items-center justify-center text-center space-y-6">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-white mb-2 font-outfit">Strategy Engine</h1>
                        <div className="text-muted-foreground">Automated leveraging and looping on BSC.</div>
                    </div>

                    {/* Navigation Tabs */}
                    <StrategyTabs activeTab={activeTab} onTabChange={setActiveTab} />
                </div>

                {/* Content based on Tab */}
                {activeTab === 'Multiply' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Compact Top Loops Section */}
                        <div className="bg-[#0f0f12] border border-white/5 rounded-2xl p-6">
                            <TopLoops compact={true} maxItems={6} showFilters={true} />
                        </div>

                        {/* Strategy Builder */}
                        <div className="max-w-3xl mx-auto">
                            <StrategyBuilder />
                        </div>
                    </div>
                )}

                {activeTab !== 'Multiply' && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-white/5 rounded-2xl bg-[#0f0f12]">
                        <div className="text-2xl font-bold mb-2">Coming Soon</div>
                        <p>The {activeTab} strategy module is currently under development.</p>
                    </div>
                )}
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
