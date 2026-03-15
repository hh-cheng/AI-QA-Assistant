import { expect, test } from '@playwright/test'

import { signUpViaHome } from './helpers'

test('authenticated user can chat and update model settings', async ({
  page,
}) => {
  await signUpViaHome(page)
  await page.goto('/chat')

  await page.getByRole('button', { name: 'New chat' }).click()
  await expect(page.getByRole('heading', { name: 'New Chat' })).toBeVisible()

  await page
    .getByPlaceholder('Ask something about your documents...')
    .fill('Explain the uploaded knowledge base')
  await page.getByRole('button', { name: 'Send' }).click()

  await expect(
    page.getByText('Standard test answer: Explain the uploaded knowledge base'),
  ).toBeVisible()

  await page.goto('/settings')
  await page.getByRole('radio').nth(1).check()
  await page.getByRole('button', { name: 'Save model preference' }).click()

  await expect(page.getByText('Model preference updated')).toBeVisible()
})
