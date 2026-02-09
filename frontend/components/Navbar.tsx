'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from "@/components/ui/button";
import { Wallet, Menu, X, Settings } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';


export function Navbar() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navLinks = [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Lend', href: '/lend' },
        { name: 'Portfolio', href: '/portfolio' },

    ];

    return (
        <nav className="fixed top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl shadow-lg shadow-black/5">
            <div className="container flex h-20 max-w-screen-2xl items-center justify-between px-8 md:px-16">
                <Link href="/" className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="relative h-12 w-12">
                        <Image
                            src="/OpButler.png"
                            alt="OpButler Logo"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <span className="font-outfit font-bold text-2xl tracking-wide text-foreground drop-shadow-md">OpButler</span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-8">
                    {/* Navigation Links */}
                    <div className="flex gap-6">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`text-sm font-medium transition-colors hover:text-primary ${pathname === link.href ? 'text-primary' : 'text-muted-foreground'}`}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>

                    <Link href="/settings">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-10 h-10 rounded-full bg-[#1A1A1E] hover:bg-[#2A2A2E] text-white border border-white/5"
                        >
                            <Settings className="w-5 h-5" />
                        </Button>
                    </Link>

                    <ConnectButton.Custom>
                        {({
                            account,
                            chain,
                            openAccountModal,
                            openChainModal,
                            openConnectModal,
                            authenticationStatus,
                            mounted,
                        }) => {
                            const ready = mounted && authenticationStatus !== 'loading';
                            const connected =
                                ready &&
                                account &&
                                chain &&
                                (!authenticationStatus ||
                                    authenticationStatus === 'authenticated');

                            return (
                                <div
                                    {...(!ready && {
                                        'aria-hidden': true,
                                        'style': {
                                            opacity: 0,
                                            pointerEvents: 'none',
                                            userSelect: 'none',
                                        },
                                    })}
                                >
                                    {(() => {
                                        if (!connected) {
                                            return (
                                                <Button
                                                    onClick={openConnectModal}
                                                    className="h-10 px-6 font-bold bg-[#CEFF00] text-black hover:bg-[#b8e600] rounded-full shadow-lg hover:shadow-[0_0_15px_rgba(206,255,0,0.4)] transition-all flex items-center gap-2"
                                                >
                                                    Connect Wallet <Wallet className="h-4 w-4" />
                                                </Button>
                                            );
                                        }

                                        if (chain.unsupported) {
                                            return (
                                                <Button
                                                    onClick={openChainModal}
                                                    variant="destructive"
                                                    className="h-10 px-4 rounded-full"
                                                >
                                                    Wrong Network
                                                </Button>
                                            );
                                        }

                                        return (
                                            <div style={{ display: 'flex', gap: 12 }}>
                                                <Button
                                                    onClick={openChainModal}
                                                    variant="outline"
                                                    className="h-10 px-4 rounded-full border-white/10 hover:bg-white/5"
                                                    style={{ display: 'flex', alignItems: 'center' }}
                                                >
                                                    {chain.hasIcon && (
                                                        <div
                                                            style={{
                                                                background: chain.iconBackground,
                                                                width: 20,
                                                                height: 20,
                                                                borderRadius: 999,
                                                                overflow: 'hidden',
                                                                marginRight: 4,
                                                            }}
                                                        >
                                                            {chain.iconUrl && (
                                                                <img
                                                                    alt={chain.name ?? 'Chain icon'}
                                                                    src={chain.iconUrl}
                                                                    style={{ width: 20, height: 20 }}
                                                                />
                                                            )}
                                                        </div>
                                                    )}
                                                    {chain.name}
                                                </Button>

                                                <Button
                                                    onClick={openAccountModal}
                                                    className="h-10 px-4 rounded-full bg-secondary text-foreground hover:bg-secondary/80 font-mono"
                                                >
                                                    {account.displayName}
                                                </Button>
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        }}
                    </ConnectButton.Custom>
                </div>

                {/* Mobile Menu Toggle */}
                <div className="md:hidden flex items-center gap-4">
                    <ConnectButton.Custom>
                        {({
                            account,
                            chain,
                            openConnectModal,
                            authenticationStatus,
                            mounted,
                        }) => {
                            const ready = mounted && authenticationStatus !== 'loading';
                            const connected = ready && account && chain && (!authenticationStatus || authenticationStatus === 'authenticated');

                            if (!connected) {
                                return (
                                    <Button
                                        size="sm"
                                        onClick={openConnectModal}
                                        className="h-9 px-4 font-bold bg-[#CEFF00] text-black hover:bg-[#b8e600] rounded-full"
                                    >
                                        Connect
                                    </Button>
                                )
                            }
                            return null; // Don't show full connected state here to save space, or show simplified
                        }}
                    </ConnectButton.Custom>

                    <button
                        className="text-white p-2"
                        onClick={() => setIsMobileMenuOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col p-8 md:hidden">
                    <div className="flex justify-between items-center mb-12">
                        <span className="font-outfit font-bold text-2xl tracking-wide text-foreground">OpButler</span>
                        <button
                            className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <X className="w-8 h-8" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-8 text-center">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`text-2xl font-bold transition-colors ${pathname === link.href ? 'text-[#CEFF00]' : 'text-muted-foreground hover:text-white'}`}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>

                    <div className="mt-auto flex flex-col gap-4">
                        <div className="w-full flex justify-center">
                            <ConnectButton />
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
