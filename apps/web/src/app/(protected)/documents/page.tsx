import QaDocumentsPage from '@/components/qa/documents-page'
import { verifyQaSession } from '@/lib/qa-auth'

export default async function DocumentsPage() {
  await verifyQaSession()
  return <QaDocumentsPage />
}
