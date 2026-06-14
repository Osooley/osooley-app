'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else { router.push('/dashboard'); router.refresh() }
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center px-4">
      <Link href="/" className="mb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/osooley-logo.png" alt="Osooley" className="h-10 w-auto mix-blend-multiply" />
      </Link>

      <div className="w-full max-w-sm bg-white rounded-2xl border border-black/[0.08] shadow-sm p-8">
        <h1 className="text-2xl font-serif text-[#1A1A1A] mb-1">Welcome back</h1>
        <p className="text-[#888888] text-sm mb-8">Sign in to your Osooley account</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
              className="w-full px-3 py-2.5 bg-[#F5F0E8] border border-black/10 rounded-lg text-sm text-[#1A1A1A] placeholder-[#AAAAAA] focus:outline-none focus:border-[#C9A84C]/60 transition-colors"/>
          </div>
          <div>
            <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
              className="w-full px-3 py-2.5 bg-[#F5F0E8] border border-black/10 rounded-lg text-sm text-[#1A1A1A] placeholder-[#AAAAAA] focus:outline-none focus:border-[#C9A84C]/60 transition-colors"/>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-[#1A1A1A] text-white font-medium rounded-lg hover:bg-[#C9A84C] transition-colors disabled:opacity-50 text-sm">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-[#888888] mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#C9A84C] hover:text-[#B8973E] transition-colors font-medium">Get started</Link>
        </p>
      </div>
    </div>
  )
}
