import { describe, expect, it } from 'vitest'
import { AgentNames, FactoryAgent, UnknownFactoryAgent } from './factory-agent'

describe('FactoryAgent', () => {
  it('resolves every registered factory agent name', () => {
    for (const name of AgentNames.singleton().names()) {
      expect(FactoryAgent.fromName(name).name()).toBe(name)
    }
  })

  it('rejects a name that is not a factory agent', () => {
    expect(() => FactoryAgent.fromName('code-reviewer')).toThrow(UnknownFactoryAgent)
  })

  it('equals another factory agent carrying the same name', () => {
    expect(FactoryAgent.fromName('planner').equals(FactoryAgent.fromName('planner'))).toBe(true)
    expect(FactoryAgent.fromName('planner').equals(FactoryAgent.fromName('implementer'))).toBe(
      false,
    )
  })
})

describe('AgentNames', () => {
  it('carries the workers and every reviewer', () => {
    expect(AgentNames.singleton().names()).toStrictEqual([
      'planner',
      'implementer',
      'pull-request-writer',
      'architecture-review',
      'code-review',
      'bug-scanner',
    ])
  })
})
