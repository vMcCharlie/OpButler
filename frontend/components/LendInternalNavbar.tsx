'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { HandCoins, Wallet, Layers, Repeat } from 'lucide-react';

const TABS = [
    { id: 'earn', label: 'Earn', href: '/lend/earn', icon: HandCoins },
    { id: 'borrow', label: 'Borrow', href: '/lend/borrow', icon: Wallet },
    { id: 'multiply', label: 'Multiply', href: '/lend/multiply', icon: Layers },
    { id: 'refinance', label: 'Refinance', href: '/lend/refinance', icon: Repeat },
];

export function LendInternalNavbar() {
    const pathname = usePathname();

    return (
        <div className="flex justify-center w-full mb-8">
            <div className="flex p-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-sm relative">
                {TABS.map((tab) => {
                    const isActive = pathname === tab.href;
                    return (
                        <Link
                            key={tab.id}
                            href={tab.href}
                            className={cn(
                                "relative px-6 py-2 rounded-full text-sm font-bold transition-colors flex items-center gap-2 z-10",
                                isActive ? "text-black" : "text-muted-foreground hover:text-white"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="active-lend-pill"
                                    className="absolute inset-0 bg-[#CEFF00] rounded-full -z-10 shadow-[0_0_20px_rgba(206,255,0,0.3)]"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
