import Link from 'next/link';
import { LandingCTA } from "@/components/LandingCTA";
import { Button } from "@/components/ui/button";
import { AssetIcon } from "@/components/ui/asset-icon";
import { LoopSelector } from "@/components/LoopSelector";
import { TopLoops } from "@/components/TopLoops";
import { RiskMonitor } from "@/components/RiskMonitor";
import { LiquidationAlerts } from "@/components/LiquidationAlerts";
import { ArrowRight, BarChart3, ShieldCheck, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/30 font-sans overflow-x-hidden">

      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-[#CEFF00]/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 pt-32 pb-20">
        <div className="container max-w-screen-2xl mx-auto px-8 md:px-16">

          {/* Hero Section */}
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
            <div className="space-y-8 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#CEFF00]/10 border border-[#CEFF00]/20 text-[#CEFF00] text-sm font-bold tracking-wide">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#CEFF00] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#CEFF00]"></span>
                </span>
                Live on Binance Smart Chain
              </div>

              <h1 className="text-5xl md:text-7xl font-bold font-outfit leading-[1.1]">
                Your Partner in <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#CEFF00] to-emerald-400">
                  Smarter DeFi
                </span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
                Take control of your crypto with a non-custodial smart wallet.
                Automate your yields, execute complex loop strategies, and manage risk—all in one secure platform.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <LandingCTA />
              </div>

              <div className="pt-8 flex items-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                <span className="text-sm font-bold tracking-widest uppercase text-muted-foreground">Powered By</span>
                <div className="h-8 w-auto flex items-center gap-2 font-bold text-xl">Venus</div>
                <div className="h-8 w-auto flex items-center gap-2 font-bold text-xl">Radiant</div>
                <div className="h-8 w-auto flex items-center gap-2 font-bold text-xl">Kinza</div>
              </div>
            </div>

            {/* Hero Visual - Simplified to just the abstract "Optimization" card */}
            <div className="relative h-[400px] hidden lg:block perspective-1000">
              <div className="absolute top-20 right-10 w-[380px] bg-[#1a1b23]/90 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl transform rotate-y-[-10deg] rotate-x-[5deg] hover:rotate-0 transition-transform duration-700">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 animate-pulse">
                    <Zap size={24} />
                  </div>
                  <div>
                    <div className="font-bold text-xl">Auto-Loop Active</div>
                    <div className="text-sm text-muted-foreground">Optimization running...</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"></div>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground font-mono">
                    <span>Health Factor</span>
                    <span className="text-emerald-500 font-bold">1.25 (Safe)</span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/5 mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold">Net APY</span>
                      <span className="text-emerald-400 font-bold text-lg">+14.2%</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Base: 3.5% + Boost: 10.7%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* New Interactive Section (Strategy Builder & Top Loops) */}
          <div className="space-y-24 mb-32">

            {/* Strategy Builder */}
            <div>
              <div className="text-center max-w-2xl mx-auto mb-12">
                <h2 className="text-3xl font-bold font-outfit mb-4">Build Your Strategy</h2>
                <p className="text-muted-foreground">Advanced loop simulation with real-time risk analysis.</p>
              </div>
              <LoopSelector />
            </div>


            {/* Top Loops */}
            <div>
              <TopLoops />
            </div>

            {/* Risk Management Center */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold tracking-wide">
                  <ShieldCheck size={16} />
                  Advanced Safety Protocols
                </div>
                <h2 className="text-4xl font-bold font-outfit">Never Get Liquidated.</h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  OpButler's "God Mode" dashboard monitors your Health Factor across every protocol in real-time.
                  Set automated deleveraging triggers to protect your collateral while you sleep.
                </p>
                <ul className="space-y-4 pt-4">
                  {[
                    'Real-time Health Factor monitoring across chains',
                    'Automated "Panic Exit" to stablecoins',
                    'SMS & Telegram Liquidation Alerts',
                    'Simulation mode to stress-test your strategy'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 font-bold text-white/80">
                      <div className="h-6 w-6 rounded-full bg-[#CEFF00]/20 flex items-center justify-center text-[#CEFF00]">
                        <Zap size={14} />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative">
                {/* Visual Composition */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-purple-500/10 to-blue-500/10 blur-[100px] rounded-full -z-10"></div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="md:col-span-2 transform hover:scale-[1.02] transition-transform duration-500">
                    {/* Placeholder for RiskMonitor - need to import it first */}
                    <RiskMonitor />
                  </div>
                  <div className="md:col-span-2 transform hover:scale-[1.02] transition-transform duration-500 delay-100">
                    {/* Placeholder for LiquidationAlerts - need to import it first */}
                    <LiquidationAlerts />
                  </div>
                </div>
              </div>
            </div>

          </div>


          {/* Features Section */}
          <div className="py-32 border-t border-white/5">
            <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
              <h2 className="text-4xl font-bold font-outfit">Everything you need, nothing you don't.</h2>
              <p className="text-muted-foreground text-lg">
                We stripped away the complexity of DeFi and built a streamlined interface for pure performance.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: 'Smart Automation',
                  desc: 'Set your target leverage and let our smart contracts handle the looping. No more manual folding.',
                  icon: <Zap className="text-[#CEFF00]" size={32} />,
                  bg: 'bg-[#CEFF00]/5'
                },
                {
                  title: 'Real-Time Analytics',
                  desc: 'Track your Net Worth, APY, and Health Factor across all protocols in one unified dashboard.',
                  icon: <BarChart3 className="text-emerald-400" size={32} />,
                  bg: 'bg-emerald-400/5'
                },
                {
                  title: 'Non-Custodial Security',
                  desc: 'You own your keys. Our Smart Wallet architecture gives you power without giving up control.',
                  icon: <ShieldCheck className="text-purple-400" size={32} />,
                  bg: 'bg-purple-400/5'
                }
              ].map((feature, i) => (
                <div key={i} className={`p-8 rounded-3xl border border-white/5 ${feature.bg} hover:bg-white/5 transition-all duration-300 hover:-translate-y-2`}>
                  <div className="h-14 w-14 rounded-2xl bg-[#0B0B0F] border border-white/10 flex items-center justify-center mb-6 shadow-lg">
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Steps Section */}
          <div className="py-20 bg-gradient-to-b from-transparent to-[#CEFF00]/5 rounded-[3rem] border border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-[#0B0B0F]/80 backdrop-blur-sm -z-10"></div>
            <div className="container max-w-4xl mx-auto px-8">
              <h2 className="text-4xl font-bold font-outfit text-center mb-16">
                Start Earning in 3 Easy Steps
              </h2>

              <div className="space-y-12 relative">
                {/* Line */}
                <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-[#CEFF00] to-transparent md:hidden"></div>

                {[
                  { step: '01', title: 'Connect Wallet', desc: 'Link your MetaMask or TrustWallet securely.' },
                  { step: '02', title: 'Deposit & Enable Smart Account', desc: 'Deploy your personal proxy wallet for advanced strategies.' },
                  { step: '03', title: 'Select Strategy', desc: 'Choose a high-yield loop and let OpButler optimize your returns.' }
                ].map((s, i) => (
                  <div key={i} className="flex gap-8 items-start relative">
                    <div className="h-14 w-14 shrink-0 rounded-full bg-[#CEFF00] text-black font-bold text-xl flex items-center justify-center shadow-[0_0_15px_rgba(206,255,0,0.5)] z-10">
                      {s.step}
                    </div>
                    <div className="pt-2">
                      <h3 className="text-2xl font-bold mb-2">{s.title}</h3>
                      <p className="text-muted-foreground text-lg">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="py-32 text-center">
            <h2 className="text-5xl font-bold font-outfit mb-8">Ready to Optimize?</h2>
            <Link href="/dashboard">
              <Button className="h-16 px-12 text-xl font-bold bg-[#CEFF00] text-black hover:bg-[#b8e600] rounded-full shadow-[0_0_30px_rgba(206,255,0,0.4)] transition-all hover:scale-105">
                Launch OpButler <ArrowRight className="ml-2" />
              </Button>
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}
