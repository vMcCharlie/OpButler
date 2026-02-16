
'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bell, ShieldCheck, Copy, Check, Wallet, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Polling interval options
const POLLING_OPTIONS = [
    { value: 60, label: "1 hour" },
    { value: 120, label: "2 hours" },
    { value: 360, label: "6 hours" },
    { value: 720, label: "12 hours" },
    { value: 960, label: "16 hours" },
    { value: 1440, label: "24 hours" },
];

export default function Settings() {
    const { address, isConnected } = useAccount();
    const { signMessageAsync } = useSignMessage();
    const { toast } = useToast();

    const [telegramId, setTelegramId] = useState('');
    const [signature, setSignature] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [step, setStep] = useState(1);

    // Supabase State
    const [isLinked, setIsLinked] = useState<boolean | null>(null); // null = loading, false = disconnected, true = connected
    const [linkedUser, setLinkedUser] = useState<any>(null);
    const [isFetchingSettings, setIsFetchingSettings] = useState(false);

    // Settings state (Fetched from Supabase)
    const [pollingInterval, setPollingInterval] = useState(60);
    const [alertThreshold, setAlertThreshold] = useState(1.1);

    // Fetch user settings from Supabase when address changes
    useEffect(() => {
        const fetchUserSettings = async () => {
            if (!address) {
                setIsLinked(false);
                return;
            }

            setIsFetchingSettings(true);
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('wallet_address', address.toLowerCase())
                    .single();

                if (error || !data) {
                    setIsLinked(false);
                    setLinkedUser(null);
                } else {
                    setIsLinked(true);
                    setLinkedUser(data);
                    setPollingInterval(data.polling_interval || 60);
                    setAlertThreshold(data.alert_threshold || 1.1);
                    console.log('User settings fetched:', data);
                }
            } catch (err) {
                console.error('Error fetching user settings:', err);
                setIsLinked(false);
            } finally {
                setIsFetchingSettings(false);
            }
        };

        if (isConnected) {
            fetchUserSettings();
        }
    }, [address, isConnected]);

    const handleSign = async () => {
        if (!telegramId) {
            toast({
                title: "Error",
                description: "Please enter your Telegram User ID first.",
                variant: "destructive"
            });
            return;
        }

        try {
            const message = `OpButler Auth: ${telegramId}`;
            const sig = await signMessageAsync({ message });
            setSignature(sig);
            setStep(3);
            toast({
                title: "Signed Successfully",
                description: "Signature generated. Copy it and send to the bot.",
            });
        } catch (error) {
            console.error("Signing failed:", error);
            toast({
                title: "Signing Failed",
                description: "User rejected the signature request.",
                variant: "destructive"
            });
        }
    };

    const copySignature = () => {
        if (!signature) return;
        navigator.clipboard.writeText(`/verify ${signature}`);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast({
            title: "Copied!",
            description: "Command copied to clipboard. Paste it in Telegram.",
        });
    };

    // Helper to mask sensitive Telegram data
    const maskUserId = (id: string | number) => {
        const s = String(id);
        if (s.length <= 4) return s;
        return `${s.slice(0, 2)}**${s.slice(-2)}`;
    };

    const maskUsername = (name: string) => {
        if (!name) return 'User';
        if (name.length <= 4) return name;
        return `${name.slice(0, 2)}***${name.slice(-2)}`;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {!isConnected && (
                <div className="flex z-10 flex-col items-center justify-center p-12 text-center glass-card rounded-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none" />
                    <ShieldCheck className="w-16 h-16 text-primary/80 mb-6 drop-shadow-[0_0_15px_rgba(206,255,0,0.3)]" />
                    <h3 className="text-2xl font-bold font-outfit mb-3">Connect Wallet</h3>
                    <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                        Please connect your wallet securely to view your personalized dashboard and configure alerts.
                    </p>
                    <ConnectButton.Custom>
                        {({ openConnectModal, mounted }) => {
                            if (!mounted) return null;
                            return (
                                <Button
                                    onClick={openConnectModal}
                                    className="h-12 px-8 text-lg font-bold bg-[#CEFF00] text-black hover:bg-[#b8e600] rounded-full shadow-[0_0_20px_rgba(206,255,0,0.3)] transition-all hover:scale-105 flex items-center gap-2"
                                >
                                    Connect Wallet <Wallet className="h-5 w-5" />
                                </Button>
                            );
                        }}
                    </ConnectButton.Custom>
                </div>
            )}

            {isConnected && (
                <>
                    <h1 className="text-3xl font-bold font-outfit bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-400">
                        Settings & Alerts
                    </h1>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Telegram Linking Card */}
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Bell className="text-primary" />
                                        Telegram Link
                                    </div>
                                    {isLinked === true && (
                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                            Linked to @{maskUsername(linkedUser?.username)}
                                        </Badge>
                                    )}
                                    {isLinked === false && (
                                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                                            Not Connected
                                        </Badge>
                                    )}
                                </CardTitle>
                                <CardDescription>
                                    {isLinked
                                        ? "Your wallet is securely linked to Telegram for instant alerts."
                                        : "Link your Telegram account to receive instant liquidation alerts."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isFetchingSettings ? (
                                    <div className="space-y-4">
                                        <Skeleton className="h-20 w-full" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                ) : isLinked ? (
                                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Connected User ID</span>
                                            <span className="font-mono text-foreground font-bold">{maskUserId(linkedUser?.chat_id)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Alerts Status</span>
                                            <span className={linkedUser?.alerts_enabled ? "text-emerald-400 font-bold" : "text-amber-500 font-bold"}>
                                                {linkedUser?.alerts_enabled ? "Active" : "Paused"}
                                            </span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="w-full text-xs h-8 border-dashed hover:bg-primary/10"
                                            onClick={() => setStep(1)} // Allow re-linking if needed
                                        >
                                            Link different account
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Step 1: Enter ID */}
                                        <div className={`transition-opacity duration-300 ${step === 1 ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                            <label className="text-sm font-medium mb-1 block">1. Enter Telegram User ID</label>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="e.g. 123456789"
                                                    value={telegramId}
                                                    onChange={(e) => setTelegramId(e.target.value)}
                                                    className="font-mono"
                                                />
                                                <Button
                                                    variant="outline"
                                                    onClick={() => window.open('https://t.me/OpButlerBot', '_blank')}
                                                    className="shrink-0"
                                                >
                                                    Get ID
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1 text-[10px]">
                                                Use <code className="bg-secondary px-1 rounded">/id</code> in the bot chat.
                                            </p>
                                        </div>

                                        {/* Step 2: Sign Message */}
                                        <div className={`transition-opacity duration-300 ${step >= 1 ? 'opacity-100' : 'opacity-50'}`}>
                                            <label className="text-sm font-medium mb-1 block text-[12px]">2. Ownership Verify</label>
                                            <Button
                                                onClick={handleSign}
                                                className="w-full h-9 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 text-xs font-bold"
                                                disabled={!telegramId}
                                            >
                                                Sign Auth Message
                                            </Button>
                                        </div>

                                        {/* Step 3: Copy & Verify */}
                                        {signature && (
                                            <div className="p-3 rounded-lg bg-secondary/30 border border-border animate-in zoom-in-95">
                                                <label className="text-[10px] font-bold uppercase tracking-wider mb-2 block text-emerald-400">3. Final Step</label>
                                                <div className="flex items-center gap-2 p-2 bg-background/50 rounded border border-border">
                                                    <code className="text-[10px] flex-1 break-all truncate font-mono text-muted-foreground">
                                                        /verify {signature.substring(0, 15)}...
                                                    </code>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={copySignature}>
                                                        {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Polling Interval Card */}
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="text-blue-400" />
                                    Polling Frequency
                                </CardTitle>
                                <CardDescription>
                                    How often should we check your positions?
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-2">
                                    {isFetchingSettings ? (
                                        Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
                                    ) : (
                                        POLLING_OPTIONS.map((option) => (
                                            <Button
                                                key={option.value}
                                                variant={pollingInterval === option.value ? "default" : "outline"}
                                                className={`${pollingInterval === option.value
                                                    ? "bg-primary text-black opacity-100"
                                                    : "opacity-40"}`}
                                                disabled={true} // Read-only
                                            >
                                                {option.label}
                                                {pollingInterval === option.value && <div className="absolute top-0 right-0 w-2 h-2 bg-primary animate-ping rounded-full" />}
                                            </Button>
                                        ))
                                    )}
                                </div>
                                <div className="mt-4 p-3 rounded bg-secondary/20 border border-border flex items-start gap-2">
                                    <ShieldCheck size={14} className="text-primary shrink-0 mt-0.5" />
                                    <p className="text-[10px] leading-tight text-muted-foreground">
                                        Settings are managed via the Telegram Bot. Use <code className="bg-secondary px-1 rounded">/setinterval</code> in the bot to change this frequency.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Alert Threshold Card */}
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="text-orange-500" />
                                    Alert Threshold
                                </CardTitle>
                                <CardDescription>
                                    Receive alerts when Health Factor drops below this value.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm text-muted-foreground">Health Factor &lt;</span>
                                        <div className="flex-1 opacity-50 cursor-not-allowed">
                                            <input
                                                type="range"
                                                min="1.0"
                                                max="2.0"
                                                step="0.1"
                                                value={alertThreshold}
                                                disabled={true}
                                                className="w-full accent-primary"
                                            />
                                        </div>
                                        <span className="text-2xl font-mono font-bold text-orange-500 min-w-[60px] text-right">
                                            {alertThreshold.toFixed(1)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>1.0 (Risky)</span>
                                        <span>1.5 (Moderate)</span>
                                        <span>2.0 (Safe)</span>
                                    </div>
                                    <div className="p-3 rounded bg-secondary/20 border border-border flex items-start gap-2">
                                        <AlertTriangle size={14} className="text-orange-500 shrink-0 mt-0.5" />
                                        <p className="text-[10px] leading-tight text-muted-foreground">
                                            Use <code className="bg-secondary px-1 rounded">/setalert {alertThreshold.toFixed(1)}</code> in Telegram to adjust your danger zone threshold.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Info Card */}
                        <Card className="glass-card border-primary/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShieldCheck className="text-emerald-500" />
                                    How It Works
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-muted-foreground">
                                <p>
                                    <strong className="text-foreground">1. Link Wallet:</strong> Sign a message to prove ownership and link your Telegram.
                                </p>
                                <p>
                                    <strong className="text-foreground">2. Configure Alerts:</strong> Set how often to check and when to alert.
                                </p>
                                <p>
                                    <strong className="text-foreground">3. Receive Alerts:</strong> Get notified on Telegram when your Health Factor drops.
                                </p>
                                <p>
                                    <strong className="text-foreground">4. Take Action:</strong> Click the link in alerts to manage positions on this dashboard.
                                </p>
                                <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                                    <p className="text-xs">
                                        🔒 <strong>Security:</strong> Telegram bot is read-only. All transactions happen here via your wallet.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
