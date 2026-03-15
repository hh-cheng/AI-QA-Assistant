import { expect, test } from '@playwright/test'

import { signUpViaHome } from './helpers'

test('user can sign up through the UI and reach the dashboard', async ({
  page,
}) => {
  await signUpViaHome(page)

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByRole('button', { name: /E2E User/ })).toBeVisible()
})
