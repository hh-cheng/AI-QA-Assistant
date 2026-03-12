'use client'

import { cn } from '@Intelligent-QA-Assistant/ui/lib/utils'
import {
  Brain,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Settings,
  User,
} from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import UserMenu from '@/components/user-menu'

import { NavLink } from './nav-link'

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/documents': 'Documents',
  '/chat': 'Chat',
  '/settings': 'Settings',
}

export default function QaAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="qa-shell min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        className="flex min-h-screen min-w-0 flex-1 flex-col"
      >
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
          className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-card/40 px-6 backdrop-blur-md"
        >
          <div className="flex items-center gap-8">
            <Link href="/" className="flex h-16 items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10">
                <Brain className="size-5 text-primary" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                DocMind
              </span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              <NavLink
                href="/dashboard"
                icon={LayoutDashboard}
                label="Dashboard"
              />
              <NavLink href="/documents" icon={FileText} label="Documents" />
              <NavLink href="/chat" icon={MessageSquare} label="Agent Chat" />
              <NavLink href="/settings" icon={Settings} label="Settings" />
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <User className="size-4 text-muted-foreground" />
            <UserMenu />
          </div>
        </motion.header>

        <main
          className={cn(
            'qa-grid flex-1 min-h-0 gradient-bg',
            pathname === '/chat' ? 'overflow-hidden' : '',
          )}
        >
          <div
            className={cn(
              'mx-auto flex h-full w-full max-w-[1600px] flex-col p-6 md:p-8',
              pathname === '/chat' ? 'pb-0' : '',
            )}
          >
            <div className="shrink-0">
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {routeTitles[pathname] ?? 'Workspace'}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Migrated from the original docusage-ai SPA with mock-backed
                  frontend and backend boundaries.
                </p>
              </div>
            </div>
            <div
              className={cn('min-h-0', pathname === '/chat' ? 'flex-1' : '')}
            >
              {children}
            </div>
          </div>
        </main>
      </motion.div>
    </div>
  )
}
