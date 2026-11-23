import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Epic } from './epic-view'
import { PlanningBoard } from './planning-board'
import { PrdEditor } from './prd-editor'

function answerOf(body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PlanningBoard', () => {
  it('puts each epic in the lane of its step', async () => {
    answerOf({
      columns: [
        { step: 'problem-definition', epics: [] },
        { step: 'prd', epics: [{ slug: 'one', title: 'One' }] },
      ],
    })

    render(<PlanningBoard />)

    expect(await screen.findByText('One')).toBeDefined()
    expect(screen.getByText('Nothing on this step')).toBeDefined()
  })

  it('says it is reading the board', () => {
    answerOf({})

    render(<PlanningBoard />)

    expect(screen.getByText('Reading the planning board.')).toBeDefined()
  })
})

describe('Epic', () => {
  it('says where the epic is and which stories are closed', async () => {
    answerOf({
      slug: 'one',
      title: 'One',
      stage: 'planning',
      step: 'prd',
      features: [{ id: 'M1', title: 'Builder API', stories: [{ number: 901, closed: true }, { number: 902, closed: false }] }],
    })

    render(<Epic slug="one" />)

    expect(await screen.findByText('planning at prd')).toBeDefined()
    expect(screen.getByText('#901')).toBeDefined()
    expect(screen.getByText('done')).toBeDefined()
    expect(screen.getByText('open')).toBeDefined()
  })

  it('says the stage alone when the epic is not being planned', async () => {
    answerOf({ slug: 'one', title: 'One', stage: 'in-progress', step: null, features: [] })

    render(<Epic slug="one" />)

    expect(await screen.findByText('in-progress')).toBeDefined()
    expect(screen.getByText('No stories yet')).toBeDefined()
  })
})

describe('PrdEditor', () => {
  it('shows the document, its questions and its comments', async () => {
    answerOf({
      name: 'ARCH.md',
      html: '<h1>The architecture</h1>',
      decisions: [{ id: 'd-2', question: 'One file?', pick: 'proposal' }],
      threads: [{ id: 'c-1', waitsFor: 'nick', firstLine: 3, messages: [] }],
    })

    render(<PrdEditor epic="one" document="ARCH.md" />)

    expect(await screen.findByText('The architecture')).toBeDefined()
    expect(screen.getByText('One file?')).toBeDefined()
    expect(screen.getByText('line 3, waiting for nick')).toBeDefined()
  })
})
