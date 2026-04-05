import { RiviereBuilder } from '@living-architecture/riviere-builder'
import type { BuilderOptions } from '@living-architecture/riviere-builder'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { InitGraphInput } from './init-graph-input'
import type { InitGraphResult } from './init-graph-result'

/** @riviere-role command-use-case */
export function initGraph(input: InitGraphInput): InitGraphResult {
  const repository = new RiviereBuilderRepository()
  const graphStatus = repository.exists(input.graphPathOption)
  if (graphStatus.exists) {
    return {
      code: 'GRAPH_EXISTS',
      message: `Graph already exists at ${graphStatus.graphPath}`,
      path: graphStatus.graphPath,
      success: false,
    }
  }

  const builderOptions: BuilderOptions = {
    domains: Object.fromEntries(
      input.domains.map((domain) => [
        domain.name,
        {
          description: domain.description,
          systemType: domain.systemType,
        },
      ]),
    ),
    sources: input.sources.map((repositoryUrl) => ({ repository: repositoryUrl })),
  }

  if (input.name !== undefined) {
    builderOptions.name = input.name
  }

  const graphPath = repository.save(RiviereBuilder.new(builderOptions), input.graphPathOption)
  return {
    domains: input.domains.map((domain) => domain.name),
    path: graphPath,
    sources: input.sources.length,
    success: true,
  }
}
