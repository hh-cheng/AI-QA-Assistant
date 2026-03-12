import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { authClient } from '@/lib/auth-client'

export const verifyQaSession = cache(async () => {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  })

  if (!session?.user) {
    redirect('/?auth=login')
  }

  return session
})
