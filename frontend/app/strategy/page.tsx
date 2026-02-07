'use client';

import { StrategyBuilder } from "@/components/StrategyBuilder";

export default function StrategyPage() {
    return (
        <div className="container py-12 max-w-screen-xl mx-auto px-4 md:px-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Strategy Management</h1>
                    <p className="text-muted-foreground">
                        Create, simulate, and execute advanced DeFi loop strategies.
                    </p>
                </div>
            </div>

            <div className="grid gap-8">
                <StrategyBuilder />
            </div>
        </div>
    );
}
