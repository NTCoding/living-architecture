import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import type { ComponentType } from '@living-architecture/riviere-schema/schema'
import { OrphanList } from '../../queries/detect-orphans-result'
import { ComponentList } from '../../queries/list-components-result'
import { DomainList } from '../../queries/list-domains-result'
import { EntryPointList } from '../../queries/list-entry-points-result'
import { ComponentSearch } from '../../queries/search-components-result'
import { FoundFlowTrace, type FlowTrace } from '../../queries/trace-flow-result'
import { GraphCorruptedError } from './graph-corrupted-error'
import { GraphNotFoundError } from './graph-not-found-error'

const DEFAULT_GRAPH_PATH = '.riviere/graph.json'

/** @riviere-role query-model-loader */
export class ComponentListLoader {
  load(
    graphPathOption: string | undefined,
    domain: string | undefined,
    type: ComponentType | undefined,
  ): ComponentList {
    return loadQueryModel(graphPathOption, (graph) => ComponentList.parse(graph, domain, type))
  }
}

/** @riviere-role query-model-loader */
export class DomainListLoader {
  load(graphPathOption: string | undefined): DomainList {
    return loadQueryModel(graphPathOption, DomainList.parse)
  }
}

/** @riviere-role query-model-loader */
export class EntryPointListLoader {
  load(graphPathOption: string | undefined): EntryPointList {
    return loadQueryModel(graphPathOption, EntryPointList.parse)
  }
}

/** @riviere-role query-model-loader */
export class OrphanListLoader {
  load(graphPathOption: string | undefined): OrphanList {
    return loadQueryModel(graphPathOption, OrphanList.parse)
  }
}

/** @riviere-role query-model-loader */
export class ComponentSearchLoader {
  load(graphPathOption: string | undefined, term: string): ComponentSearch {
    return loadQueryModel(graphPathOption, (graph) => ComponentSearch.parse(graph, term))
  }
}

/** @riviere-role query-model-loader */
export class FlowTraceLoader {
  load(graphPathOption: string | undefined, componentIdInput: string): FlowTrace {
    return loadQueryModel(graphPathOption, (graph) => FoundFlowTrace.parse(graph, componentIdInput))
  }
}

function loadQueryModel<T>(graphPathOption: string | undefined, parse: (graph: unknown) => T): T {
  const graphPath = resolveGraphPath(graphPathOption)
  if (!existsSync(graphPath)) {
    throw new GraphNotFoundError(graphPath)
  }
  const content = readFileSync(graphPath, 'utf-8')
  try {
    const parsed: unknown = JSON.parse(content)
    return parse(parsed)
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
