import { expect, type Page } from '@playwright/test'

export function buildCredentials() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  return {
    name: `E2E User ${suffix}`,
    email: `e2e-${suffix}@example.com`,
    password: 'password123',
  }
}

export async function signUpViaHome(page: Page, input = buildCredentials()) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start for Free' }).click()
  const switchToSignUp = page.getByRole('button', {
    name: 'Need an account? Sign Up',
  })

  if (
    await switchToSignUp
      .waitFor({
        state: 'visible',
        timeout: 3_000,
      })
      .then(() => true)
      .catch(() => false)
  ) {
    await switchToSignUp.click()
  }

  await expect(page.getByLabel('Name')).toBeVisible()
  await page.getByLabel('Name').fill(input.name)
  await page.getByLabel('Email').fill(input.email)
  await page.getByLabel('Password').fill(input.password)
  const signUpResponse = page.waitForResponse((response) => {
    return (
      response.url().includes('/api/auth/sign-up/email') &&
      response.request().method() === 'POST'
    )
  })

  await page.getByRole('button', { name: 'Sign Up' }).click()
  expect((await signUpResponse).status()).toBe(200)

  await page.goto('/dashboard')

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByRole('button', { name: input.name })).toBeVisible()

  return input
}
