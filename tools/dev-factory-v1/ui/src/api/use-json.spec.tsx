import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isMapping } from './read-json'
import { useJson } from './use-json'

function Board(): React.JSX.Element {
  const board = useJson('/api/one', isMapping)
  const title = board === undefined ? 'waiting' : String(board['title'])
  return <p>{title}</p>
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useJson', () => {
  it('gives the value once the answer has arrived', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ title: 'One' }) }),
      ),
    )

    render(<Board />)

    expect(await screen.findByText('One')).toBeDefined()
  })

  it('keeps the value out of a component that went away', async () => {
    const answer: { send: (value: unknown) => void } = { send: () => undefined }
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            answer.send = resolve
          }),
      ),
    )

    const shown = render(<Board />)
    shown.unmount()
    answer.send({ ok: true, status: 200, json: () => Promise.resolve({ title: 'One' }) })
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })

    expect(screen.queryByText('One')).toBeNull()
  })
})
