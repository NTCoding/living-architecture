import { RiviereBuilder } from '@living-architecture/riviere-builder'
import type { BuilderOptions } from '@living-architecture/riviere-builder'
import { GraphCorruptedError } from '../../../platform/domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../platform/domain/graph-not-found-error'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { InitGraphInput } from './init-graph-input'
import type { InitGraphResult } from './init-graph-result'

/** @riviere-role command-use-case */
export class InitGraph {
  constructor(private readonly repository: RiviereBuilderRepository) {}

  execute(input: InitGraphInput): InitGraphResult {
    const builderOptions: BuilderOptions = {
      ...(input.name === undefined ? {} : { name: input.name }),
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

    try {
      const builder = this.repository.load(input.graphPathOption)
      return {
        code: 'GRAPH_EXISTS',
        message: `Graph already exists at ${builder.graphPath}`,
        path: builder.graphPath,
        success: false,
      }
    } catch (error) {
      if (error instanceof GraphNotFoundError) {
        const newBuilder = RiviereBuilder.new(builderOptions, error.graphPath)
        this.repository.save(newBuilder)
        return {
          domains: input.domains.map((domain) => domain.name),
          path: newBuilder.graphPath,
          sources: input.sources.length,
          success: true,
        }
      }
      if (error instanceof GraphCorruptedError) {
        return {
          code: 'GRAPH_EXISTS',
          message: `Graph already exists at ${error.graphPath}`,
          path: error.graphPath,
          success: false,
        }
      }
      throw error
    }
  }
}
