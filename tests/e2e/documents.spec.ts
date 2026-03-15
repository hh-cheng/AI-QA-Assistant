import { expect, test } from '@playwright/test'

import { signUpViaHome } from './helpers'

test('authenticated user can upload and delete a document', async ({
  page,
}) => {
  await signUpViaHome(page)
  await page.goto('/documents')

  await page.getByRole('button', { name: 'Upload document' }).first().click()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'policy.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Security policy for E2E coverage.'),
  })

  await expect(page.getByText('1 file(s) queued for indexing')).toBeVisible()
  await expect(page.getByText('policy.txt')).toBeVisible()

  await page
    .getByRole('row')
    .filter({ hasText: 'policy.txt' })
    .getByRole('button', { name: 'Delete' })
    .click()
  await page.getByRole('button', { name: 'Delete' }).last().click()

  await expect(page.getByText('Document deleted')).toBeVisible()
  await expect(page.getByText('policy.txt')).not.toBeVisible()
})
