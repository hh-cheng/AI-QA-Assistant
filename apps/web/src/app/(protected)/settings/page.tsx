import QaSettingsPage from './components/settings-page'
import { verifyQaSession } from '@/lib/qa-auth'

export default async function SettingsPage() {
  await verifyQaSession()
  return <QaSettingsPage />
}
