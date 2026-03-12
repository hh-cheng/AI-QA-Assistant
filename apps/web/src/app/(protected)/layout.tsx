import type { ReactNode } from 'react'

import QaAppShell from '@/components/qa/app-shell'

export default function QaProtectedLayout({
  children,
}: {
  children: ReactNode
}) {
  return <QaAppShell>{children}</QaAppShell>
}
