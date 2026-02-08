
'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bell, ShieldCheck, Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function Settings() {
    const { address, isConnected } = useAccount();
    const { signMessageAsync } = useSignMessage();
    const { toast } = useToast();

    const [telegramId, setTelegramId] = useState('');
    const [signature, setSignature] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [step, setStep] = useState(1);

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

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center glass-card rounded-2xl">
                <ShieldCheck className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold mb-2">Connect Wallet</h3>
                <p className="text-muted-foreground">Please connect your wallet to access settings.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-bold font-outfit bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-400">
                Settings & Alerts
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Telegram Application Card */}
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="text-primary" />
                            Telegram Notifications
                        </CardTitle>
                        <CardDescription>
                            Link your Telegram account to receive instant liquidation alerts and daily updates.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                                    Get ID via Bot
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Message <code>/id</code> to the bot to get your ID.
                            </p>
                        </div>

                        {/* Step 2: Sign Message */}
                        <div className={`transition-opacity duration-300 ${step >= 1 ? 'opacity-100' : 'opacity-50'}`}>
                            <label className="text-sm font-medium mb-1 block">2. Verify Ownership</label>
                            <Button
                                onClick={handleSign}
                                className="w-full bg-primary/20 text-primary hover:bg-primary/30 border border-primary/50"
                                disabled={!telegramId}
                            >
                                Sign Authentication Message
                            </Button>
                        </div>

                        {/* Step 3: Copy & Verify */}
                        {signature && (
                            <div className="p-4 rounded-lg bg-secondary/50 border border-border animate-in zoom-in-95">
                                <label className="text-sm font-medium mb-2 block text-emerald-400">3. Complete Setup</label>
                                <p className="text-xs text-muted-foreground mb-3">
                                    Copy the command below and paste it into the Telegram Bot chat.
                                </p>
                                <div className="flex items-center gap-2 p-2 bg-background rounded border border-border">
                                    <code className="text-xs flex-1 break-all truncate font-mono text-muted-foreground">
                                        /verify {signature.substring(0, 20)}...
                                    </code>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={copySignature}>
                                        {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Risk Thresholds (Future Feature) */}
                <Card className="glass-card opacity-80">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="text-orange-500" />
                            Risk Preferences
                        </CardTitle>
                        <CardDescription>
                            Configure when you want to be alerted. (Coming Soon with Bot V2)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/30">
                                <span className="text-sm">Liquidation Alert Threshold</span>
                                <span className="font-mono text-orange-500 font-bold">HF &lt; 1.1</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/30">
                                <span className="text-sm">Target Health Factor</span>
                                <span className="font-mono text-emerald-500 font-bold">HF &gt; 1.5</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
