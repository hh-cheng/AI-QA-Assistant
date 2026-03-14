import QaChatPage from './components/chat-page'
import { verifyQaSession } from '@/lib/qa-auth'

export default async function ChatPage() {
  await verifyQaSession()
  return <QaChatPage />
}
