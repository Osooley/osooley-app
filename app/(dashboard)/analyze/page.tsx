'use client'

import { useState } from 'react'
import Link from 'next/link'

type DataSource = 'verified' | 'rentcast' | 'assumed' | 'you' | 'listing'

// Safe number formatter — never crashes on undefined/null
function fmt(n: any, prefix = '', suffix = '', fallback = '—'): string {
  if (n === null || n === undefined || isNaN(Number(n))) return fallback
  return `${prefix}${Number(n).toLocaleString()}${suffix}`
}

const SOURCE_STYLES: Record<DataSource, string> = {
  verified: 'bg-[#2E7D5E]/15 text-[#2E7D5E] border-[#2E7D5E]/30',
  rentcast: 'bg-blue-100 text-blue-700 border-blue-200',
  assumed:  'bg-[#F5F0E8] text-[#AAAAAA] border-black/10',
  listing:  'bg-purple-100 text-purple-700 border-purple-200',
  you:      'bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/25',
}

const SOURCE_LABELS: Record<DataSource, string> = {
  verified: 'Network verified',
  rentcast: 'Auto-filled',
  assumed:  'Estimated',
  you:      'You entered',
  listing:  'From listing',
}

const SOURCE_CONFIDENCE: Record<DataSource, number> = {
  verified: 100, rentcast: 80, you: 100, assumed: 40, listing: 90,
}

function DataBadge({ source }: { source?: DataSource | string }) {
  if (!source || !SOURCE_STYLES[source as DataSource]) return null
  return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${SOURCE_STYLES[source as DataSource]}`}>{SOURCE_LABELS[source as DataSource]}</span>
}

// Defined at module scope (NOT inside AnalyzePage) so its identity is stable
// across renders — otherwise React remounts each input on every keystroke and
// the field loses focus after a single digit.
function Field({label, name, value, prefix, suffix, source, placeholder, step: fStep, hint, onChange}:
  {label:string;name:string;value:any;prefix?:string;suffix?:string;source?:DataSource;placeholder?:string;step?:number;hint?:string;onChange:React.ChangeEventHandler<HTMLInputElement>}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <label className="text-xs text-[#888888] uppercase tracking-wider">{label}</label>
        {source && <DataBadge source={source}/>}
      </div>
      <div className="relative flex items-center">
        {prefix && <span className="absolute left-3 text-[#AAAAAA] text-sm">{prefix}</span>}
        <input type="number" inputMode="decimal" name={name} value={value||''} onChange={onChange} placeholder={placeholder} step={fStep}
          className={`no-spinner w-full py-2.5 bg-[#F5F0E8] border border-black/10 rounded-lg text-sm text-[#1A1A1A] placeholder-[#AAAAAA] focus:outline-none focus:border-[#C9A84C]/60 transition-colors ${prefix?'pl-7':'px-3'} ${suffix?'pr-10':'pr-3'}`}/>
        {suffix && <span className="absolute right-3 text-[#AAAAAA] text-sm">{suffix}</span>}
      </div>
      {hint && <p className="text-[10px] text-[#AAAAAA] mt-1">{hint}</p>}
    </div>
  )
}

function ConfidenceBar({ sources }: { sources: Record<string, DataSource> }) {
  const vals = Object.values(sources).map(s => SOURCE_CONFIDENCE[s] ?? 40)
  const score = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 40
  const level = score >= 80 ? 'High' : score >= 50 ? 'Medium' : 'Low'
  const [bg, border, textColor] = score >= 80
    ? ['bg-[#2E7D5E]/10', 'border-[#2E7D5E]/30', 'text-[#2E7D5E]']
    : score >= 50
    ? ['bg-[#C9A84C]/10', 'border-[#C9A84C]/30', 'text-[#C9A84C]']
    : ['bg-red-50', 'border-red-200', 'text-red-600']
  const barColor = score >= 80 ? 'bg-[#2E7D5E]' : score >= 50 ? 'bg-[#C9A84C]' : 'bg-red-400'

  return (
    <div className={`rounded-xl p-4 border mb-4 ${bg} ${border}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-xs font-semibold uppercase tracking-wider ${textColor}`}>Analysis confidence: {level}</p>
        <span className={`text-xs font-medium ${textColor}`}>{score}%</span>
      </div>
      <div className="h-1.5 bg-black/10 rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-xs text-[#888888] leading-relaxed">
        Numbers marked <span className="text-blue-600 font-medium">Auto-filled</span> come from RentCast market data and are estimates — not appraisals.
        Numbers marked <span className="text-[#AAAAAA] font-medium">Estimated</span> are model defaults. Verify all figures with your agent and PM before making any financial decisions.
      </p>
    </div>
  )
}

function StructuringCard({ result, inputs }: { result: any; inputs: any }) {
  const price = inputs.purchase_price || 0
  const coc = result.metrics?.coc_return ?? 0
  const dscr = result.metrics?.dscr ?? 0
  const scenarios = [
    { label: 'Current offer', offer: price, credits: inputs.seller_credits ?? 0, coc, dscr, current: true },
    { label: 'Ask for seller credits', offer: price, credits: Math.round(price * 0.03), coc: Math.round((coc + 1.2) * 10) / 10, dscr: Math.round((dscr + 0.05) * 100) / 100 },
    { label: 'Lower offer price', offer: Math.round(price * 0.95), credits: 0, coc: Math.round((coc + 1.8) * 10) / 10, dscr: Math.round((dscr + 0.08) * 100) / 100 },
    { label: 'Best combo', offer: Math.round(price * 0.97), credits: Math.round(price * 0.02), coc: Math.round((coc + 2.4) * 10) / 10, dscr: Math.round((dscr + 0.11) * 100) / 100, highlight: true },
  ]
  return (
    <div className="bg-white rounded-2xl border border-black/[0.08] shadow-sm p-5">
      <p className="text-xs uppercase tracking-widest text-[#AAAAAA] font-semibold mb-4">Deal structuring — sensitivity analysis</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {scenarios.map((s) => (
          <div key={s.label} className={`rounded-xl p-4 border ${s.highlight ? 'border-[#C9A84C]/40 bg-[#C9A84C]/5' : s.current ? 'border-black/10 bg-[#F5F0E8]' : 'border-black/[0.06] bg-[#F5F0E8]'}`}>
            <div className="flex items-center justify-between mb-3">
              <p className={`text-xs font-medium ${s.highlight ? 'text-[#C9A84C]' : 'text-[#1A1A1A]'}`}>{s.label}</p>
              {s.highlight && <span className="text-[9px] bg-[#C9A84C]/15 text-[#C9A84C] px-1.5 py-0.5 rounded-full border border-[#C9A84C]/25">Best</span>}
              {s.current && <span className="text-[9px] bg-black/5 text-[#888888] px-1.5 py-0.5 rounded-full">Now</span>}
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-[#888888]">Offer</span><span className="text-[#1A1A1A]">${(s.offer/1000).toFixed(0)}k</span></div>
              {s.credits > 0 && <div className="flex justify-between"><span className="text-[#888888]">Credits</span><span className="text-[#2E7D5E]">+${(s.credits/1000).toFixed(1)}k</span></div>}
              <div className="flex justify-between pt-1 border-t border-black/[0.05]">
                <span className="text-[#888888]">CoC</span>
                <span className={`font-medium ${s.coc >= 7 ? 'text-[#2E7D5E]' : s.coc >= 5 ? 'text-[#C9A84C]' : 'text-[#1A1A1A]'}`}>{s.coc}%</span>
              </div>
              <div className="flex justify-between"><span className="text-[#888888]">DSCR</span><span className={`font-medium ${s.dscr >= 1.2 ? 'text-[#2E7D5E]' : s.dscr >= 1.0 ? 'text-[#C9A84C]' : 'text-red-500'}`}>{s.dscr}x</span></div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-[#C9A84C]/8 border border-[#C9A84C]/20 rounded-xl p-3 flex gap-2">
        <span className="text-sm flex-shrink-0">💡</span>
        <p className="text-xs text-[#888888] leading-relaxed">Seller credits reduce your cash to close without changing the loan amount — one of the most effective ways to improve returns without lowering your offer price significantly.</p>
      </div>
    </div>
  )
}

function QuickResult({ result, inputs, address, inputSources }: { result: any; inputs: any; address: string; inputSources: Record<string, DataSource> }) {
  const [showDetail, setShowDetail] = useState(false)
  const { cash_flow: cf, metrics: m, expenses: ex, projections: proj, comparison, risk, reward } = result
  const verdictConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
    recommended: { bg: 'bg-[#2E7D5E]/10', text: 'text-[#2E7D5E]', border: 'border-[#2E7D5E]/30', label: '✓ Recommended' },
    conditional:  { bg: 'bg-[#C9A84C]/10', text: 'text-[#B8973E]', border: 'border-[#C9A84C]/30', label: '⚡ Conditional' },
    fail:         { bg: 'bg-red-50',        text: 'text-red-600',   border: 'border-red-200',    label: '✕ Pass' },
  }
  const vc = verdictConfig[result.verdict] || verdictConfig.conditional

  return (
    <div className="space-y-4 animate-fade-in">
      <ConfidenceBar sources={inputSources} />

      <div className={`bg-white rounded-2xl border-2 shadow-sm p-6 ${vc.border}`}>
        <div className="flex items-start gap-4 flex-wrap mb-5">
          <span className={`px-4 py-2 rounded-lg text-sm font-semibold border ${vc.bg} ${vc.text} ${vc.border}`}>{vc.label}</span>
          <div className="flex-1">
            <p className="text-[#1A1A1A] font-medium">{address}</p>
            <p className="text-[#888888] text-sm mt-0.5">{result.cmi?.neighborhood} · ZIP {result.cmi?.zip} · CMI <span className="text-[#C9A84C]">{result.cmi?.grade}</span></p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Cash-on-cash', value: `${m.coc_return}%`, good: m.coc_return >= 7, source: 'you' as DataSource },
            { label: 'DSCR', value: `${m.dscr}x`, good: m.dscr >= 1.2, source: 'you' as DataSource },
            { label: 'Monthly cash flow', value: `${cf.monthly_cash_flow >= 0 ? '+' : ''}$${(cf.monthly_cash_flow ?? 0).toLocaleString()}`, good: cf.monthly_cash_flow > 0, source: 'you' as DataSource },
            { label: '5yr gain (base)', value: `$${Math.round((proj.base[4]?.total_return ?? 0) / 1000)}k`, gold: true, source: 'assumed' as DataSource },
          ].map(item => (
            <div key={item.label} className="bg-[#F5F0E8] rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <p className="text-[10px] uppercase tracking-wider text-[#AAAAAA]">{item.label}</p>
                <DataBadge source={item.source} />
              </div>
              <p className={`text-2xl font-medium ${(item as any).good ? 'text-[#2E7D5E]' : (item as any).gold ? 'text-[#C9A84C]' : 'text-[#1A1A1A]'}`}>{item.value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {[{label:'Risk',val:risk.overall,color:risk.overall<=4?'#2E7D5E':risk.overall<=6?'#C9A84C':'#C94040'},{label:'Reward',val:reward.overall,color:'#C9A84C'}].map(b=>(
            <div key={b.label} className="flex items-center gap-3 flex-1">
              <span className="text-xs text-[#888888] w-14">{b.label}</span>
              <div className="flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{width:`${b.val*10}%`,background:b.color}}/>
              </div>
              <span className="text-xs text-[#1A1A1A] w-6">{b.val}</span>
            </div>
          ))}
          <div className="bg-[#F5F0E8] px-3 py-1.5 rounded-lg border border-black/[0.06]">
            <span className="text-xs text-[#888888]">Ratio: </span>
            <span className="text-xs text-[#C9A84C] font-medium">1:{result.risk_reward_ratio}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/[0.08] shadow-sm px-5 py-4">
        <p className="text-sm text-[#2A2A2A] leading-relaxed">{result.verdict_reason}</p>
      </div>

      <StructuringCard result={result} inputs={inputs} />

      <div className="bg-white rounded-2xl border border-black/[0.08] shadow-sm p-5">
        <p className="text-xs uppercase tracking-widest text-[#AAAAAA] font-semibold mb-4">5-year wealth projection <DataBadge source="assumed" /></p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[{label:'Conservative',value:proj.conservative[4]?.total_return,color:'text-[#888888]'},{label:'Base case',value:proj.base[4]?.total_return,color:'text-[#C9A84C]'},{label:'Optimistic',value:proj.optimistic[4]?.total_return,color:'text-[#2E7D5E]'}].map(s=>(
            <div key={s.label} className="bg-[#F5F0E8] rounded-xl p-4 text-center">
              <p className="text-[10px] text-[#AAAAAA] uppercase tracking-wider mb-2">{s.label}</p>
              <p className={`text-xl font-medium ${s.color}`}>${Math.round((s.value??0)/1000)}k</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[{label:`HYSA (${comparison.hysa_rate}%)`,value:comparison.hysa_5yr},{label:'S&P 500 avg',value:comparison.sp500_5yr},{label:'This deal (base)',value:comparison.this_deal_5yr_base,winner:true}].map(item=>(
            <div key={item.label} className="bg-[#F5F0E8] rounded-xl px-4 py-3 flex items-center justify-between border border-black/[0.06]">
              <span className="text-xs text-[#888888]">{item.label}</span>
              <span className={`text-sm font-medium ${(item as any).winner?'text-[#2E7D5E]':'text-[#1A1A1A]'}`}>${Math.round((item.value??0)/1000)}k{(item as any).winner?' ↑':''}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={()=>setShowDetail(d=>!d)} className="w-full py-3 bg-white border border-black/10 rounded-xl text-sm text-[#888888] hover:text-[#1A1A1A] hover:border-[#C9A84C]/40 transition-all shadow-sm">
        {showDetail ? '▲ Hide full breakdown' : '▼ Show full expense breakdown & AI assessment'}
      </button>

      {showDetail && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-black/[0.08] shadow-sm p-5">
            <p className="text-xs uppercase tracking-widest text-[#AAAAAA] font-semibold mb-4">Full expense breakdown</p>
            {[
              {label:'Gross monthly rent',value:`$${(cf.gross_monthly_rent ?? 0).toLocaleString()}`,source:inputSources.monthly_rent||'you' as DataSource},
              {label:'Vacancy adjustment',value:`-$${(cf.vacancy_adjustment ?? 0).toLocaleString()}`,source:inputSources.vacancy_rate||'assumed' as DataSource,red:true},
              {label:'Mortgage P&I',value:`$${(ex.mortgage_pi ?? 0).toLocaleString()}/mo`,source:'you' as DataSource},
              {label:'Property taxes',value:`$${(ex.property_taxes ?? 0).toLocaleString()}/mo`,source:inputSources.property_taxes_annual||'assumed' as DataSource},
              {label:'Insurance',value:`$${(ex.insurance ?? 0).toLocaleString()}/mo`,source:'assumed' as DataSource},
              {label:'Property management',value:`$${(ex.pm_monthly ?? 0).toLocaleString()}/mo`,source:'you' as DataSource},
              {label:'CapEx reserve',value:`$${(ex.capex ?? 0).toLocaleString()}/mo`,source:'assumed' as DataSource},
              {label:'Maintenance',value:`$${(ex.maintenance ?? 0).toLocaleString()}/mo`,source:'assumed' as DataSource},
            ].map(row=>(
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-black/[0.05] last:border-0 text-sm">
                <div className="flex items-center gap-2"><span className="text-[#888888]">{row.label}</span><DataBadge source={row.source as DataSource}/></div>
                <span className={row.red?'text-red-400':'text-[#1A1A1A]'}>{row.value}</span>
              </div>
            ))}
            <div className="flex justify-between py-3 text-sm font-medium border-t border-black/10 mt-1">
              <span className="text-[#1A1A1A]">Monthly cash flow</span>
              <span className={cf.monthly_cash_flow>=0?'text-[#2E7D5E]':'text-red-500'}>{cf.monthly_cash_flow>=0?'+':''}{(cf.monthly_cash_flow ?? 0).toLocaleString()}/mo</span>
            </div>
          </div>

          {result.home_warranty_recommended && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <span>⚠️</span>
              <div>
                <p className="text-sm text-amber-800 font-medium mb-1">Home warranty recommended</p>
                <p className="text-xs text-amber-700 leading-relaxed">CapEx + maintenance exceeds our $220/mo threshold. A home warranty (~${result.home_warranty_monthly_est}/mo) may simplify ownership and cap your exposure.</p>
              </div>
            </div>
          )}

          {result.section8_cash_flow && (
            <div className="bg-white rounded-2xl border border-[#2E7D5E]/20 shadow-sm p-5">
              <p className="text-xs uppercase tracking-widest text-[#AAAAAA] font-semibold mb-4">Section 8 scenario <DataBadge source="assumed"/></p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><p className="text-[10px] text-[#AAAAAA] uppercase tracking-wider mb-1">CoC</p><p className="text-2xl font-medium text-[#2E7D5E]">{result.section8_metrics?.coc_return}%</p></div>
                <div><p className="text-[10px] text-[#AAAAAA] uppercase tracking-wider mb-1">DSCR</p><p className="text-2xl font-medium text-[#2E7D5E]">{result.section8_metrics?.dscr}x</p></div>
                <div><p className="text-[10px] text-[#AAAAAA] uppercase tracking-wider mb-1">Monthly CF</p><p className="text-2xl font-medium text-[#2E7D5E]">+${(result.section8_cash_flow?.monthly_cash_flow ?? 0).toLocaleString()}</p></div>
              </div>
            </div>
          )}

          {result.ai_assessment && (
            <div className="bg-white rounded-2xl border border-black/[0.08] shadow-sm p-5 border-l-2 border-l-[#2E7D5E]">
              <p className="text-xs uppercase tracking-widest text-[#2E7D5E] font-semibold mb-3">AI advisor assessment</p>
              <p className="text-sm text-[#2A2A2A] leading-relaxed whitespace-pre-wrap">{result.ai_assessment}</p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-black/[0.08] shadow-sm p-5">
            <p className="text-xs uppercase tracking-widest text-[#AAAAAA] font-semibold mb-4">Next steps</p>
            {result.next_steps?.map((step: any)=>(
              <div key={step.order} className="flex gap-4 py-3 border-b border-black/[0.05] last:border-0">
                <div className="w-7 h-7 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/25 flex items-center justify-center text-xs font-semibold text-[#C9A84C] flex-shrink-0">{step.order}</div>
                <div><p className="text-[#1A1A1A] text-sm font-medium">{step.title}</p><p className="text-[#888888] text-xs mt-1">{step.detail}</p></div>
              </div>
            ))}
            <button className="w-full mt-5 py-3 bg-[#1A1A1A] text-white font-medium rounded-xl hover:bg-[#C9A84C] transition-colors text-sm">
              I&apos;m interested — connect me with the network →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AnalyzePage() {
  const [step, setStep] = useState<'address'|'review'|'result'>('address')
  const [address, setAddress] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [error, setError] = useState('')
  const [prefill, setPrefill] = useState<any>({})
  const [inputSources, setInputSources] = useState<Record<string, DataSource>>({})
  const [rentRange, setRentRange] = useState<{low:number;high:number}|null>(null)
  const [occupancyStatus, setOccupancyStatus] = useState<'occupied'|'vacant'|'unknown'>('unknown')
  const [isMultiFamily, setIsMultiFamily] = useState(false)
  const [form, setForm] = useState<any>({
    down_payment_pct: 20, interest_rate: 7.2, pm_fee_pct: 9,
    vacancy_rate: 5, maintenance_monthly: 40, capex_monthly: 150,
    insurance_monthly: 75, seller_credits: 0, rehab_cost: 0,
    hoa_monthly: 0, utilities_monthly: 0, lawn_monthly: 0, section8_rent: 0,
  })
  const [result, setResult] = useState<any>(null)
  const [saveStatus, setSaveStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle')
  const [saveError, setSaveError] = useState('')
  const [listingUrl, setListingUrl] = useState('')
  const [listingText, setListingText] = useState('')
  const [listingParsing, setListingParsing] = useState(false)
  const [listingData, setListingData] = useState<any>(null)
  const [showListing, setShowListing] = useState(false)
  const [listingError, setListingError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) {
    const {name, value, type} = e.target
    setForm((p: any) => ({...p, [name]: type === 'number' ? parseFloat(value)||0 : value}))
    setInputSources(p => ({...p, [name]: 'you'}))
  }

  async function parseListing() {
    if (!listingText.trim()) return
    setListingParsing(true)
    setListingError('')
    try {
      const res = await fetch('/api/listing', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({listing_text: listingText}),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || `Server error ${res.status}`)
      setListingData(data)

      // Auto-fill form from listing data
      const ex = data.extracted
      const updates: any = {}
      const srcs: Record<string, DataSource> = {...inputSources}

      if (ex.list_price) { updates.purchase_price = ex.list_price; srcs.purchase_price = 'listing' as any }
      if (ex.monthly_rent) { updates.monthly_rent = ex.monthly_rent; srcs.monthly_rent = 'listing' as any }
      if (ex.year_built) { updates.year_built = ex.year_built; srcs.year_built = 'listing' as any }
      if (ex.sqft) { updates.sqft = ex.sqft; srcs.sqft = 'listing' as any }
      if (ex.hoa_monthly) { updates.hoa_monthly = ex.hoa_monthly; srcs.hoa_monthly = 'listing' as any }
      if (ex.property_taxes_annual) { updates.property_taxes_annual = ex.property_taxes_annual; srcs.property_taxes_annual = 'listing' as any }
      if (ex.occupancy_status) setOccupancyStatus(ex.occupancy_status)

      if (Object.keys(updates).length > 0) {
        setForm((p: any) => ({...p, ...updates}))
        setInputSources(srcs)
      }
    } catch (e: any) {
      console.error('Listing parse error:', e)
      setListingError(e.message || 'Failed to read listing. Check your connection and try again.')
    }
    setListingParsing(false)
  }

  async function lookupAddress() {
    if (!address.trim()) return
    setLookupLoading(true); setError('')
    try {
      const res = await fetch('/api/property', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({address}),
      })
      const data = await res.json()
      if (data.prefill) {
        const { source_labels, rent_range_low, rent_range_high, last_sale_price, last_sale_date,
          fields_auto_filled, total_key_fields, is_multi_family, occupancy_status,
          list_price, days_on_market, listing_status, ...formFields } = data.prefill
        const validFields = Object.fromEntries(Object.entries(formFields).filter(([,v]) => v !== null && v !== undefined))
        setPrefill(data.prefill)
        setForm((p: any) => ({...p, ...validFields}))
        setInputSources(source_labels || {})
        if (rent_range_low && rent_range_high) setRentRange({low: rent_range_low, high: rent_range_high})
        if (is_multi_family) setIsMultiFamily(true)
        if (occupancy_status) setOccupancyStatus(occupancy_status)
      }
    } catch { setError('Could not auto-fill — enter details manually below.') }
    setLookupLoading(false)
    setStep('review')
  }

  async function fetchFromUrl() {
    if (!listingUrl.trim()) return
    setLookupLoading(true); setError('')
    try {
      const res = await fetch('/api/fetchlisting', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({url: listingUrl}),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Could not fetch listing')

      const ex = data.extracted
      const updates: any = {}
      const srcs: Record<string, string> = {}

      if (ex.list_price)  { updates.purchase_price = ex.list_price;  srcs.purchase_price = 'listing' }
      if (ex.monthly_rent){ updates.monthly_rent = ex.monthly_rent;   srcs.monthly_rent = 'listing' }
      if (ex.year_built)  { updates.year_built = ex.year_built;       srcs.year_built = 'listing' }
      if (ex.sqft)        { updates.sqft = ex.sqft;                   srcs.sqft = 'listing' }
      if (ex.bedrooms)    { updates.bedrooms = ex.bedrooms }
      if (ex.bathrooms)   { updates.bathrooms = ex.bathrooms }
      if (ex.zip)         { updates.zip = ex.zip;                     srcs.zip = 'listing' }
      if (ex.hoa_monthly) { updates.hoa_monthly = ex.hoa_monthly;     srcs.hoa_monthly = 'listing' }
      if (ex.property_taxes_annual) { updates.property_taxes_annual = ex.property_taxes_annual; srcs.property_taxes_annual = 'listing' }
      if (ex.occupancy_status) setOccupancyStatus(ex.occupancy_status)

      // Set address from extracted data if not already set
      if (ex.address && !address) setAddress(ex.address)

      setPrefill({ ...ex, source_labels: srcs, list_price: ex.list_price, days_on_market: ex.days_on_market })
      setForm((p: any) => ({...p, ...updates}))
      setInputSources((p: any) => ({...p, ...srcs}))
      setListingData(data)
      setShowListing(true)
    } catch (e: any) {
      setError(e.message || 'Could not fetch that URL. Try pasting the listing description instead.')
    }
    setLookupLoading(false)
    setStep('review')
  }

  async function runAnalysis() {
    setAnalyzeLoading(true); setError('')
    try {
      const inputs = {
        purchase_price: form.purchase_price || 0,
        down_payment_pct: form.down_payment_pct, interest_rate: form.interest_rate,
        loan_term_years: 30, seller_credits: form.seller_credits,
        monthly_rent: form.monthly_rent || 0,
        section8_rent: form.section8_rent || undefined,
        property_taxes_annual: form.property_taxes_annual || 2400,
        insurance_monthly: form.insurance_monthly, hoa_monthly: form.hoa_monthly,
        pm_fee_pct: form.pm_fee_pct, pm_placement_months: 1,
        vacancy_rate: form.vacancy_rate,
        maintenance_monthly: form.maintenance_monthly, lawn_monthly: form.lawn_monthly,
        utilities_monthly: form.utilities_monthly, capex_monthly: form.capex_monthly,
        rehab_cost: form.rehab_cost,
      }
      const res = await fetch('/api/analyze', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({inputs, zip: form.zip||'', year_built: form.year_built||1970, sqft: form.sqft||1000, address}),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data); setStep('result'); setSaveStatus('idle')
    } catch (e: any) { setError(e.message ?? 'Analysis failed') }
    setAnalyzeLoading(false)
  }

  async function saveDeal() {
    if (!result) return
    setSaveStatus('saving'); setSaveError('')
    try {
      const inputs = {
        purchase_price: form.purchase_price || 0,
        down_payment_pct: form.down_payment_pct, interest_rate: form.interest_rate,
        loan_term_years: 30, seller_credits: form.seller_credits,
        monthly_rent: form.monthly_rent || 0,
        section8_rent: form.section8_rent || undefined,
        property_taxes_annual: form.property_taxes_annual || 2400,
        insurance_monthly: form.insurance_monthly, hoa_monthly: form.hoa_monthly,
        pm_fee_pct: form.pm_fee_pct, vacancy_rate: form.vacancy_rate,
        maintenance_monthly: form.maintenance_monthly, capex_monthly: form.capex_monthly,
        rehab_cost: form.rehab_cost,
      }
      const res = await fetch('/api/save-deal', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ address, zip: form.zip || '', year_built: form.year_built || 1970, sqft: form.sqft || 1000, inputs, result }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || `Server error ${res.status}`)
      setSaveStatus('saved')
    } catch (e: any) {
      setSaveError(e.message || 'Could not save deal'); setSaveStatus('error')
    }
  }

  const canRun = form.purchase_price > 0 && form.monthly_rent > 0

  const occupancyConfig = {
    occupied: { label: 'Tenant occupied', color: 'text-[#2E7D5E]', bg: 'bg-[#2E7D5E]/10', border: 'border-[#2E7D5E]/25', icon: '✓' },
    vacant:   { label: 'Vacant', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: '○' },
    unknown:  { label: 'Occupancy unknown', color: 'text-[#888888]', bg: 'bg-[#F5F0E8]', border: 'border-black/10', icon: '?' },
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-[#1A1A1A] mb-2">Analyze a property</h1>
        <p className="text-[#888888] text-sm">Start with an address — we fill in what we can. Every number is labeled so you know what&apos;s real vs. estimated.</p>
      </div>

      {step === 'address' && (
        <div className="max-w-xl">
          <div className="bg-white rounded-2xl border border-black/[0.08] shadow-sm p-6">
            <p className="text-xs uppercase tracking-widest text-[#C9A84C] font-semibold mb-1">Start with a listing URL</p>
            <p className="text-xs text-[#888888] mb-4">Paste a link from Redfin, Zillow, Realtor.com, or anywhere</p>
            <div className="flex gap-2 mb-4">
              <input value={listingUrl} onChange={e=>setListingUrl(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&fetchFromUrl()}
                placeholder="https://www.redfin.com/OH/Cleveland/..."
                className="flex-1 px-4 py-3 bg-[#F5F0E8] border border-black/10 rounded-xl text-sm text-[#1A1A1A] placeholder-[#AAAAAA] focus:outline-none focus:border-[#C9A84C]/60 transition-colors"/>
              <button onClick={fetchFromUrl} disabled={!listingUrl.trim()||lookupLoading}
                className="px-4 py-3 bg-[#1A1A1A] text-white font-medium rounded-xl hover:bg-[#C9A84C] transition-colors disabled:opacity-40 text-sm flex-shrink-0">
                {lookupLoading ? '...' : 'Fetch →'}
              </button>
            </div>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-black/10"/>
              <span className="text-xs text-[#AAAAAA] uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-black/10"/>
            </div>

            <p className="text-xs uppercase tracking-widest text-[#C9A84C] font-semibold mb-1">Enter the address</p>
            <p className="text-xs text-[#888888] mb-3">We'll look up property data from public records</p>
            <div className="flex gap-2">
              <input value={address} onChange={e=>setAddress(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&lookupAddress()}
                placeholder="4609 Lee Rd, Cleveland OH 44128"
                className="flex-1 px-4 py-3 bg-[#F5F0E8] border border-black/10 rounded-xl text-sm text-[#1A1A1A] placeholder-[#AAAAAA] focus:outline-none focus:border-[#C9A84C]/60 transition-colors"/>
              <button onClick={lookupAddress} disabled={!address.trim()||lookupLoading}
                className="px-4 py-3 bg-[#1A1A1A] text-white font-medium rounded-xl hover:bg-[#C9A84C] transition-colors disabled:opacity-40 text-sm flex-shrink-0">
                {lookupLoading ? '...' : 'Look up →'}
              </button>
            </div>

            {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
            <button onClick={()=>setStep('review')} className="w-full mt-4 py-2 text-sm text-[#AAAAAA] hover:text-[#888888] transition-colors">
              Skip — enter details manually
            </button>
          </div>

          <div className="mt-4 bg-[#C9A84C]/8 border border-[#C9A84C]/20 rounded-xl p-4 flex gap-3">
            <span className="text-base flex-shrink-0 mt-0.5">💡</span>
            <p className="text-xs text-[#888888] leading-relaxed">
              <strong className="text-[#1A1A1A]">URL gives the best results</strong> — we read the full listing and extract list price, rent, year built, and updates automatically. Address lookup gives public records data. Both label every number so you know what&apos;s real vs. estimated.
            </p>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {address && (
              <div className="bg-white border border-black/[0.08] rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
                <p className="text-sm text-[#1A1A1A]">{address}</p>
                <button onClick={()=>setStep('address')} className="text-xs text-[#AAAAAA] hover:text-[#C9A84C] transition-colors">Change</button>
              </div>
            )}

            {/* Occupancy status */}
            {occupancyStatus && (
              <div className={`${occupancyConfig[occupancyStatus].bg} border ${occupancyConfig[occupancyStatus].border} rounded-xl px-4 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${occupancyConfig[occupancyStatus].color}`}>
                    {occupancyConfig[occupancyStatus].icon} {occupancyConfig[occupancyStatus].label}
                  </span>
                </div>
                <div className="flex gap-2">
                  {(['occupied','vacant','unknown'] as const).map(s => (
                    <button key={s} onClick={()=>setOccupancyStatus(s)}
                      className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${occupancyStatus===s ? `${occupancyConfig[s].bg} ${occupancyConfig[s].border} ${occupancyConfig[s].color} font-medium` : 'bg-white border-black/10 text-[#888888]'}`}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Listing reader */}
            <div className="bg-white rounded-2xl border border-black/[0.08] shadow-sm p-5">
              <button onClick={()=>setShowListing(s=>!s)}
                className="w-full flex items-center justify-between text-left">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#C9A84C] font-semibold">Paste listing text</p>
                  <p className="text-xs text-[#888888] mt-0.5">Extract rent, updates, tenant info and more automatically</p>
                </div>
                <span className="text-[#AAAAAA] text-lg">{showListing ? '▲' : '▼'}</span>
              </button>
              {showListing && (
                <div className="mt-4 space-y-3">
                  <textarea
                    value={listingText}
                    onChange={e=>setListingText(e.target.value)}
                    placeholder="Paste the full listing description here — from Redfin, Zillow, MLS, or anywhere. Include any notes about current tenants, recent updates, rent amounts, etc."
                    rows={6}
                    className="w-full px-4 py-3 bg-[#F5F0E8] border border-black/10 rounded-xl text-sm text-[#1A1A1A] placeholder-[#AAAAAA] focus:outline-none focus:border-[#C9A84C]/60 transition-colors resize-none"
                  />
                  <button onClick={parseListing} disabled={!listingText.trim()||listingParsing}
                    className="w-full py-2.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-xl hover:bg-[#C9A84C] transition-colors disabled:opacity-40">
                    {listingParsing ? 'Reading listing...' : 'Read & extract listing data →'}
                  </button>
                  {listingError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
                      <strong>Error:</strong> {listingError}
                    </div>
                  )}
                  {listingData && (
                    <div className="space-y-3 pt-1">
                      {/* AI Summary */}
                      <div className="bg-[#2E7D5E]/8 border border-[#2E7D5E]/20 rounded-xl p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#2E7D5E] mb-2">AI listing summary</p>
                        <p className="text-xs text-[#2A2A2A] leading-relaxed">{listingData.summary}</p>
                      </div>
                      {/* What was extracted */}
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-purple-700 mb-2">Extracted & applied to form</p>
                        <div className="space-y-1">
                          {listingData.extracted.list_price && <p className="text-xs text-purple-700">✓ List price: <strong>${listingData.extracted.list_price.toLocaleString()}</strong></p>}
                          {listingData.extracted.monthly_rent && <p className="text-xs text-purple-700">✓ Monthly rent: <strong>${listingData.extracted.monthly_rent.toLocaleString()}</strong></p>}
                          {listingData.extracted.unit_rents && listingData.extracted.unit_rents.map((u: any, i: number) => (
                            <p key={i} className="text-xs text-purple-700">✓ Unit {u.unit}: <strong>${(u.rent ?? 0).toLocaleString()}/mo</strong> ({u.lease_type})</p>
                          ))}
                          {listingData.extracted.year_built && <p className="text-xs text-purple-700">✓ Year built: <strong>{listingData.extracted.year_built}</strong></p>}
                          {listingData.extracted.occupancy_status && <p className="text-xs text-purple-700">✓ Occupancy: <strong>{listingData.extracted.occupancy_status}</strong></p>}
                          {listingData.extracted.lease_expiry && <p className="text-xs text-purple-700">✓ Lease: <strong>{listingData.extracted.lease_expiry}</strong></p>}
                          {listingData.extracted.hoa_monthly && <p className="text-xs text-purple-700">✓ HOA: <strong>${listingData.extracted.hoa_monthly}/mo</strong></p>}
                        </div>
                        {listingData.extracted.recent_updates?.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-purple-200">
                            <p className="text-xs font-medium text-purple-700 mb-1">Recent updates mentioned:</p>
                            {listingData.extracted.recent_updates.map((u: string, i: number) => (
                              <p key={i} className="text-xs text-purple-600">• {u}</p>
                            ))}
                          </div>
                        )}
                        {listingData.extracted.red_flags?.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-purple-200">
                            <p className="text-xs font-medium text-red-600 mb-1">⚠️ Flags to watch:</p>
                            {listingData.extracted.red_flags.map((f: string, i: number) => (
                              <p key={i} className="text-xs text-red-500">• {f}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Last sale hint */}
            {prefill.list_price && (
              <div className="bg-[#2E7D5E]/8 border border-[#2E7D5E]/25 rounded-xl px-4 py-3 flex gap-3">
                <span className="flex-shrink-0 text-[#2E7D5E] text-sm">✓</span>
                <p className="text-xs text-[#2E7D5E] leading-relaxed">
                  <strong>Active listing found:</strong> Listed at <strong>${prefill.list_price.toLocaleString()}</strong>
                  {prefill.days_on_market ? ` · ${prefill.days_on_market} days on market` : ''}. Pre-filled in purchase price.
                </p>
              </div>
            )}
            {!prefill.list_price && prefill.last_sale_price && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex gap-3">
                <span className="flex-shrink-0 text-blue-500 text-sm">ℹ</span>
                <p className="text-xs text-blue-700 leading-relaxed">
                  No active listing found. Last sold for <strong>${prefill.last_sale_price.toLocaleString()}</strong>
                  {prefill.last_sale_date ? ` on ${new Date(prefill.last_sale_date).toLocaleDateString()}` : ''}.
                  Enter your offer price manually.
                </p>
              </div>
            )}

            {/* Multi-family note */}
            {isMultiFamily && (
              <div className="bg-[#F5F0E8] border border-black/10 rounded-xl px-4 py-3 flex gap-3">
                <span className="text-sm flex-shrink-0">🏘️</span>
                <p className="text-xs text-[#888888] leading-relaxed">
                  <strong className="text-[#1A1A1A]">Multi-family property.</strong> The monthly rent field should reflect total rent across all units. Enter each unit&apos;s rent separately if known, then add them together.
                </p>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-black/[0.08] shadow-sm p-5">
              <p className="text-xs uppercase tracking-widest text-[#C9A84C] font-semibold mb-4">Key numbers</p>
              <div className="grid grid-cols-2 gap-3">
                <Field onChange={handleChange} label="Purchase price" name="purchase_price" value={form.purchase_price} prefix="$" placeholder="Enter offer price"
                  source={inputSources.purchase_price as DataSource}
                  hint={prefill.last_sale_price ? `Last sold: $${prefill.last_sale_price.toLocaleString()}` : undefined}/>
                <Field onChange={handleChange} label={isMultiFamily ? 'Total monthly rent (all units)' : 'Monthly rent'} name="monthly_rent" value={form.monthly_rent} prefix="$" placeholder="Market rent estimate"
                  source={inputSources.monthly_rent as DataSource}
                  hint={rentRange ? `Market range: $${rentRange.low.toLocaleString()}–$${rentRange.high.toLocaleString()}` : undefined}/>
                <Field onChange={handleChange} label="Section 8 rent" name="section8_rent" value={form.section8_rent} prefix="$" placeholder="If applicable"/>
                <Field onChange={handleChange} label="Year built" name="year_built" value={form.year_built} placeholder="Year" source={inputSources.year_built as DataSource}/>
                <Field onChange={handleChange} label="Square footage" name="sqft" value={form.sqft} placeholder="Sq ft" source={inputSources.sqft as DataSource}/>
                <Field onChange={handleChange} label="ZIP code" name="zip" value={form.zip} placeholder="ZIP" source={inputSources.zip as DataSource}/>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.08] shadow-sm p-5">
              <p className="text-xs uppercase tracking-widest text-[#C9A84C] font-semibold mb-4">Financing</p>
              <div className="grid grid-cols-2 gap-3">
                <Field onChange={handleChange} label="Down payment" name="down_payment_pct" value={form.down_payment_pct} suffix="%" step={0.5} source="you"/>
                <Field onChange={handleChange} label="Interest rate" name="interest_rate" value={form.interest_rate} suffix="%" step={0.05} source="you"/>
                <Field onChange={handleChange} label="Seller credits" name="seller_credits" value={form.seller_credits} prefix="$" source="you"/>
                <Field onChange={handleChange} label="Rehab cost" name="rehab_cost" value={form.rehab_cost} prefix="$" source="you"/>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.08] shadow-sm p-5">
              <p className="text-xs uppercase tracking-widest text-[#C9A84C] font-semibold mb-4">Expenses</p>
              <div className="grid grid-cols-2 gap-3">
                <Field onChange={handleChange} label="Taxes (annual)" name="property_taxes_annual" value={form.property_taxes_annual} prefix="$"
                  source={inputSources.property_taxes_annual as DataSource || 'assumed'}/>
                <Field onChange={handleChange} label="Insurance/mo" name="insurance_monthly" value={form.insurance_monthly} prefix="$" source="assumed"/>
                <Field onChange={handleChange} label="PM fee" name="pm_fee_pct" value={form.pm_fee_pct} suffix="%" source="you"/>
                <Field onChange={handleChange} label="Vacancy rate" name="vacancy_rate" value={form.vacancy_rate} suffix="%"
                  source={inputSources.vacancy_rate as DataSource || 'assumed'}/>
                <Field onChange={handleChange} label="CapEx reserve" name="capex_monthly" value={form.capex_monthly} prefix="$" source="assumed"/>
                <Field onChange={handleChange} label="Maintenance" name="maintenance_monthly" value={form.maintenance_monthly} prefix="$" source="assumed"/>
                <Field onChange={handleChange} label="Owner utilities" name="utilities_monthly" value={form.utilities_monthly} prefix="$" source="you"/>
                <Field onChange={handleChange} label="Lawn/snow" name="lawn_monthly" value={form.lawn_monthly} prefix="$" source="you"/>
              </div>
            </div>

            {/* Legend */}
            <div className="bg-white rounded-xl border border-black/[0.08] shadow-sm p-4">
              <p className="text-xs text-[#AAAAAA] mb-2 uppercase tracking-wider font-medium">Data source legend</p>
              <div className="flex flex-wrap gap-3">
                {([['verified','From your network'],['rentcast','Auto-filled from RentCast'],['assumed','Model estimate — edit freely'],['you','You entered']] as [DataSource,string][]).map(([s,l])=>(
                  <div key={s} className="flex items-center gap-1.5"><DataBadge source={s}/><span className="text-xs text-[#888888]">{l}</span></div>
                ))}
              </div>
            </div>

            {!canRun && (
              <div className="bg-[#C9A84C]/8 border border-[#C9A84C]/20 rounded-xl px-4 py-3">
                <p className="text-xs text-[#C9A84C]">Enter <strong>Purchase price</strong> and <strong>Monthly rent</strong> to run the analysis.</p>
              </div>
            )}

            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

            <button onClick={runAnalysis} disabled={analyzeLoading || !canRun}
              className="w-full py-3.5 bg-[#1A1A1A] text-white font-medium rounded-xl hover:bg-[#C9A84C] transition-colors disabled:opacity-40 text-sm shadow-sm">
              {analyzeLoading ? 'Running analysis...' : 'Run full analysis →'}
            </button>
          </div>

          <div className="hidden lg:block">
            {analyzeLoading ? (
              <div className="bg-white rounded-2xl border border-black/[0.08] shadow-sm p-8 text-center h-fit">
                <div className="w-8 h-8 border-2 border-black/10 border-t-[#C9A84C] rounded-full animate-spin mx-auto mb-4"/>
                <p className="text-[#1A1A1A] text-sm font-medium">Running analysis...</p>
                <p className="text-[#888888] text-xs mt-1">CMI lookup · financial model · AI assessment</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-black/[0.08] shadow-sm p-6 h-fit">
                <p className="text-[#1A1A1A] font-medium mb-4">What happens next</p>
                {[['🏙️','ZIP scored against our Cleveland Market Index (CMI)'],['📊','Every expense modeled — nothing hidden'],['🔧','Structuring engine shows how to optimize your offer'],['📈','5-year wealth projection across 3 scenarios'],['🤖','AI advisor gives a plain-English assessment'],['📊','Confidence score on every number']].map(([icon,text],i)=>(
                  <div key={i} className="flex gap-3 mb-3"><span className="text-base flex-shrink-0">{icon}</span><p className="text-xs text-[#888888] leading-relaxed">{text}</p></div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'result' && result && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={()=>setStep('review')} className="text-sm text-[#888888] hover:text-[#C9A84C] transition-colors">← Edit inputs</button>
            <div className="flex-1 h-px bg-black/[0.06]"/>
            {saveStatus === 'saved' ? (
              <Link href="/portfolio" className="text-sm font-medium text-[#2E7D5E] hover:text-[#256b4f] transition-colors">✓ Saved — view in portfolio →</Link>
            ) : (
              <button onClick={saveDeal} disabled={saveStatus === 'saving'}
                className="px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#C9A84C] transition-colors disabled:opacity-40">
                {saveStatus === 'saving' ? 'Saving…' : '+ Save to portfolio'}
              </button>
            )}
            <button onClick={()=>{setStep('address');setAddress('');setListingUrl('');setResult(null);setPrefill({});setInputSources({});setRentRange(null);setIsMultiFamily(false);setOccupancyStatus('unknown');setSaveStatus('idle')}}
              className="text-sm text-[#888888] hover:text-[#C9A84C] transition-colors">Analyze another →</button>
          </div>
          {saveStatus === 'error' && <p className="text-xs text-red-600 mb-4">{saveError}</p>}
          <QuickResult result={result} inputs={form} address={address} inputSources={inputSources}/>
        </div>
      )}
    </div>
  )
}
