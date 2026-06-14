'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const QUESTIONS = [
  {
    id: 'vacancy_scenario', label: 'Question 1 of 3',
    text: 'If your property sat vacant for 2 months, how would that feel?',
    options: [
      { value: 'conservative', label: 'A serious financial problem', sub: "We'll prioritize stability and strong vacancy markets", icon: '⚠️' },
      { value: 'moderate', label: 'Uncomfortable but manageable with reserves', sub: 'Balanced approach — cash flow with some upside', icon: '⚖️' },
      { value: 'aggressive', label: 'Fine — I have a cushion and think long-term', sub: 'We can explore higher-upside, transitional areas', icon: '🚀' },
    ],
    maps_to: 'risk_tolerance',
  },
  {
    id: 'goal', label: 'Question 2 of 3',
    text: 'What matters more to you right now?',
    options: [
      { value: 'cashflow', label: 'Extra money in my pocket each month', sub: 'Cash flow focus — we optimize CoC return', icon: '💵' },
      { value: 'wealth', label: 'Building real wealth I\'ll see in 10 years', sub: 'Appreciation + equity — we project your total return', icon: '📈' },
      { value: 'hybrid', label: 'Honestly, I\'m not sure yet', sub: "We'll show you both and let the numbers guide you", icon: '🤔' },
    ],
    maps_to: 'goal',
  },
  {
    id: 'management', label: 'Question 3 of 3',
    text: 'How hands-on do you want to be?',
    options: [
      { value: 'passive', label: 'Fully passive — let the property manager handle it', sub: 'Turnkey or light rehab with vetted PM from day one', icon: '🛋️' },
      { value: 'semi', label: 'Semi-involved — I\'ll manage the manager', sub: "Any tier, we'll keep you informed", icon: '📊' },
      { value: 'active', label: 'Active — I want to be close to every decision', sub: 'BRRRR or rehab, full deal flow access', icon: '🔨' },
    ],
    maps_to: 'management_style',
  },
]

export default function SignupPage() {
  const [step, setStep] = useState<'account'|'quiz'|'done'>('account')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [qIndex, setQIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleAccount(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
    if (error) { setError(error.message); setLoading(false) }
    else { setStep('quiz'); setLoading(false) }
  }

  function handleAnswer(value: string) {
    const q = QUESTIONS[qIndex]
    setAnswers(prev => ({ ...prev, [q.maps_to]: value }))
    if (qIndex < QUESTIONS.length - 1) setQIndex(i => i + 1)
    else saveProfile()
  }

  async function saveProfile() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({
        full_name: name,
        goal: answers.goal || 'hybrid',
        risk_tolerance: answers.risk_tolerance || 'moderate',
        management_style: answers.management_style || 'passive',
        investment_tier: answers.management_style === 'active' ? 'brrrr' : 'turnkey',
        horizon: '5-10',
        profile_complete: true,
      }).eq('id', user.id)
    }
    setStep('done'); setLoading(false)
  }

  const progress = step === 'account' ? 25 : step === 'quiz' ? 25 + (qIndex / QUESTIONS.length) * 65 : 100

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-[#2E7D5E]/15 border border-[#2E7D5E]/40 flex items-center justify-center text-2xl mb-6">✓</div>
        <h2 className="text-2xl font-serif text-[#1A1A1A] mb-2">You&apos;re all set</h2>
        <p className="text-[#888888] text-sm mb-8">Your investor profile is saved. We&apos;ve matched it to the right Cleveland opportunities.</p>
        <button onClick={() => { router.push('/dashboard'); router.refresh() }}
          className="px-8 py-3 bg-[#1A1A1A] text-white font-medium rounded-xl hover:bg-[#C9A84C] transition-colors text-sm">
          Go to my dashboard →
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/osooley-logo.png" alt="Osooley" className="h-10 w-auto mix-blend-multiply" />
      </Link>

      <div className="w-full max-w-md h-0.5 bg-black/10 rounded-full mb-8 overflow-hidden">
        <div className="h-full bg-[#C9A84C] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="w-full max-w-md">
        {step === 'account' && (
          <div className="bg-white rounded-2xl border border-black/[0.08] shadow-sm p-8">
            <h1 className="text-2xl font-serif text-[#1A1A1A] mb-1">Create your account</h1>
            <p className="text-[#888888] text-sm mb-8">Then we&apos;ll personalize your experience</p>
            <form onSubmit={handleAccount} className="space-y-4">
              {[
                { label: 'Full name', type: 'text', value: name, set: setName, placeholder: 'Ahmed Eldesouky' },
                { label: 'Email', type: 'email', value: email, set: setEmail, placeholder: 'you@example.com' },
                { label: 'Password', type: 'password', value: password, set: setPassword, placeholder: 'Min. 8 characters' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} required placeholder={f.placeholder}
                    className="w-full px-3 py-2.5 bg-[#F5F0E8] border border-black/10 rounded-lg text-sm text-[#1A1A1A] placeholder-[#AAAAAA] focus:outline-none focus:border-[#C9A84C]/60 transition-colors"/>
                </div>
              ))}
              {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-[#1A1A1A] text-white font-medium rounded-lg hover:bg-[#C9A84C] transition-colors disabled:opacity-50 text-sm">
                {loading ? 'Creating account...' : 'Continue →'}
              </button>
            </form>
            <p className="text-center text-sm text-[#888888] mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-[#C9A84C] font-medium hover:text-[#B8973E] transition-colors">Sign in</Link>
            </p>
          </div>
        )}

        {step === 'quiz' && (
          <div>
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#C9A84C] mb-2">{QUESTIONS[qIndex].label}</p>
              <h2 className="text-xl font-serif text-[#1A1A1A] leading-snug">{QUESTIONS[qIndex].text}</h2>
            </div>
            <div className="space-y-3 mb-6">
              {QUESTIONS[qIndex].options.map(opt => (
                <button key={opt.value} onClick={() => handleAnswer(opt.value)}
                  className="w-full text-left bg-white border border-black/[0.08] rounded-xl p-4 hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/5 transition-all group shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{opt.icon}</span>
                    <div>
                      <p className="text-[#1A1A1A] text-sm font-medium">{opt.label}</p>
                      <p className="text-[#888888] text-xs mt-1">{opt.sub}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {qIndex === 1 && (
              <div className="bg-[#C9A84C]/8 border border-[#C9A84C]/20 rounded-xl p-4 flex gap-3 mb-4">
                <span className="text-base flex-shrink-0">💡</span>
                <p className="text-xs text-[#888888] leading-relaxed">
                  <strong className="text-[#C9A84C]">Why does this matter?</strong> A 5% cash-on-cash return sounds worse than a savings account — until you add appreciation, equity paydown, leverage, and tax benefits. Your goal shapes how we score every deal.
                </p>
              </div>
            )}
            <button onClick={() => saveProfile()} className="w-full text-center text-sm text-[#AAAAAA] hover:text-[#888888] transition-colors py-2">
              Skip — use default conservative profile
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
