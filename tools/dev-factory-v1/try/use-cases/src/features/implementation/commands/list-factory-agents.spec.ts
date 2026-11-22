import { describe, expect, it } from 'vitest'
import { ListFactoryAgents } from './list-factory-agents'

describe('ListFactoryAgents', () => {
  it('lists every agent the factory employs when no names are given', () => {
    const result = new ListFactoryAgents().execute({ names: undefined })

    expect(result.agents).toStrictEqual([
      'planner',
      'implementer',
      'pull-request-writer',
      'architecture-review',
      'code-review',
      'bug-scanner',
    ])
  })

  it('resolves the requested names against the factory agents', () => {
    const result = new ListFactoryAgents().execute({ names: ['planner', 'code-review'] })

    expect(result.agents).toStrictEqual(['planner', 'code-review'])
  })

  it('rejects a requested name that is not a factory agent', () => {
    expect(() => new ListFactoryAgents().execute({ names: ['code-reviewer'] })).toThrow(
      '"code-reviewer" is not a factory agent.',
    )
  })
})
