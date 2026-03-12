import QaDashboardPage from '@/components/qa/dashboard-page'
import { verifyQaSession } from '@/lib/qa-auth'

export default async function DashboardPage() {
  const session = await verifyQaSession()

  return (
    <QaDashboardPage
      userName={session.user.name || session.user.email || 'Operator'}
    />
  )
}
