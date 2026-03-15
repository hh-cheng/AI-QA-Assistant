import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from './dropdown-menu'

describe('DropdownMenu', () => {
  it('invokes enabled items when the menu is open', async () => {
    const user = userEvent.setup()
    const handleSelect = vi.fn()

    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={handleSelect}>Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )

    await user.click(await screen.findByText('Profile'))

    expect(handleSelect).toHaveBeenCalled()
  })

  it('keeps disabled items inert', async () => {
    const user = userEvent.setup()
    const handleSelect = vi.fn()

    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuContent>
          <DropdownMenuItem disabled onClick={handleSelect}>
            Disabled
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )

    await user.click(await screen.findByText('Disabled'))

    expect(handleSelect).not.toHaveBeenCalled()
  })
})
