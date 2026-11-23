import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OverviewBoard } from './overview-board'

function boardOf(answer: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(answer) })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('OverviewBoard', () => {
  it('shows each idea and each epic in its own column', async () => {
    boardOf({
      ideas: [{ slug: 'preset', title: 'Preset workflows', need: 'not-now', action: 'start-planning' }],
      planning: [{ slug: 'linking', title: 'Cross-repo linking', step: 'prd', stories: 0 }],
      inProgress: [{ slug: 'phase-13', title: 'Phase 13', step: null, stories: 7 }],
      done: [{ slug: 'phase-3', title: 'Phase 3', step: null, stories: 2 }],
    })

    render(<OverviewBoard />)

    await screen.findByText('Preset workflows')

    expect(
      [
        'not now',
        'Cross-repo linking',
        'prd',
        '7 stories',
        '2 stories',
      ].map((text) => screen.getByText(text).textContent),
    ).toStrictEqual(['not now', 'Cross-repo linking', 'prd', '7 stories', '2 stories'])
    expect(screen.getByRole('button', { name: 'Start planning' })).toBeDefined()
  })

  it('says 1 story for an epic that has one', async () => {
    boardOf({
      ideas: [],
      planning: [],
      inProgress: [{ slug: 'one', title: 'One', step: null, stories: 1 }],
      done: [],
    })

    render(<OverviewBoard />)

    await waitFor(() => expect(screen.getByText('1 story')).toBeDefined())
  })

  it('says what each empty column has none of', async () => {
    boardOf({ ideas: [], planning: [], inProgress: [], done: [] })

    render(<OverviewBoard />)

    expect(await screen.findByText('Nothing captured')).toBeDefined()
    expect(screen.getByText('Nothing in planning')).toBeDefined()
    expect(screen.getByText('Nothing in progress')).toBeDefined()
    expect(screen.getByText('Nothing done yet')).toBeDefined()
  })

  it('keeps saying it is reading when the answer is useless', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(null) })),
    )

    render(<OverviewBoard />)

    await waitFor(() => expect(screen.getByText('Reading the board.')).toBeDefined())
  })

  it('says it is reading the board before the answer arrives', () => {
    boardOf({})

    render(<OverviewBoard />)

    expect(screen.getByText('Reading the board.')).toBeDefined()
  })
})
