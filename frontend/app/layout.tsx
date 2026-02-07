import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google'; // Added Outfit for headings
import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from './providers';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'OpButler - Sphere UI',
  description: 'Automated DeFi strategies on BNB Chain.',
  icons: {
    icon: '/OpButler.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen font-sans antialiased selection:bg-primary/20", inter.variable, outfit.variable)}>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
