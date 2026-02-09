import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google'; // Added Outfit for headings
import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from './providers';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Navbar } from "@/components/Navbar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'OpButler',
  description: 'Automated DeFi strategies on BNB Chain.',
  icons: {
    icon: [
      { url: '/favicons/favicon.ico' },
      { url: '/favicons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/favicons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'apple-touch-icon-precomposed',
        url: '/favicons/apple-touch-icon.png',
      },
    ],
  },
  manifest: '/favicons/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen font-sans antialiased selection:bg-primary/20 pb-20 md:pb-0", inter.variable, outfit.variable)}>
        <Providers>
          <Navbar />
          {children}
          <MobileBottomNav />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
