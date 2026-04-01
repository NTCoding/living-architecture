const DEFAULT_GRAPH_PATH = '.riviere/graph.json'

/** @riviere-role cli-output-formatter */
export function getDefaultGraphPathDescription(): string {
  return `Custom graph file path (default: ${DEFAULT_GRAPH_PATH})`
}
