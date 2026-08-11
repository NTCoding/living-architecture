import { readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { findNearMatches } from '@living-architecture/riviere-builder/features/building/domain/error-recovery/component-suggestion'
import { ComponentId } from '@living-architecture/riviere-schema/component-id'
import {
  ComponentNotFoundError,
  parseComponentId,
  RiviereQuery,
} from '@living-architecture/riviere-query'
import type { ComponentType } from '@living-architecture/riviere-schema'
import { GraphCorruptedError } from '../../../platform/domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../platform/domain/graph-not-found-error'
import { fileExists } from '../../../platform/infra/external-clients/filesystem/file-existence'
import type { OrphanList } from '../queries/detect-orphans-result'
import type { ComponentList } from '../queries/list-components-result'
import type { DomainList } from '../queries/list-domains-result'
import type { EntryPointList } from '../queries/list-entry-points-result'
import type { ComponentSearch } from '../queries/search-components-result'
import type { FlowTrace } from '../queries/trace-flow-result'

const DEFAULT_GRAPH_PATH = '.riviere/graph.json'

/** @riviere-role query-model-loader */
export class ComponentListLoader {
  load(
    graphPathOption: string | undefined,
    domain: string | undefined,
    type: ComponentType | undefined,
  ): ComponentList {
    const allComponents = loadQuery(graphPathOption).components()
    const filteredByDomain =
      domain === undefined
        ? allComponents
        : allComponents.filter((component) => component.domain === domain)
    return {
      components:
        type === undefined
          ? filteredByDomain
          : filteredByDomain.filter((component) => component.type === type),
    }
  }
}

/** @riviere-role query-model-loader */
export class DomainListLoader {
  load(graphPathOption: string | undefined): DomainList {
    return { domains: loadQuery(graphPathOption).domains() }
  }
}

/** @riviere-role query-model-loader */
export class EntryPointListLoader {
  load(graphPathOption: string | undefined): EntryPointList {
    return { entryPoints: loadQuery(graphPathOption).entryPoints() }
  }
}

/** @riviere-role query-model-loader */
export class OrphanListLoader {
  load(graphPathOption: string | undefined): OrphanList {
    return { orphans: loadQuery(graphPathOption).detectOrphans() }
  }
}

/** @riviere-role query-model-loader */
export class ComponentSearchLoader {
  load(graphPathOption: string | undefined, term: string): ComponentSearch {
    return { components: loadQuery(graphPathOption).search(term) }
  }
}

/** @riviere-role query-model-loader */
export class FlowTraceLoader {
  load(graphPathOption: string | undefined, componentIdInput: string): FlowTrace {
    const query = loadQuery(graphPathOption)
    try {
      return {
        flow: query.traceFlow(parseComponentId(componentIdInput)),
        success: true,
      }
    } catch (error) {
      if (!(error instanceof ComponentNotFoundError)) {
        throw error
      }
      const componentId = ComponentId.parse(componentIdInput)
      const matches = findNearMatches(
        query.components(),
        { name: componentId.name() },
        { limit: 3 },
      )
      return {
        message: error.message,
        success: false,
        suggestions: matches.map((match) => match.component.id),
      }
    }
  }
}

function loadQuery(graphPathOption: string | undefined): RiviereQuery {
  const graphPath = resolveGraphPath(graphPathOption)
  if (!fileExists(graphPath)) {
    throw new GraphNotFoundError(graphPath)
  }
  const content = readFileSync(graphPath, 'utf-8')
  try {
    const parsed: unknown = JSON.parse(content)
    return RiviereQuery.fromJSON(parsed)
  } catch (error) {
    throw new GraphCorruptedError(graphPath, { cause: error })
  }
}

function resolveGraphPath(graphPathOption: string | undefined): string {
  const workingDirectory = resolve(process.cwd())
  const graphPath = resolve(workingDirectory, graphPathOption ?? DEFAULT_GRAPH_PATH)
  const pathFromWorkingDirectory = relative(workingDirectory, graphPath)
  const isOutsideWorkingDirectory =
    pathFromWorkingDirectory === '..' ||
    pathFromWorkingDirectory.startsWith(`..${sep}`) ||
    isAbsolute(pathFromWorkingDirectory)

  if (isOutsideWorkingDirectory) {
    throw new GraphNotFoundError(graphPath)
  }

  return graphPath
}
