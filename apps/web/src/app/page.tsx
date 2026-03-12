import QaLandingPage from '@/components/qa/landing-page'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>
}) {
  const { auth } = await searchParams
  const mode =
    auth === 'signup' ? 'signup' : auth === 'login' ? 'signin' : undefined

  return <QaLandingPage initialAuthMode={mode} />
}
