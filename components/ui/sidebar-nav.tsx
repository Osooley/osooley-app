'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard',        icon: '◈' },
  { href: '/markets',   label: 'Market explorer',  icon: '◉' },
  { href: '/analyze',   label: 'Analyze a deal',   icon: '◎' },
  { href: '/portfolio', label: 'Portfolio tracker', icon: '◫' },
]

export function SidebarNav() {
  const pathname = usePathname()
  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {NAV_LINKS.map(link => {
        const active = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href))
        return (
          <Link key={link.href} href={link.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
              active
                ? 'bg-[#C9A84C]/10 text-[#1A1A1A] border border-[#C9A84C]/30 font-medium'
                : 'text-[#888888] hover:text-[#1A1A1A] hover:bg-[#F5F0E8]'
            }`}>
            <span className={`font-mono text-xs transition-colors ${active ? 'text-[#C9A84C]' : 'text-[#AAAAAA] group-hover:text-[#C9A84C]'}`}>
              {link.icon}
            </span>
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
