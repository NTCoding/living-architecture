import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { ComponentChecklistInput } from './component-checklist-input'
import type { ComponentChecklistResult } from './component-checklist-result'

/** @riviere-role command-use-case */
export async function componentChecklist(
  input: ComponentChecklistInput,
): Promise<ComponentChecklistResult> {
  const repository = new RiviereBuilderRepository()
  const loadedGraph = await repository.load(input.graphPathOption)
  if (!loadedGraph.success) {
    return {
      code: loadedGraph.code,
      message:
        loadedGraph.code === 'GRAPH_NOT_FOUND'
          ? `Graph not found at ${loadedGraph.graphPath}`
          : 'Graph file contains invalid JSON',
      success: false,
    }
  }

  const allComponents = loadedGraph.builder.query().components()
  const filteredComponents =
    input.type === undefined
      ? allComponents
      : allComponents.filter((component) => component.type === input.type)
  const components = filteredComponents.map((component) => ({
    domain: component.domain,
    id: component.id,
    name: component.name,
    type: component.type,
  }))

  return {
    components,
    success: true,
    total: components.length,
  }
}
