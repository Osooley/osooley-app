import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, goal, risk_tolerance')
    .eq('id', user!.id)
    .single()

  const { data: properties } = await supabase
    .from('properties')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const { data: analyses } = await supabase
    .from('analyses')
    .select('coc_return, dscr, proj_base_5yr, verdict, property_id')

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Investor'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const analysisMap = Object.fromEntries((analyses ?? []).map(a => [a.property_id, a]))
  const networkDeals = properties?.filter(p => p.network_verified) ?? []
  const selfDeals = properties?.filter(p => !p.network_verified) ?? []
  const bestCoC = Math.max(...(analyses?.map(a => a.coc_return ?? 0) ?? [0]))

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-3xl font-serif text-[#1A1A1A]">{greeting}, {firstName}</h1>
          <p className="text-[#888888] text-sm mt-1">{profile?.goal ?? 'Hybrid'} goal · {profile?.risk_tolerance ?? 'Moderate'} risk · Cleveland, OH</p>
        </div>
        <Link href="/analyze" className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-xl hover:bg-[#C9A84C] transition-colors">
          + Analyze a property
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Deals tracked', value: properties?.length ?? 0, sub: 'across all stages' },
          { label: 'Best CoC found', value: `${bestCoC > 0 ? bestCoC.toFixed(1) : '—'}%`, sub: 'vs 4.8% HYSA', gold: true },
          { label: 'Avg 5yr gain', value: '$50k+', sub: 'base case estimate' },
          { label: 'Network contacts', value: '6', sub: 'Agents · PMs · Lenders' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-black/[0.08] rounded-xl p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-[#AAAAAA] mb-1.5">{stat.label}</p>
            <p className={`text-2xl font-medium ${stat.gold ? 'text-[#C9A84C]' : 'text-[#1A1A1A]'}`}>{stat.value}</p>
            <p className="text-xs text-[#AAAAAA] mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      <SectionLabel>Network deals — matched to your profile</SectionLabel>
      <div className="space-y-3 mb-8">
        {networkDeals.length === 0 ? (
          <EmptyState>No network deals yet. Your agent will push verified deals directly here.</EmptyState>
        ) : networkDeals.map(p => <DealCard key={p.id} property={p} analysis={analysisMap[p.id]} />)}
      </div>

      <SectionLabel>Properties you brought in</SectionLabel>
      <div className="space-y-3 mb-8">
        {selfDeals.length === 0 ? (
          <EmptyState><Link href="/analyze" className="text-[#C9A84C] hover:text-[#B8973E] transition-colors">Analyze a property from Redfin or Zillow →</Link></EmptyState>
        ) : selfDeals.map(p => <DealCard key={p.id} property={p} analysis={analysisMap[p.id]} />)}
      </div>

      <div className="bg-[#C9A84C]/8 border border-[#C9A84C]/20 rounded-xl p-4 flex gap-3">
        <span className="text-base flex-shrink-0 mt-0.5">📚</span>
        <div>
          <p className="text-sm text-[#1A1A1A] font-medium mb-1">Why real estate beats a savings account</p>
          <p className="text-xs text-[#888888] leading-relaxed">
            A 6% cash-on-cash return sounds similar to a 5% HYSA — until you add appreciation, equity paydown, tax benefits, and the power of leverage. Our 5-year projections stack all five return drivers so you see the full picture.
          </p>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#AAAAAA]">{children}</p>
      <div className="flex-1 h-px bg-black/[0.06]" />
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="bg-white border border-black/[0.08] rounded-xl px-5 py-4 text-sm text-[#888888] shadow-sm">{children}</div>
}

function DealCard({ property: p, analysis: a }: { property: any; analysis: any }) {
  const statusColors: Record<string, string> = {
    exploring: 'text-[#AAAAAA]',
    interested: 'text-[#C9A84C]',
    offer_submitted: 'text-[#C9A84C]',
    under_contract: 'text-[#2E7D5E]',
    closed: 'text-[#2E7D5E]',
    passed: 'text-red-500',
  }

  const cocGrade = a?.coc_return >= 8 ? 'A' : a?.coc_return >= 6 ? 'B+' : a?.coc_return >= 4 ? 'B' : a?.coc_return > 0 ? 'B-' : '—'
  const gradeColor = cocGrade === 'A' ? 'bg-[#2E7D5E]/15 text-[#2E7D5E]' : cocGrade.startsWith('B') ? 'bg-[#C9A84C]/15 text-[#C9A84C]' : 'bg-black/5 text-[#888888]'

  return (
    <Link href={`/analyze?id=${p.id}`}
      className={`bg-white border border-black/[0.08] rounded-xl px-5 py-4 flex items-center gap-4 hover:border-[#C9A84C]/40 transition-all shadow-sm ${p.network_verified ? 'border-l-2 border-l-[#C9A84C]' : ''}`}>
      <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 ${p.network_verified ? 'bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/25' : 'bg-black/5 text-[#888888] border border-black/10'}`}>
        {p.network_verified ? 'Network verified' : 'Self-submitted'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[#1A1A1A] text-sm font-medium truncate">{p.address}, {p.city} {p.zip}</p>
        <p className="text-[#888888] text-xs mt-0.5">
          {p.property_type?.toUpperCase()} · {p.bedrooms}bd/{p.bathrooms}ba · {p.year_built} ·
          <span className={` ml-1 ${statusColors[p.status] ?? 'text-[#888888]'}`}>{p.status?.replace(/_/g, ' ')}</span>
        </p>
      </div>
      {a && (
        <div className="hidden md:flex gap-5 flex-shrink-0">
          {[
            { label: 'CoC', value: a.coc_return ? `${a.coc_return}%` : '—', good: a.coc_return >= 7 },
            { label: 'DSCR', value: a.dscr ? `${a.dscr}x` : '—', good: a.dscr >= 1.2 },
            { label: '5yr gain', value: a.proj_base_5yr ? `$${Math.round(a.proj_base_5yr / 1000)}k` : '—' },
          ].map(m => (
            <div key={m.label} className="text-right">
              <p className="text-[10px] text-[#AAAAAA] uppercase tracking-wider">{m.label}</p>
              <p className={`text-sm font-medium mt-0.5 ${(m as any).good ? 'text-[#2E7D5E]' : 'text-[#1A1A1A]'}`}>{m.value}</p>
            </div>
          ))}
        </div>
      )}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold font-serif flex-shrink-0 ${gradeColor}`}>
        {cocGrade}
      </div>
    </Link>
  )
}
