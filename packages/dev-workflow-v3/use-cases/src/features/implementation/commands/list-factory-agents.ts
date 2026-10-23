import { AgentNames, FactoryAgent } from '@living-architecture/dev-workflow-v3-domain-model'

/** @riviere-role command-use-case-input */
export interface ListFactoryAgentsInput {
  readonly names: readonly string[] | undefined
}

/** @riviere-role command-use-case-result */
export interface ListFactoryAgentsResult {
  readonly agents: readonly string[]
}

/**
 * @riviere-role command-use-case
 */
export class ListFactoryAgents {
  execute(input: ListFactoryAgentsInput): ListFactoryAgentsResult {
    return {
      agents:
        input.names === undefined
          ? AgentNames.singleton().names()
          : input.names.map((name) => FactoryAgent.fromName(name).name()),
    }
  }
}
