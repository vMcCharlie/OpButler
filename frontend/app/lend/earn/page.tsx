'use client';

import { Suspense } from 'react';
import { EarnTable } from "@/components/EarnTable";
import { LendHeader } from "@/components/LendHeader";
import { Loader2, HelpCircle } from 'lucide-react';

export default function EarnPage() {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Metrics */}
            <LendHeader />

            {/* Section Title */}
            <div className="flex items-center gap-2 mb-6">
                <h2 className="text-2xl font-bold text-white">Earn Interest on Your Crypto</h2>
            </div>
            <p className="text-muted-foreground mb-8 flex items-center gap-2">
                Passively get yield using OpButler Lend.
                <span className="text-emerald-400 flex items-center gap-1 text-sm font-medium cursor-pointer hover:underline">
                    How it works <HelpCircle className="w-3 h-3" />
                </span>
            </p>

            {/* Table */}
            <Suspense fallback={<div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
                <EarnTable />
            </Suspense>
        </div>
    );
}
