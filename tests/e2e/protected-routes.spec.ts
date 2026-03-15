import { expect, test } from '@playwright/test'

for (const path of ['/chat', '/documents', '/settings']) {
  test(`redirects unauthenticated users from ${path}`, async ({ page }) => {
    await page.goto(path)

    await expect(page).toHaveURL(/\/\?auth=login$/)
    await expect(
      page.getByRole('heading', { name: 'Welcome back' }),
    ).toBeVisible()
  })
}
