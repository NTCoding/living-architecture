import { RiviereProject } from '@living-architecture/riviere-extract-ts-domain-model/domain/riviere-project'
import { GraphCorruptedError } from '../data-access/riviere-project/graph-corrupted-error'
import { GraphNotFoundError } from '../data-access/riviere-project/graph-not-found-error'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import { SystemType } from '@living-architecture/riviere-builder-published-language'
import type { InitGraphInput } from './init-graph-input'
import type { InitGraphResult } from './init-graph-result'

/** @riviere-role command-use-case */
export class InitGraph {
  constructor(private readonly repository: RiviereProjectRepository) {}

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
      this.repository.loadByGraphPath(input.graphFileLocation)
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
        const project = RiviereProject.start({ graphDefinition: builderOptions }).data
        this.repository.save(input.graphFileLocation, project)
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
