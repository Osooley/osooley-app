import { createClient } from '@/lib/supabase/server'
import { DealTrackerCard } from '@/components/tracker/deal-tracker'

export default async function PortfolioPage() {
  const supabase = await createClient()

  const { data: trackers } = await supabase
    .from('deal_tracker')
    .select(`
      *,
      properties (id, address, zip, city, property_type, status, offer_price, year_built, network_verified)
    `)
    .order('updated_at', { ascending: false })

  const stageOrder = ['under_contract', 'offer_submitted', 'active_interest', 'exploring', 'performing', 'closed_setup']
  const sorted = [...(trackers ?? [])].sort((a, b) =>
    stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage)
  )

  const underContract = sorted.filter(t => t.stage === 'under_contract')
  const exploring = sorted.filter(t => ['exploring', 'active_interest', 'offer_submitted'].includes(t.stage))
  const performing = sorted.filter(t => ['performing', 'closed_setup'].includes(t.stage))

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-[#1A1A1A] mb-2">Portfolio tracker</h1>
        <p className="text-[#888888] text-sm">Stage-aware deal management. Every task has an owner. Nothing falls through the cracks.</p>
      </div>

      {/* Stage summary */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Under contract', count: underContract.length, color: 'text-[#5EC89A]' },
          { label: 'Exploring', count: exploring.length, color: 'text-gold' },
          { label: 'Performing', count: performing.length, color: 'text-[#888888]' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 text-center">
            <p className={`text-2xl font-medium ${s.color}`}>{s.count}</p>
            <p className="text-xs text-[#888888] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {underContract.length > 0 && (
        <Section label="Under contract" accent="text-[#5EC89A]">
          {underContract.map(t => <DealTrackerCard key={t.id} tracker={t} />)}
        </Section>
      )}

      {exploring.length > 0 && (
        <Section label="Exploring & evaluating" accent="text-gold">
          {exploring.map(t => <DealTrackerCard key={t.id} tracker={t} />)}
        </Section>
      )}

      {performing.length > 0 && (
        <Section label="Performing assets" accent="text-[#888888]">
          {performing.map(t => <DealTrackerCard key={t.id} tracker={t} />)}
        </Section>
      )}

      {sorted.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-[#1A1A1A] font-medium mb-2">No deals tracked yet</p>
          <p className="text-[#888888] text-sm mb-4">Trackers are created automatically when you submit an offer. Explore deals to get started.</p>
          <a href="/dashboard" className="text-gold text-sm hover:text-gold2 transition-colors">← Back to dashboard</a>
        </div>
      )}
    </div>
  )
}

function Section({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <p className={`text-xs font-semibold uppercase tracking-widest ${accent}`}>{label}</p>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}
