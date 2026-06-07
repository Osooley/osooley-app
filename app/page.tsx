import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black/[0.06] bg-white">
        <div className="flex items-center gap-3">
          <svg width="36" height="36" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" stroke="#C9A84C" strokeWidth="2" fill="none"/>
            <line x1="16" y1="2" x2="16" y2="30" stroke="#C9A84C" strokeWidth="1.5"/>
            <line x1="2" y1="16" x2="30" y2="16" stroke="#C9A84C" strokeWidth="1.5"/>
          </svg>
          <div>
            <span className="font-serif text-xl text-[#1A1A1A] tracking-tight">Osooly</span>
            <p className="text-[10px] text-[#AAAAAA] uppercase tracking-widest leading-none">Vision. Action. Acquisition.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-[#888888] hover:text-[#1A1A1A] transition-colors">Sign in</Link>
          <Link href="/signup" className="px-5 py-2.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#C9A84C] transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/25 rounded-full px-4 py-1.5 text-xs text-[#C9A84C] uppercase tracking-widest mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] pulse-gold" />
          Cleveland, OH · Pilot Market
        </div>
        <h1 className="text-5xl md:text-6xl font-serif leading-tight text-[#1A1A1A] mb-5">
          Invest in real estate<br />
          with <em className="text-[#C9A84C] italic">clarity</em> and confidence
        </h1>
        <p className="text-lg text-[#888888] leading-relaxed max-w-xl mx-auto mb-10 font-light">
          Built for people who have never invested out of state — or out of their comfort zone.
          Every deal analyzed honestly. Every recommendation backed by real local expertise.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/signup" className="w-full sm:w-auto px-8 py-3.5 bg-[#1A1A1A] text-white font-medium rounded-xl hover:bg-[#C9A84C] transition-all text-center text-sm">
            Find my investor type →
          </Link>
          <Link href="/markets" className="w-full sm:w-auto px-8 py-3.5 bg-transparent text-[#1A1A1A] border border-black/20 rounded-xl hover:border-[#C9A84C] hover:text-[#C9A84C] transition-all text-center text-sm">
            Explore Cleveland ZIPs
          </Link>
        </div>
      </div>

      {/* Trust bar */}
      <div className="border-y border-black/[0.06] bg-white py-4">
        <div className="max-w-4xl mx-auto px-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
          {[
            'Human-powered network',
            'Transparent analysis — no black boxes',
            "We only recommend what we'd buy ourselves",
            '5 vetted ZIPs · Cleveland, OH',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-[#888888]">
              <span className="w-1 h-1 rounded-full bg-[#C9A84C]" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Investor paths */}
      <div className="max-w-4xl mx-auto px-8 py-16">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-[#AAAAAA] mb-10">
          Choose your path
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: '🏠', title: 'Turnkey investor', desc: 'Move-in ready. Tenant placed. Cash flowing from day one. No surprises.', tag: 'Lowest risk entry' },
            { icon: '🔧', title: 'Light rehab', desc: 'A little work for better margins. Cosmetic updates, stronger returns.', tag: 'Better yields' },
            { icon: '♻️', title: 'BRRRR strategy', desc: 'Buy, rehab, rent, refinance, repeat. Recycle your capital and scale.', tag: 'Maximum leverage' },
          ].map((path) => (
            <Link key={path.title} href="/signup"
              className="bg-white border border-black/[0.08] rounded-2xl p-6 hover:border-[#C9A84C]/50 hover:-translate-y-1 transition-all group shadow-sm">
              <div className="text-2xl mb-4">{path.icon}</div>
              <h3 className="text-[#1A1A1A] font-medium mb-2">{path.title}</h3>
              <p className="text-[#888888] text-sm leading-relaxed mb-4">{path.desc}</p>
              <span className="inline-block px-3 py-1 bg-[#C9A84C]/10 border border-[#C9A84C]/25 rounded-full text-xs text-[#C9A84C]">
                {path.tag}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-4xl mx-auto px-8 pb-16">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-[#AAAAAA] mb-10">How it works</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Set your profile', desc: "Three questions. No jargon. We figure out what kind of investor you are — and default to safe if you're not sure." },
            { step: '02', title: 'Explore & analyze', desc: 'Browse our vetted Cleveland ZIPs or bring your own deal. Every property runs through our CMI scoring model.' },
            { step: '03', title: 'Get connected', desc: 'When you\'re ready, we connect you with our vetted agents, PMs, lenders, and contractors.' },
          ].map((item) => (
            <div key={item.step} className="flex gap-4">
              <span className="font-mono text-[#C9A84C]/50 text-sm mt-0.5 flex-shrink-0">{item.step}</span>
              <div>
                <h4 className="text-[#1A1A1A] font-medium mb-1.5">{item.title}</h4>
                <p className="text-[#888888] text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="border-t border-black/[0.06] bg-white px-8 py-6 text-center text-xs text-[#AAAAAA]">
        © {new Date().getFullYear()} Osooly · Cleveland, OH · Beta
      </footer>
    </div>
  )
}
