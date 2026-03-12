'use client'

import { cn } from '@Intelligent-QA-Assistant/ui/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

export function NavLink({
  href,
  icon: Icon,
  label,
  collapsed = false,
}: {
  href: '/dashboard' | '/documents' | '/chat' | '/settings'
  icon: LucideIcon
  label: string
  collapsed?: boolean
}) {
  const pathname = usePathname()
  const active = pathname === href

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
        active
          ? 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-primary)_20%,transparent)]'
          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
      )}
    >
      <Icon className="size-4" />
      {!collapsed ? <span>{label}</span> : null}
    </Link>
  )
}
