'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './theme-toggle';

export function Navbar() {
    const pathname = usePathname();

    const navLinks = [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Portfolio', href: '/portfolio' },
        // { name: 'Strategies', href: '/strategies' }, // Future: Dedicated strategies page
    ];

    return (
        <nav className="fixed top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl shadow-lg shadow-black/5">
            <div className="container flex h-20 max-w-screen-2xl items-center justify-between px-8 md:px-16">
                <Link href="/" className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-border shadow-sm bg-card">
                        <Image
                            src="/OpButler.png"
                            alt="OpButler Logo"
                            fill
                            className="object-cover"
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
                                className={`text-sm font-medium transition-colors hover:text-primary ${pathname === link.href ? 'text-primary' : 'text-muted-foreground'
                                    }`}
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

                    <ThemeToggle />
                    <ConnectButton showBalance={false} accountStatus="address" chainStatus="icon" />
                </div>
            </div>
        </nav>
    );
}
