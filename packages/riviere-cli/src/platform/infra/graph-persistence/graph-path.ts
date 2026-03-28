import { join } from 'node:path'

const DEFAULT_GRAPH_PATH = '.riviere/graph.json'

/** @riviere-role external-client-service */
export function resolveGraphPath(customPath?: string): string {
  return customPath ?? join(process.cwd(), DEFAULT_GRAPH_PATH)
}

/** @riviere-role external-client-service */
export function getDefaultGraphPathDescription(): string {
  return `Custom graph file path (default: ${DEFAULT_GRAPH_PATH})`
}
