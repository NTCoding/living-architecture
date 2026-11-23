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

  it('shows the planning board at /planning', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ columns: [] }) })),
    )

    render(<App path="/planning" />)

    expect(screen.getByText('Reading the planning board.')).toBeDefined()
  })

  it('shows one epic at /prds/one', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ title: 'One', stage: 'done', step: null, features: [] }),
        }),
      ),
    )

    render(<App path="/prds/one" />)

    expect(screen.getByText('Reading the epic.')).toBeDefined()
  })

  it('shows a document at /prds/one/ARCH.md', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) })),
    )

    render(<App path="/prds/one/ARCH.md" />)

    expect(screen.getByText('Reading the document.')).toBeDefined()
  })

  it('shows the runs at /runs', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ runs: [] }) })),
    )

    render(<App path="/runs" />)

    expect(screen.getByText('Reading the runs.')).toBeDefined()
  })

  it('shows one run at /runs/run-1', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) })),
    )

    render(<App path="/runs/run-1" />)

    expect(screen.getByText('Reading the run.')).toBeDefined()
  })

  it('says 404 for a page it does not have', () => {
    render(<App path="/nothing" />)

    expect(screen.getByText('There is no page at /nothing.')).toBeDefined()
  })
})
