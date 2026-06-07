import { type ReactNode } from 'react'

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant = 'gold' | 'green' | 'red' | 'amber' | 'slate' | 'default'

const badgeStyles: Record<BadgeVariant, string> = {
  gold:    'bg-gold/10 text-gold border-gold/25',
  green:   'bg-[#2E7D5E]/15 text-[#5EC89A] border-[#2E7D5E]/30',
  red:     'bg-red-500/15 text-red-400 border-red-500/25',
  amber:   'bg-[#B8760A]/15 text-[#E8A020] border-[#B8760A]/30',
  slate:   'bg-white/5 text-slate-400 border-white/10',
  default: 'bg-white/5 text-slate-300 border-white/8',
}

export function Badge({
  children,
  variant = 'default',
  className = '',
}: {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${badgeStyles[variant]} ${className}`}>
      {children}
    </span>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

export function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{children}</p>
      <div className="flex-1 h-px bg-white/[0.06]" />
    </div>
  )
}

// ─── Metric card ─────────────────────────────────────────────────────────────

export function MetricCard({
  label,
  value,
  sub,
  gold = false,
  green = false,
}: {
  label: string
  value: string | number
  sub?: string
  gold?: boolean
  green?: boolean
}) {
  return (
    <div className="bg-[#152232] rounded-xl p-4">
      <p className="text-xs uppercase tracking-wider text-slate-400 mb-1.5">{label}</p>
      <p className={`text-2xl font-medium ${gold ? 'text-[#C9A84C]' : green ? 'text-[#5EC89A]' : 'text-[#F7F3EE]'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Divider ─────────────────────────────────────────────────────────────────

export function Divider() {
  return <div className="h-px bg-white/[0.06] my-4" />
}

// ─── Learn embed ─────────────────────────────────────────────────────────────

export function LearnEmbed({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="bg-[#C9A84C]/5 border border-[#C9A84C]/12 rounded-xl p-4 flex gap-3">
      <span className="text-base flex-shrink-0 mt-0.5">💡</span>
      <div>
        <p className="text-sm text-[#F7F3EE] font-medium mb-1">{title}</p>
        <p className="text-xs text-slate-400 leading-relaxed">{children}</p>
      </div>
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[#152232] border border-white/[0.07] rounded-2xl px-5 py-4 text-sm text-slate-400">
      {children}
    </div>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6'
  return (
    <div className={`${s} border-2 border-white/10 border-t-[#C9A84C] rounded-full animate-spin`} />
  )
}

// ─── Risk bar ────────────────────────────────────────────────────────────────

export function RiskBar({
  score,
  max = 10,
  label,
}: {
  score: number
  max?: number
  label?: string
}) {
  const pct = (score / max) * 100
  const color =
    pct <= 35 ? 'from-[#2E7D5E] to-[#5EC89A]' :
    pct <= 60 ? 'from-[#B8760A] to-[#E8C472]' :
    'from-[#C94040] to-[#E87070]'

  const textColor =
    pct <= 35 ? 'text-[#5EC89A]' :
    pct <= 60 ? 'text-[#E8C472]' :
    'text-[#E87070]'

  return (
    <div>
      {label && (
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-400">{label}</span>
          <span className={`font-medium ${textColor}`}>{score}/{max}</span>
        </div>
      )}
      <div className="h-2 bg-white/8 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Verdict badge ────────────────────────────────────────────────────────────

export function VerdictBadge({ verdict }: { verdict: 'recommended' | 'conditional' | 'fail' }) {
  const styles = {
    recommended: 'text-[#5EC89A] bg-[#2E7D5E]/15 border-[#2E7D5E]/40',
    conditional:  'text-[#E8C472] bg-[#B8760A]/15 border-[#B8760A]/40',
    fail:         'text-[#E87070] bg-[#C94040]/15 border-[#C94040]/40',
  }
  const labels = {
    recommended: '✓ Recommended',
    conditional:  '⚡ Conditional',
    fail:         '✕ Pass',
  }
  return (
    <span className={`px-4 py-2 rounded-lg text-sm font-semibold border ${styles[verdict]}`}>
      {labels[verdict]}
    </span>
  )
}
