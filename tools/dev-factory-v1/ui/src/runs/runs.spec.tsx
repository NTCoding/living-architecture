import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Run, Runs } from './runs'

function answerOf(body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Runs', () => {
  it('lists the runs', async () => {
    answerOf({ runs: [{ runId: 'run-1', status: 'running', createdAt: 1 }] })

    render(<Runs />)

    expect(await screen.findByText('run-1')).toBeDefined()
    expect(screen.getByText(/running/)).toBeDefined()
  })

  it('says when nothing has run', async () => {
    answerOf({ runs: [] })

    render(<Runs />)

    expect(await screen.findByText('Nothing has run yet')).toBeDefined()
  })
})

describe('Run', () => {
  it('shows the status of one run', async () => {
    answerOf({ found: true, runId: 'run-1', status: 'success' })

    render(<Run runId="run-1" />)

    expect(await screen.findByText('success')).toBeDefined()
  })
})
