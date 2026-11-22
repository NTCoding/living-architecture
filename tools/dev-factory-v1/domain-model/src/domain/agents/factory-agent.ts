import { Reviewers } from './reviewer'

const WORKER_AGENT_NAMES = ['planner', 'implementer', 'pull-request-writer'] as const

/**
 * The workers of the software factory: the agents that carry a GitHub issue to a reviewed pull
 * request. Every agent the factory registers carries one of these names.
 */

/** @riviere-role value-object */
export class AgentNames {
  declare private readonly brand: 'AgentNames'

  private constructor(private readonly agentNames: readonly string[]) {}

  static singleton(): AgentNames {
    return new AgentNames([
      ...WORKER_AGENT_NAMES,
      ...Reviewers.singleton()
        .all()
        .map((reviewer) => reviewer.name()),
    ])
  }

  names(): readonly string[] {
    return this.agentNames
  }
}

/** @riviere-role domain-error */
export class UnknownFactoryAgent extends Error {
  constructor(name: string) {
    super(`"${name}" is not a factory agent.`)
    this.name = 'UnknownFactoryAgent'
  }
}

/** @riviere-role value-object */
export class FactoryAgent {
  declare private readonly brand: 'FactoryAgent'

  private constructor(private readonly factoryAgentName: string) {}

  static fromName(value: string): FactoryAgent {
    if (!AgentNames.singleton().names().includes(value)) throw new UnknownFactoryAgent(value)
    return new FactoryAgent(value)
  }

  name(): string {
    return this.factoryAgentName
  }

  equals(other: FactoryAgent): boolean {
    return this.factoryAgentName === other.name()
  }
}
