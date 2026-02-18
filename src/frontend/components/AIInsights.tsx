'use client';

import { useEffect, useState, useRef } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccount } from 'wagmi';
import { useUserSettings } from '@/hooks/useUserSettings';

interface AIInsightsProps {
    portfolioData: any;
}

const CACHE_KEY_PREFIX = 'opbutler_ai_insights_';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minute cache for stability

export function AIInsights({ portfolioData }: AIInsightsProps) {
    const { address } = useAccount();
    const [tips, setTips] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Use refs to track the last analyzed data and session status
    const lastAnalyzedData = useRef<string>("");
    const hasFetchedThisSession = useRef<boolean>(false);

    const { settings, loading: settingsLoading } = useUserSettings();

    useEffect(() => {
        async function fetchInsights() {
            if (!address || !portfolioData || settingsLoading) return;

            // 1. Check for significant data (ignore empty/loading states)
            const hasData = (portfolioData.totalSupplied > 0 || portfolioData.totalBorrowed > 0);
            if (!hasData) return;

            // 2. Create a stable hash/string of the data to detect changes
            // We include the total values and the positions count/ids to catch major changes
            const currentDataString = JSON.stringify({
                totalNetWorth: portfolioData.totalNetWorth?.toFixed(2),
                totalSupplied: portfolioData.totalSupplied?.toFixed(2),
                totalBorrowed: portfolioData.totalBorrowed?.toFixed(2),
                positions: portfolioData.positions?.map((p: any) => p.symbol + p.supply + p.borrow).join(','),
                threshold: settings?.alert_threshold
            });

            // 3. Check Cache Freshness & Session Status
            const cacheKey = `${CACHE_KEY_PREFIX}${address}`;
            const cached = localStorage.getItem(cacheKey);

            if (cached) {
                const { timestamp, data, inputHash } = JSON.parse(cached);
                const isFresh = (Date.now() - timestamp) < CACHE_DURATION;
                const isSameData = inputHash === currentDataString;

                // If cache is fresh, use it and mark as fetched for this session
                if (isFresh) {
                    setTips(data);
                    lastAnalyzedData.current = currentDataString;
                    hasFetchedThisSession.current = true;
                    return;
                }

                // If we've already shown insights (fresh or not) and data hasn't changed, 
                // don't poll again while we are on this same page.
                if (hasFetchedThisSession.current && isSameData) {
                    return;
                }
            }

            // 4. Check if we just tried this exact data (prevent internal loops)
            if (lastAnalyzedData.current === currentDataString && !loading) {
                return;
            }

            // If we've already fetched ONCE this session, don't auto-poll again
            // unless the data actually changed (inputHash check above).
            if (hasFetchedThisSession.current && lastAnalyzedData.current === currentDataString) {
                return;
            }

            setLoading(true);
            setError(null);
            lastAnalyzedData.current = currentDataString; // Mark as processing

            try {
                const response = await fetch('/api/ai-insight', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        portfolio: portfolioData,
                        userSettings: settings
                    }),
                });

                if (!response.ok) throw new Error('Failed to fetch insights');

                const data = await response.json();
                setTips(data.tips);

                // Save to cache
                localStorage.setItem(cacheKey, JSON.stringify({
                    timestamp: Date.now(),
                    data: data.tips,
                    inputHash: currentDataString
                }));
                hasFetchedThisSession.current = true;

            } catch (err) {
                console.error(err);
                setError("AI Agent is currently sleeping. Try again later.");
                // Reset ref so we can try again if data updates
                lastAnalyzedData.current = "";
            } finally {
                setLoading(false);
            }
        }

        fetchInsights();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [address, portfolioData, settings, settingsLoading]); // Keep dependencies, but logic handles the loop

    // Manual Refresh Handler
    const handleRefresh = () => {
        if (!address) return;
        localStorage.removeItem(`${CACHE_KEY_PREFIX}${address}`);
        lastAnalyzedData.current = "";
        window.location.reload();
    };

    // Prompt to connect wallet if not connected
    if (!address) {
        return (
            <Card className="bg-gradient-to-br from-[#CEFF00]/5 to-primary/5 border-white/10 shadow-lg relative overflow-hidden group">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg font-outfit text-muted-foreground group-hover:text-primary transition-colors">
                        <Sparkles className="w-5 h-5 opacity-50 group-hover:opacity-100" />
                        AI Risk Agent Insights
                    </CardTitle>
                </CardHeader>
                <CardContent className="py-6">
                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Sparkles className="w-6 h-6 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-white text-base">Unlock AI-Driven Protection</p>
                            <p className="text-sm text-muted-foreground max-w-[300px]">
                                Connect your wallet to enable 24/7 autonomous monitoring and personalized risk insights.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-gradient-to-br from-[#CEFF00]/10 to-emerald-500/10 border-emerald-500/20 shadow-lg relative overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-lg font-outfit text-emerald-400">
                    <Sparkles className="w-5 h-5 text-[#CEFF00]" />
                    AI Risk Agent Insights
                </CardTitle>
                {tips.length > 0 && !loading && (
                    <button onClick={handleRefresh} className="text-xs text-emerald-500/50 hover:text-[#CEFF00] transition-colors" title="Force Refresh">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                )}
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-[#CEFF00]" />
                        <span className="animate-pulse">Analyzing your portfolio for optimization opportunities...</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col gap-2">
                        <p className="text-sm text-red-400">{error}</p>
                        <button onClick={handleRefresh} className="text-xs underline text-muted-foreground hover:text-white text-left">Try Again</button>
                    </div>

                ) : tips.length > 0 ? (
                    <ul className="space-y-3">
                        {tips.map((tip, i) => (
                            <li key={i} className="flex gap-3 text-sm text-white/90 bg-black/20 p-3 rounded-lg border border-white/5 hover:border-[#CEFF00]/30 transition-colors">
                                <span className="text-[#CEFF00] font-bold min-w-[20px]">0{i + 1}</span>
                                <span className="leading-relaxed">{tip}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground italic">
                        No active positions found. Deposit assets to activate the AI Agent.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
