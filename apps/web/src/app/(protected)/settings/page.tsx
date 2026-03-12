import QaSettingsPage from '@/components/qa/settings-page'
import { verifyQaSession } from '@/lib/qa-auth'

export default async function SettingsPage() {
  await verifyQaSession()
  return <QaSettingsPage />
}
