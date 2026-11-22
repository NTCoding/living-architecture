import { describe, expect, it } from 'vitest'
import { DecisionBlock, decisionBlocksIn, InvalidDecisionBlock } from './decision-block'

const document = [
  '# The problem',
  '',
  'Real systems span several repositories.',
  '',
  '## Should a link that does not match any component fail the merge?',
  '',
  ':::decision d-1',
  'proposal: Report the link as unresolved and finish the merge.',
  'alternative: Fail the merge and list every unresolved link.',
  'pick: proposal, because a team often extracts one repository first.',
  ':::',
  '',
  '## A later question',
  '',
  ':::decision d-2',
  'proposal: Keep one file per repository.',
  'alternative: Write one merged graph file per workspace.',
  'pick: proposal.',
  ':::',
].join('\n')

describe('decisionBlocksIn', () => {
  it('finds each decision in the document', () => {
    const blocks = decisionBlocksIn(document)

    expect(blocks.map((block) => block.id())).toStrictEqual(['d-1', 'd-2'])
  })

  it('takes the heading above the block as the question', () => {
    const [first] = decisionBlocksIn(document)

    expect(first?.question()).toBe(
      'Should a link that does not match any component fail the merge?',
    )
  })

  it('reads the 2 options and what the agent picked', () => {
    const [first] = decisionBlocksIn(document)

    expect([first?.proposal(), first?.alternative(), first?.pick()]).toStrictEqual([
      'Report the link as unresolved and finish the merge.',
      'Fail the merge and list every unresolved link.',
      'proposal, because a team often extracts one repository first.',
    ])
  })

  it('gives the lines the block covers', () => {
    const [first] = decisionBlocksIn(document)

    expect([first?.firstLine(), first?.lastLine()]).toStrictEqual([7, 11])
  })

  it('finds no decision in a document without one', () => {
    expect(decisionBlocksIn('# The problem\n\nSome text.')).toStrictEqual([])
  })

  it('keeps a field that runs over several lines', () => {
    const wrapped = [
      '## A question',
      '',
      ':::decision d-1',
      'proposal: Report the link as unresolved',
      '  and finish the merge.',
      'alternative: Fail the merge.',
      'pick: proposal.',
      ':::',
    ].join('\n')

    expect(decisionBlocksIn(wrapped)[0]?.proposal()).toBe(
      'Report the link as unresolved\nand finish the merge.',
    )
  })

  it('ignores a line in the block that comes before any option', () => {
    const noisy = [
      '## A question',
      '',
      ':::decision d-1',
      'Some words that are not an option.',
      'proposal: Report the link.',
      'alternative: Fail the merge.',
      'pick: proposal.',
      ':::',
    ].join('\n')

    expect(decisionBlocksIn(noisy)[0]?.proposal()).toBe('Report the link.')
  })

  it('keeps a pick that runs over several lines', () => {
    const wrapped = [
      '## A question',
      '',
      ':::decision d-1',
      'proposal: Report the link.',
      'alternative: Fail the merge.',
      'pick: proposal, because a team',
      '  often extracts one repository first.',
      ':::',
    ].join('\n')

    expect(decisionBlocksIn(wrapped)[0]?.pick()).toBe(
      'proposal, because a team\noften extracts one repository first.',
    )
  })

  it('has no question when the heading above the block is only hashes', () => {
    const bare = [
      '#',
      '',
      ':::decision d-1',
      'proposal: x',
      'alternative: y',
      'pick: z',
      ':::',
    ].join('\n')

    expect(() => decisionBlocksIn(bare)).toThrow('has no question above it')
  })

  it('gives an empty option when the agent left it out', () => {
    const half = [
      '## A question',
      '',
      ':::decision d-1',
      'proposal: Report the link.',
      'alternative: Fail the merge.',
      ':::',
    ].join('\n')

    expect(decisionBlocksIn(half)[0]?.pick()).toBe('')
  })

  it('ignores a block that is never closed', () => {
    expect(decisionBlocksIn('## A question\n\n:::decision d-1\nproposal: x\n')).toStrictEqual([])
  })
})

describe('DecisionBlock', () => {
  const fields = {
    id: 'd-1',
    question: 'Should a link fail the merge?',
    proposal: 'Report it.',
    alternative: 'Fail the merge.',
    pick: 'proposal.',
    firstLine: 3,
    lastLine: 6,
  }

  it('rejects an id that is not a decision', () => {
    expect(() => DecisionBlock.from({ ...fields, id: 'c-1' })).toThrow(
      'A decision id looks like d-1',
    )
  })

  it('rejects a block with no question above it', () => {
    expect(() => DecisionBlock.from({ ...fields, question: '  ' })).toThrow(
      'has no question above it',
    )
  })

  it('says why a block cannot be read', () => {
    expect(new InvalidDecisionBlock('A decision id looks like d-1: c-1').message).toBe(
      'A decision id looks like d-1: c-1',
    )
  })
})
