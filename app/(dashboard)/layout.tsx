import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogoutButton } from '@/components/ui/logout-button'
import { SidebarNav } from '@/components/ui/sidebar-nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, goal, risk_tolerance, investment_tier')
    .eq('id', user.id)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Investor'

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-black/[0.08] bg-white flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-black/[0.06]">
          <Link href="/" className="flex items-center gap-2.5">
            {/* Osooley logo mark - segmented circle in gold */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" stroke="#C9A84C" strokeWidth="2" fill="none"/>
              <line x1="16" y1="2" x2="16" y2="30" stroke="#C9A84C" strokeWidth="1.5"/>
              <line x1="2" y1="16" x2="30" y2="16" stroke="#C9A84C" strokeWidth="1.5"/>
              <line x1="16" y1="16" x2="16" y2="30" stroke="#C9A84C" strokeWidth="1.5"/>
            </svg>
            <span className="font-serif text-lg text-[#1A1A1A] tracking-tight">Osooley</span>
          </Link>
          <p className="text-[10px] text-[#AAAAAA] mt-1 ml-10 uppercase tracking-widest">Vision. Action. Acquisition.</p>
        </div>

        {/* Profile pill */}
        <div className="px-4 py-4 border-b border-black/[0.06]">
          <div className="bg-[#F5F0E8] rounded-xl p-3">
            <p className="text-[#1A1A1A] text-sm font-medium">{firstName}</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {[profile?.goal, profile?.risk_tolerance, profile?.investment_tier]
                .filter(Boolean)
                .map(tag => (
                  <span key={tag} className="text-[10px] uppercase tracking-wider text-[#C9A84C] bg-[#C9A84C]/10 px-1.5 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
            </div>
          </div>
        </div>

        {/* Nav */}
        <SidebarNav />

        {/* Bottom */}
        <div className="px-4 py-4 border-t border-black/[0.06]">
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-[#F5F0E8]">
        {children}
      </main>
    </div>
  )
}
