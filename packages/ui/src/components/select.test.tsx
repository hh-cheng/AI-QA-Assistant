import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'

describe('Select', () => {
  it('opens and selects an option', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()

    render(
      <Select defaultValue="alpha" onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="alpha">Alpha</SelectItem>
          <SelectItem value="beta">Beta</SelectItem>
        </SelectContent>
      </Select>,
    )

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: 'Beta' }))

    expect(onValueChange).toHaveBeenCalledWith('beta', expect.any(Object))
  })

  it('does not allow selecting a disabled option', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()

    render(
      <Select defaultValue="alpha" onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="alpha">Alpha</SelectItem>
          <SelectItem value="beta" disabled>
            Beta
          </SelectItem>
        </SelectContent>
      </Select>,
    )

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByText('Beta'))

    expect(onValueChange).not.toHaveBeenCalledWith('beta')
  })
})
