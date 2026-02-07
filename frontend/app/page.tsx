import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { AssetIcon } from "@/components/ui/asset-icon";
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
          <div className="grid lg:grid-cols-2 gap-16 items-center">
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
                <Link href="/dashboard">
                  <Button className="h-14 px-8 text-lg font-bold bg-[#CEFF00] text-black hover:bg-[#b8e600] rounded-full shadow-[0_0_20px_rgba(206,255,0,0.3)] transition-all hover:scale-105">
                    Launch App
                  </Button>
                </Link>
                <Button variant="outline" className="h-14 px-8 text-lg font-bold border-white/10 hover:bg-white/5 rounded-full text-white">
                  View Strategies
                </Button>
              </div>

              <div className="pt-8 flex items-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                <span className="text-sm font-bold tracking-widest uppercase text-muted-foreground">Powered By</span>
                <div className="h-8 w-auto flex items-center gap-2 font-bold text-xl">Venus</div>
                <div className="h-8 w-auto flex items-center gap-2 font-bold text-xl">Radiant</div>
                <div className="h-8 w-auto flex items-center gap-2 font-bold text-xl">Kinza</div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative h-[600px] hidden lg:block perspective-1000">
              {/* Floating Cards Mockup */}
              <div className="absolute top-10 left-10 w-[380px] bg-[#121216] border border-white/10 rounded-2xl p-6 shadow-2xl transform rotate-y-[-10deg] rotate-x-[5deg] hover:rotate-0 transition-transform duration-700 z-20">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <AssetIcon symbol="USDT" size={40} />
                    <div>
                      <div className="font-bold">USDT Strategy</div>
                      <div className="text-xs text-muted-foreground">Loop 3x • Low Risk</div>
                    </div>
                  </div>
                  <div className="text-[#CEFF00] font-bold text-xl">14.2% APY</div>
                </div>
                <div className="h-24 bg-gradient-to-r from-[#CEFF00]/20 to-transparent rounded-lg mb-4 relative overflow-hidden">
                  <div className="absolute bottom-0 left-0 w-full h-1/2 bg-[#CEFF00]/10 blur-xl"></div>
                  {/* Fake Chart Line */}
                  <svg className="absolute bottom-0 left-0 w-full h-full" preserveAspectRatio="none">
                    <path d="M0,80 C50,70 100,20 150,40 C200,60 250,10 300,30 L380,80" stroke="#CEFF00" fill="none" strokeWidth="2" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Supply</span>
                    <span>$10,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Borrow</span>
                    <span>$7,500</span>
                  </div>
                </div>
              </div>

              <div className="absolute top-40 right-0 w-[320px] bg-[#1a1b23]/90 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl transform rotate-y-[-10deg] rotate-x-[5deg] translate-z-[-50px] z-10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-10 w-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500">
                    <Zap size={20} />
                  </div>
                  <div>
                    <div className="font-bold">Auto-Loop Active</div>
                    <div className="text-xs text-muted-foreground">Optimization running...</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-emerald-500 rounded-full"></div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Health Factor</span>
                    <span className="text-emerald-500">1.25 (Safe)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="py-32">
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
