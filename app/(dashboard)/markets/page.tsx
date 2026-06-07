import { createClient } from '@/lib/supabase/server'

export default async function MarketsPage() {
  const supabase = await createClient()
  const { data: zips } = await supabase
    .from('zip_cmi')
    .select('*')
    .order('total_score', { ascending: false })

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-[#1A1A1A] mb-2">Cleveland market explorer</h1>
        <p className="text-[#888888] text-sm max-w-xl">
          Five vetted ZIP codes scored by our proprietary Cleveland Market Index (CMI).
          Built from real PM vacancy data, agent comps, and network intelligence — not Zillow estimates.
        </p>
      </div>

      {/* Two-axis legend */}
      <div className="card p-5 mb-6 flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-gold mb-2 font-semibold">Market quality score</p>
          <p className="text-sm text-[#888888] leading-relaxed">
            Is this a good place to own rental property? Scores rental demand, appreciation potential, risk environment, and deal quality. Max 100.
          </p>
        </div>
        <div className="w-px bg-white/[0.06] hidden md:block" />
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-gold mb-2 font-semibold">Entry opportunity score</p>
          <p className="text-sm text-[#888888] leading-relaxed">
            Can you actually get a good deal here now? Scores entry price, investor saturation, negotiation room, and deal availability. Separate from quality — great markets can be fully priced in.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {zips?.map(zip => <ZipCard key={zip.zip} zip={zip} />)}
      </div>

      <div className="mt-8 bg-gold/5 border border-gold/12 rounded-xl p-5 flex gap-3">
        <span className="text-base flex-shrink-0">💡</span>
        <div>
          <p className="text-sm text-[#1A1A1A] font-medium mb-1">Out-of-network property?</p>
          <p className="text-xs text-[#888888] leading-relaxed">
            You can analyze any property — not just our five target ZIPs. The financial model runs the same. We'll flag that our network data is limited for that area and be clear about what we know versus what we're estimating.
          </p>
        </div>
      </div>
    </div>
  )
}

function ZipCard({ zip }: { zip: any }) {
  const gradeColor: Record<string, string> = {
    'A+': 'bg-[#2E7D5E]/15 text-[#5EC89A]',
    'A-': 'bg-[#2E7D5E]/15 text-[#5EC89A]',
    'B+': 'bg-gold/12 text-gold',
    'B':  'bg-gold/12 text-gold',
    'B-': 'bg-[#B8760A]/15 text-[#E8A020]',
    'C':  'bg-red-500/12 text-red-400',
    'D':  'bg-red-500/20 text-red-400',
  }

  const tierColors: Record<string, string> = {
    turnkey: 'text-[#5EC89A] border-[#2E7D5E]/30 bg-[#2E7D5E]/8',
    rehab:   'text-gold border-gold/30 bg-gold/7',
    brrrr:   'text-[#888888] border-slate/30 bg-slate/7',
  }

  const entryLabel = zip.entry_opportunity_score >= 75
    ? { text: 'High opportunity', color: 'text-[#5EC89A]' }
    : zip.entry_opportunity_score >= 55
    ? { text: 'Moderate entry', color: 'text-gold' }
    : { text: 'Premium / competitive', color: 'text-[#888888]' }

  const riskPct = Math.round((5 - zip.risk_env_score / 5) * 20)

  return (
    <details className="card group">
      <summary className="px-6 py-5 flex items-center gap-4 cursor-pointer list-none hover:bg-[#F5F0E8]/20 transition-colors rounded-2xl">
        {/* ZIP */}
        <div className="flex-shrink-0 w-24">
          <p className="font-mono text-xl font-medium text-[#1A1A1A]">{zip.zip}</p>
          <p className="text-xs text-[#888888] mt-0.5">{zip.neighborhood}</p>
        </div>

        {/* CMI grade */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold font-serif flex-shrink-0 ${gradeColor[zip.grade] ?? 'bg-slate/20 text-[#888888]'}`}>
          {zip.grade}
        </div>

        {/* Scores bar */}
        <div className="flex-1 hidden md:block">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[#888888]">Market quality</span>
            <span className="text-[#1A1A1A] font-medium">{zip.total_score}/100</span>
          </div>
          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div className="h-full bg-gold rounded-full" style={{ width: `${zip.total_score}%` }} />
          </div>
        </div>

        {/* Key metrics */}
        <div className="hidden md:flex gap-6 flex-shrink-0 text-right">
          <div>
            <p className="text-[10px] text-[#888888] uppercase tracking-wider">Avg yield</p>
            <p className="text-sm font-medium text-[#5EC89A] mt-0.5">{zip.avg_yield_low}–{zip.avg_yield_high}%</p>
          </div>
          <div>
            <p className="text-[10px] text-[#888888] uppercase tracking-wider">3yr appreciation</p>
            <p className="text-sm font-medium text-[#1A1A1A] mt-0.5">+{zip.appreciation_3yr}%</p>
          </div>
          <div>
            <p className="text-[10px] text-[#888888] uppercase tracking-wider">Entry</p>
            <p className={`text-sm font-medium mt-0.5 ${entryLabel.color}`}>{zip.entry_opportunity_score}</p>
          </div>
        </div>

        {/* Expand arrow */}
        <span className="text-[#AAAAAA] group-open:rotate-90 transition-transform ml-2">›</span>
      </summary>

      {/* Expanded detail */}
      <div className="px-6 pb-6 pt-2 border-t border-black/[0.05] mt-0 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {/* CMI breakdown */}
          <div className="card-inner p-4">
            <p className="text-xs uppercase tracking-wider text-[#AAAAAA] mb-3 font-semibold">CMI breakdown</p>
            {[
              { label: 'Rental demand', score: zip.rental_demand_score, max: 25 },
              { label: 'Appreciation', score: zip.appreciation_score, max: 25 },
              { label: 'Risk environment', score: zip.risk_env_score, max: 25 },
              { label: 'Deal quality', score: zip.deal_quality_score, max: 25 },
            ].map(item => (
              <div key={item.label} className="mb-2.5">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#888888]">{item.label}</span>
                  <span className="text-[#1A1A1A]">{item.score}/{item.max}</span>
                </div>
                <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full bg-gold/60 rounded-full" style={{ width: `${(item.score / item.max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Market insights */}
          <div className="card-inner p-4">
            <p className="text-xs uppercase tracking-wider text-[#AAAAAA] mb-3 font-semibold">Market insights</p>
            <div className="space-y-3">
              {(zip.insights ?? []).map((insight: string, i: number) => (
                <p key={i} className="text-xs text-[#888888] leading-relaxed pl-3 border-l-2 border-gold/30">
                  {insight}
                </p>
              ))}
            </div>
          </div>

          {/* Network notes */}
          <div className="card-inner p-4">
            <p className="text-xs uppercase tracking-wider text-[#AAAAAA] mb-3 font-semibold">Network says</p>
            <p className="text-xs text-[#888888] leading-relaxed pl-3 border-l-2 border-gold/30 mb-4">
              {zip.network_notes}
            </p>
            <p className="text-xs uppercase tracking-wider text-[#AAAAAA] mb-2 font-semibold">Financing</p>
            <p className="text-xs text-[#888888] leading-relaxed">
              {zip.financing_notes}
            </p>
          </div>
        </div>

        {/* Tags + CTA */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-[#888888] border border-white/8">
              Avg vacancy: {zip.avg_vacancy}%
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-[#888888] border border-white/8">
              Median entry: ${(zip.median_entry_price / 1000).toFixed(0)}k
            </span>
            {(zip.recommended_tiers ?? []).map((tier: string) => (
              <span key={tier} className={`text-xs px-2 py-0.5 rounded-full border ${tierColors[tier]}`}>
                {tier}
              </span>
            ))}
          </div>
          <a href={`/analyze?zip=${zip.zip}`}
            className="text-xs px-4 py-2 bg-gold/10 border border-gold/25 text-gold rounded-lg hover:bg-gold/15 transition-colors">
            Analyze a deal in {zip.zip} →
          </a>
        </div>
      </div>
    </details>
  )
}
