import { describe, expect, it } from 'vitest'
import { findAnchor } from './find-anchor'
import type { AnchorPosition, ThreadAnchor } from './find-anchor'

const markdown = [
  '# Cross-repo linking',
  '',
  'The first release merges the graphs of several repositories into one graph.',
  '',
  'It also supports polyglot systems, where each repository is written in another language.',
  '',
  'The merge reports every link that does not resolve.',
].join('\n')

interface AttachedPosition {
  readonly firstLine: number
  readonly lastLine: number
  readonly occurrence: number
}

function attached(position: AnchorPosition): AttachedPosition {
  return position.kind === 'attached' ? position : { firstLine: -1, lastLine: -1, occurrence: -1 }
}

function anchor(overrides: Partial<ThreadAnchor> = {}): ThreadAnchor {
  return {
    selectedText: 'polyglot systems',
    prefix: 'It also supports ',
    suffix: ', where each repository',
    firstLine: 5,
    occurrence: 0,
    ...overrides,
  }
}

describe('findAnchor', () => {
  it('finds the text on the lines it is still on', () => {
    expect(findAnchor(anchor(), markdown)).toStrictEqual({
      kind: 'attached',
      firstLine: 5,
      lastLine: 5,
      occurrence: 0,
    })
  })

  it('finds the text after the agent has moved it', () => {
    const moved = ['A new opening paragraph.', '', markdown].join('\n')

    const position = attached(findAnchor(anchor(), moved))

    expect(position.firstLine).toBe(7)
    expect(position.lastLine).toBe(7)
  })

  it('picks the copy the context points at when the text appears twice', () => {
    const twice = [markdown, '', 'Nothing else supports polyglot systems yet.'].join('\n')

    const position = attached(findAnchor(anchor(), twice))

    expect(position.firstLine).toBe(5)
  })

  it('picks the copy nearest the old line when the context has gone', () => {
    const twice = ['Nothing else supports polyglot systems yet.', '', markdown].join('\n')

    const position = attached(
      findAnchor(anchor({ prefix: 'Gone. ', suffix: ' Also gone.', firstLine: 7 }), twice),
    )

    expect(position.firstLine).toBe(7)
  })

  it('counts how many exact copies come before the one it found', () => {
    const twice = [markdown, '', 'Another mention of polyglot systems.'].join('\n')

    const position = attached(
      findAnchor(
        anchor({ prefix: 'Nothing matches. ', suffix: ' Nothing either.', firstLine: 9 }),
        twice,
      ),
    )

    expect(position.occurrence).toBe(1)
  })

  it('finds the text again when the agent changed a word in it', () => {
    const edited = markdown.replace('polyglot systems', 'polyglot system')

    const position = attached(findAnchor(anchor(), edited))

    expect(position.firstLine).toBe(5)
  })

  it('keeps the copy it already had when the other one is further away', () => {
    const twice = [markdown, '', 'Another mention of polyglot systems.'].join('\n')

    const position = attached(
      findAnchor(anchor({ prefix: 'Gone. ', suffix: ' Also gone.', firstLine: 5 }), twice),
    )

    expect(position.firstLine).toBe(5)
  })

  it('takes the copy that is nearer the old line', () => {
    const twice = [markdown, '', 'Another mention of polyglot systems.', ''].join('\n')

    const position = attached(
      findAnchor(anchor({ prefix: 'Gone. ', suffix: ' Also gone.', firstLine: 9 }), twice),
    )

    expect(position.firstLine).toBe(9)
  })

  it('says the thread has come loose when nothing was selected', () => {
    expect(findAnchor(anchor({ selectedText: '' }), markdown)).toStrictEqual({ kind: 'detached' })
  })

  it('says the thread has come loose when the text has gone', () => {
    const rewritten = '# Cross-repo linking\n\nThe first release merges the graphs.\n'

    expect(findAnchor(anchor(), rewritten)).toStrictEqual({ kind: 'detached' })
  })

  it('reports several lines when the selection spans them', () => {
    const position = findAnchor(
      anchor({
        selectedText: 'polyglot systems,\n\nwhere each repository',
        prefix: '',
        suffix: '',
      }),
      markdown,
    )

    expect(position).toStrictEqual({
      kind: 'attached',
      firstLine: 5,
      lastLine: 5,
      occurrence: 0,
    })
  })

  it('gives the last line of a selection that runs to the end of a line', () => {
    const position = findAnchor(
      anchor({
        selectedText: 'The merge reports every link that does not resolve.',
        prefix: '',
        suffix: '',
      }),
      markdown,
    )

    expect(position).toStrictEqual({
      kind: 'attached',
      firstLine: 7,
      lastLine: 7,
      occurrence: 0,
    })
  })
})
