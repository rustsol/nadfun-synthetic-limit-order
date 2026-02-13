'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const sections = [
  { id: 'hero' },
  { id: 'problem' },
  { id: 'solution' },
  { id: 'triggers' },
  { id: 'ai' },
  { id: 'architecture' },
  { id: 'cta' },
];

function useInView(id: string) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = document.getElementById(id);
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [id]);
  return visible;
}

function FadeIn({ id, children, className = '' }: { id: string; children: React.ReactNode; className?: string }) {
  const visible = useInView(id);
  return (
    <div
      id={id}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-bold">
            <span className="text-orange-500">Synthetic</span> Order Flow
          </span>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition hidden sm:block">Features</a>
            <a href="#triggers" className="text-sm text-gray-400 hover:text-white transition hidden sm:block">Triggers</a>
            <a href="#ai" className="text-sm text-gray-400 hover:text-white transition hidden sm:block">AI</a>
            <Link
              href="/dashboard"
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition"
            >
              Launch App
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center text-center px-6 pt-20">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-orange-500/10 blur-[120px] animate-pulse" />
          <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-blue-500/8 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        {/* Grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        <FadeIn id="hero" className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-block px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold tracking-wider uppercase mb-8">
            Moltiverse Hackathon 2026
          </div>
          <h1 className="text-5xl sm:text-7xl font-black leading-tight text-center">
            <span className="text-orange-500">Synthetic</span><br />
            <span className="text-white">Order Flow</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-xl mx-auto text-center leading-relaxed">
            Autonomous AI-agent powered limit orders for tokens on Monad.
            Set your conditions, fund your agent, walk away.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/dashboard"
              className="px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition text-lg shadow-lg shadow-orange-500/20"
            >
              Launch App
            </Link>
            <Link
              href="/guide"
              className="px-8 py-3.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition text-lg border border-white/10"
            >
              Read Guide
            </Link>
          </div>
          <div className="mt-8 inline-flex items-center gap-2 text-sm text-gray-500">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Monad Mainnet, Chain ID: 143
          </div>
        </FadeIn>
      </section>

      {/* Problem */}
      <section id="features" className="py-24 px-6">
        <FadeIn id="problem" className="max-w-5xl mx-auto text-center">
          <div className="inline-block px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold tracking-wider uppercase mb-6">
            The Problem
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            No limit orders on nad.fun
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-12 text-center">
            Traders can only execute market orders. No way to set price targets, DCA schedules, or trailing stops.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-[#111118] border border-white/5 rounded-2xl p-6 text-center">
              <div className="text-3xl mb-3">&#9200;</div>
              <h3 className="font-semibold text-white mb-2">Manual Trading</h3>
              <p className="text-sm text-gray-500">Watch charts 24/7, execute manually, miss targets while sleeping</p>
            </div>
            <div className="bg-[#111118] border border-white/5 rounded-2xl p-6 text-center">
              <div className="text-3xl mb-3">&#10060;</div>
              <h3 className="font-semibold text-white mb-2">No Automation</h3>
              <p className="text-sm text-gray-500">No stop losses, take profits, DCA, or trailing stops available</p>
            </div>
            <div className="bg-[#111118] border border-white/5 rounded-2xl p-6 text-center">
              <div className="text-3xl mb-3">&#128148;</div>
              <h3 className="font-semibold text-white mb-2">Missed Moves</h3>
              <p className="text-sm text-gray-500">Price dips and graduation events happen when you are away</p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Solution - How it works */}
      <section className="py-24 px-6 bg-[#0d0d14]">
        <FadeIn id="solution" className="max-w-3xl mx-auto text-center">
          <div className="inline-block px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold tracking-wider uppercase mb-6">
            How It Works
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
            5 steps. Fully autonomous.
          </h2>
          <div className="space-y-6 text-left max-w-lg mx-auto">
            {[
              { n: '1', t: 'Connect wallet', d: 'MetaMask or WalletConnect on Monad' },
              { n: '2', t: 'Create agent wallet', d: 'System generates an encrypted wallet for auto-execution' },
              { n: '3', t: 'Fund and create orders', d: 'Choose from 12 trigger types, set your parameters' },
              { n: '4', t: 'Agent monitors 24/7', d: 'Checks on-chain state every 5 seconds via Lens multicall' },
              { n: '5', t: 'Auto-executes on-chain', d: 'Agent wallet signs and submits the transaction. No manual signing.' },
            ].map(s => (
              <div key={s.n} className="flex items-start gap-4">
                <div className="w-10 h-10 min-w-[40px] rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center font-bold text-sm">
                  {s.n}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{s.t}</h3>
                  <p className="text-sm text-gray-500">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* 12 Trigger Types */}
      <section id="triggers" className="py-24 px-6">
        <FadeIn id="triggers-content" className="max-w-5xl mx-auto text-center">
          <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wider uppercase mb-6">
            12 Trigger Types
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-10">
            Every trading scenario covered
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-4xl mx-auto">
            {[
              { code: 'PRICE_BELOW', desc: 'Buy when price drops to target', buy: true },
              { code: 'PRICE_ABOVE', desc: 'Sell when price rises to target', buy: false },
              { code: 'MCAP_BELOW', desc: 'Buy when market cap drops', buy: true },
              { code: 'MCAP_ABOVE', desc: 'Sell when market cap exceeds target', buy: false },
              { code: 'PROGRESS_BELOW', desc: 'Buy early on bonding curve', buy: true },
              { code: 'PROGRESS_ABOVE', desc: 'Sell near graduation', buy: false },
              { code: 'DCA_INTERVAL', desc: 'Recurring buys at fixed intervals', buy: true },
              { code: 'POST_GRADUATION', desc: 'Sell when token graduates to DEX', buy: false },
              { code: 'PRICE_DROP_PCT', desc: 'Buy after X% price drop', buy: true },
              { code: 'TRAILING_STOP', desc: 'Sell after X% drop from peak', buy: false },
              { code: 'STOP_LOSS', desc: 'Sell after X% loss from entry', buy: false },
              { code: 'TAKE_PROFIT', desc: 'Sell after X% gain from entry', buy: false },
            ].map(t => (
              <div key={t.code} className="flex items-center gap-3 bg-[#111118] border border-white/5 rounded-xl px-4 py-3">
                <span className={`w-2 h-2 rounded-full min-w-[8px] ${t.buy ? 'bg-green-500' : 'bg-red-500'}`} />
                <code className="text-xs font-mono min-w-[130px] text-white">{t.code}</code>
                <span className="text-xs text-gray-500">{t.desc}</span>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* AI Section */}
      <section id="ai" className="py-24 px-6 bg-[#0d0d14]">
        <FadeIn id="ai-content" className="max-w-5xl mx-auto text-center">
          <div className="inline-block px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold tracking-wider uppercase mb-6">
            AI-Powered
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            4 providers, 5 capabilities
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-10 text-center">
            Groq, Claude, GPT-4o, Gemini with automatic fallback. Bring your own API keys.
          </p>

          {/* Chat demo */}
          <div className="max-w-lg mx-auto mb-12 bg-[#111118] border border-white/5 rounded-2xl p-5 text-left">
            <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-3 text-center">AI Chat Demo</div>
            <div className="ml-auto max-w-[80%] bg-orange-500 text-white rounded-2xl px-4 py-2.5 text-sm mb-3">
              Buy 0.05 MON of CHOG when market cap drops below 8000
            </div>
            <div className="max-w-[80%] bg-[#1e1e2e] text-gray-200 rounded-2xl px-4 py-2.5 text-sm mb-3">
              I will create a BUY order for CHOG:<br />
              Trigger: MCAP_BELOW at 8,000 MON<br />
              Amount: 0.05 MON<br /><br />
              Should I create this order?
            </div>
            <div className="ml-auto max-w-[80%] bg-orange-500 text-white rounded-2xl px-4 py-2.5 text-sm mb-3">
              Yes
            </div>
            <div className="max-w-[80%] bg-[#1e1e2e] text-gray-200 rounded-2xl px-4 py-2.5 text-sm">
              Done! Your order has been created.
              <span className="inline-block mt-1.5 px-2.5 py-1 bg-green-900/40 border border-green-700/40 rounded text-[11px] text-green-400">
                Order created (ID: clx8f2k9...)
              </span>
            </div>
          </div>

          {/* Capabilities */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="bg-[#111118] border border-white/5 rounded-2xl p-5 text-center">
              <div className="text-2xl mb-2">&#128200;</div>
              <h3 className="font-semibold text-white text-sm mb-1">Token Analysis</h3>
              <p className="text-xs text-gray-500">On-demand market data analysis for any token</p>
            </div>
            <div className="bg-[#111118] border border-white/5 rounded-2xl p-5 text-center">
              <div className="text-2xl mb-2">&#127919;</div>
              <h3 className="font-semibold text-white text-sm mb-1">Strategy Suggestions</h3>
              <p className="text-xs text-gray-500">AI recommends optimal trigger type and value</p>
            </div>
            <div className="bg-[#111118] border border-white/5 rounded-2xl p-5 text-center">
              <div className="text-2xl mb-2">&#128737;</div>
              <h3 className="font-semibold text-white text-sm mb-1">Risk Check</h3>
              <p className="text-xs text-gray-500">Opt-in pre-execution risk assessment</p>
            </div>
          </div>

          {/* Providers */}
          <div className="flex items-center justify-center gap-4 mt-10 flex-wrap">
            {['Groq', 'Claude', 'GPT-4o', 'Gemini'].map(p => (
              <div key={p} className="px-5 py-2.5 bg-[#111118] border border-white/5 rounded-xl text-sm font-medium text-gray-300">
                {p}
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* Architecture */}
      <section className="py-24 px-6">
        <FadeIn id="arch-content" className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wider uppercase mb-6">
            Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-10">
            Full-stack monorepo
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="bg-[#111118] border border-white/5 rounded-2xl p-5 text-center flex-1 max-w-[220px]">
              <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">Frontend</div>
              <div className="font-semibold text-white">Next.js 15</div>
              <div className="text-[11px] text-gray-500 mt-1">RainbowKit, wagmi, Tailwind</div>
            </div>
            <div className="text-2xl text-orange-500">&#8594;</div>
            <div className="bg-[#111118] border border-white/5 rounded-2xl p-5 text-center flex-1 max-w-[220px]">
              <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">Agent</div>
              <div className="font-semibold text-white">Express + TS</div>
              <div className="text-[11px] text-gray-500 mt-1">Monitor, AI, SSE, execution</div>
            </div>
            <div className="text-2xl text-orange-500">&#8594;</div>
            <div className="bg-[#111118] border border-white/5 rounded-2xl p-5 text-center flex-1 max-w-[220px]">
              <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">Blockchain</div>
              <div className="font-semibold text-white">Monad (143)</div>
              <div className="text-[11px] text-gray-500 mt-1">BondingCurve + DEX routers</div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
            <div className="px-4 py-2 bg-[#111118] border border-white/5 rounded-xl text-xs text-gray-400">
              MySQL + Prisma
            </div>
            <div className="px-4 py-2 bg-[#111118] border border-white/5 rounded-xl text-xs text-gray-400">
              AES-256-CBC + scrypt
            </div>
            <div className="px-4 py-2 bg-[#111118] border border-white/5 rounded-xl text-xs text-gray-400">
              SSE Real-time Events
            </div>
          </div>
        </FadeIn>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 text-center relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-orange-500/10 blur-[120px]" />
        </div>
        <FadeIn id="cta-content" className="relative z-10">
          <h2 className="text-4xl sm:text-5xl font-black text-center mb-4">
            Start trading <span className="text-orange-500">autonomously</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-lg mx-auto mb-8 text-center">
            12 trigger types. 4 AI providers. Fully autonomous execution. Built on Monad.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-10 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition text-xl shadow-lg shadow-orange-500/25"
          >
            Launch App
          </Link>
          <div className="mt-6 font-mono text-sm text-gray-600">
            devnads.xyz
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 text-center">
        <p className="text-xs text-gray-600">
          Built for the Moltiverse Hackathon 2026. Not audited. Use at your own risk.
        </p>
      </footer>
    </div>
  );
}
