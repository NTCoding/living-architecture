import { RiviereBuilder } from '@living-architecture/riviere-builder-domain-model/domain/riviere-builder'
import { GraphCorruptedError } from '../data-access/riviere-builder/graph-corrupted-error'
import { GraphNotFoundError } from '../data-access/riviere-builder/graph-not-found-error'
import { RiviereBuilderRepository } from '../data-access/riviere-builder/riviere-builder-repository'
import { SystemType } from '@living-architecture/riviere-builder-domain-model/domain/system-type'
import type { InitGraphInput } from './init-graph-input'
import type { InitGraphResult } from './init-graph-result'

/** @riviere-role command-use-case */
export class InitGraph {
  constructor(private readonly repository: RiviereBuilderRepository) {}

  execute(input: InitGraphInput): InitGraphResult {
    const parsedDomains: {
      domain: InitGraphInput['domains'][number]
      systemType: SystemType
    }[] = []
    for (const domain of input.domains) {
      const systemType = SystemType.parse(domain.systemType)
      if (!systemType.success) {
        return {
          result: {
            code: 'VALIDATION_ERROR',
            message: `Invalid system type: ${domain.systemType}`,
            success: false,
          },
        }
      }
      parsedDomains.push({
        domain,
        systemType: systemType.data,
      })
    }

    const builderOptions = {
      ...(input.name === undefined ? {} : { name: input.name }),
      domains: Object.fromEntries(
        parsedDomains.map(({ domain, systemType }) => [
          domain.name,
          {
            description: domain.description,
            systemType: systemType.value,
          },
        ]),
      ),
      sources: input.sources.map((repositoryUrl) => ({ repository: repositoryUrl })),
    }

    try {
      this.repository.load(input.graphFileLocation)
      return {
        result: {
          code: 'GRAPH_EXISTS',
          message: `Graph already exists at ${input.graphFileLocation}`,
          path: input.graphFileLocation,
          success: false,
        },
      }
    } catch (error) {
      if (error instanceof GraphNotFoundError) {
        const newBuilder = RiviereBuilder.new(builderOptions)
        this.repository.save(input.graphFileLocation, newBuilder)
        return {
          result: {
            domains: input.domains.map((domain) => domain.name),
            path: input.graphFileLocation,
            sources: input.sources.length,
            success: true,
          },
        }
      }
      if (error instanceof GraphCorruptedError) {
        return {
          result: {
            code: 'GRAPH_EXISTS',
            message: `Graph already exists at ${error.graphPath}`,
            path: error.graphPath,
            success: false,
          },
        }
      }
      throw error
    }
  }
}
