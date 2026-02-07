import { StrategyBuilder } from "@/components/StrategyBuilder";

export default function StrategiesPage() {
    return (
        <div className="pt-32 min-h-screen bg-[#0B0B0F] text-foreground">
            <div className="container py-12 space-y-8 max-w-screen-2xl mx-auto px-8 md:px-16">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Strategy Engine</h1>
                        <div className="text-sm text-muted-foreground">Automated leveraging and looping on BSC.</div>
                    </div>
                </div>

                <div className="max-w-3xl mx-auto">
                    <StrategyBuilder />
                </div>
            </div>
        </div>
    );
}
