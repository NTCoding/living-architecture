import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './app'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('shows the board at the root', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ideas: [], planning: [], inProgress: [], done: [] }),
        }),
      ),
    )

    render(<App path="/" />)

    expect(screen.getByRole('heading', { name: 'The board' })).toBeDefined()
  })

  it('says 404 for a page it does not have', () => {
    render(<App path="/nothing" />)

    expect(screen.getByText('There is no page at /nothing.')).toBeDefined()
  })
})
