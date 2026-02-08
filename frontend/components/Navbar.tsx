'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from "@/components/ui/button";
import { Wallet } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';


export function Navbar() {
    const pathname = usePathname();

    const navLinks = [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Lend', href: '/strategy' },
        { name: 'Portfolio', href: '/portfolio' },
        { name: 'Settings', href: '/settings' },
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

                <div className="flex items-center gap-8">
                    {/* Navigation Links */}
                    <div className="hidden md:flex gap-6">
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

                    {/* Notification Bell */}
                    <div className="relative cursor-pointer group">
                        <div className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse border border-background"></div>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors"
                        >
                            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                        </svg>
                        {/* Tooltip / Dropdown Placeholder */}
                        <div className="absolute right-0 top-8 w-64 p-4 bg-popover border border-border rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                            <h4 className="text-xs font-bold text-foreground mb-2 uppercase tracking-wider">Notifications</h4>
                            <div className="text-xs text-red-400 border-l-2 border-red-500 pl-2">
                                Liquidation Risk: Health Factor dropped below 1.1 on Venus!
                            </div>
                        </div>
                    </div>


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
            </div>
        </nav>
    );
}
