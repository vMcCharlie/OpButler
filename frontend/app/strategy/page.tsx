'use client';

import { StrategyBuilder } from "@/components/StrategyBuilder";

export default function StrategyPage() {
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

            <div className="grid gap-8">
                <StrategyBuilder />
            </div>
        </div>
    );
}
