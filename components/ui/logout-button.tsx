'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button onClick={handleLogout}
      className="w-full text-left text-sm text-[#AAAAAA] hover:text-[#1A1A1A] transition-colors px-3 py-2">
      Sign out
    </button>
  )
}
