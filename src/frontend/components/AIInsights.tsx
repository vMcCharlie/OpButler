'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccount } from 'wagmi';

interface AIInsightsProps {
    portfolioData: any; // We'll pass the aggregated portfolio data here
}

export function AIInsights({ portfolioData }: AIInsightsProps) {
    const { address } = useAccount();
    const [tips, setTips] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchInsights() {
            if (!address || !portfolioData) return;

            // Only fetch if we have some data to analyze
            const hasData = portfolioData.totalCollateralUSD > 0 || portfolioData.totalDebtUSD > 0;
            if (!hasData) return;

            setLoading(true);
            setError(null);

            try {
                const response = await fetch('/api/ai-insight', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ portfolio: portfolioData }),
                });

                if (!response.ok) throw new Error('Failed to fetch insights');

                const data = await response.json();
                setTips(data.tips);
            } catch (err) {
                console.error(err);
                setError("AI Agent is currently sleeping. Try again later.");
            } finally {
                setLoading(false);
            }
        }

        fetchInsights();
    }, [address, portfolioData]);

    if (!address) return null;

    return (
        <Card className="bg-gradient-to-br from-[#CEFF00]/10 to-emerald-500/10 border-emerald-500/20 shadow-lg">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg font-outfit text-emerald-400">
                    <Sparkles className="w-5 h-5 text-[#CEFF00]" />
                    AI Risk Agent Insights
                </CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing your portfolio for optimization opportunities...
                    </div>
                ) : error ? (
                    <p className="text-sm text-red-400">{error}</p>
                ) : tips.length > 0 ? (
                    <ul className="space-y-3">
                        {tips.map((tip, i) => (
                            <li key={i} className="flex gap-3 text-sm text-white/90 bg-black/20 p-3 rounded-lg border border-white/5">
                                <span className="text-[#CEFF00] font-bold">0{i + 1}</span>
                                {tip}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        No active positions found. Deposit assets to get AI-powered risk advice.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
