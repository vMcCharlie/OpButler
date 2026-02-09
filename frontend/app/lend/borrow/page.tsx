'use client';

import { Suspense } from 'react';
import { BorrowTable } from "@/components/BorrowTable";
import { Loader2, Info } from 'lucide-react';

export default function BorrowPage() {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Section Title */}
            <div className="flex items-center gap-2 mb-6">
                <h2 className="text-2xl font-bold text-white">Available Markets</h2>
            </div>
            <p className="text-muted-foreground mb-8 flex items-center gap-2 text-sm">
                <Info className="w-4 h-4 text-blue-400" />
                You must deposit collateral in the "Earn" section required by the protocol before you can borrow.
            </p>

            {/* Table */}
            <Suspense fallback={<div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
                <BorrowTable />
            </Suspense>
        </div>
    );
}
