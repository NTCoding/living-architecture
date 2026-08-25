import type { Component } from '@living-architecture/riviere-schema-published-language/schema'
import type { BuilderGraph } from '../builder-graph'
import { ComponentTypeMismatchError, DuplicateComponentError } from './construction-errors'
import { mergeComponentForUpsert } from '../enrichment/upsert-merge'

type AddScalarOverwriteWarning = (
  warning: Readonly<{
    code: 'SCALAR_OVERWRITE'
    message: string
    componentId: string
    field: string
    oldValue: string | number | boolean
    newValue: string | number | boolean
  }>,
) => void

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function registerComponent<T extends Component>(
  graph: BuilderGraph,
  component: T,
): Readonly<{
  graph: BuilderGraph
  component: T
}> {
  if (graph.hasComponent(component.id)) {
    throw new DuplicateComponentError(component.id)
  }

  graph.withComponent(component)

  return {
    graph,
    component,
  }
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function upsertComponent<T extends Component>(
  graph: BuilderGraph,
  incoming: T,
  options: Readonly<{ noOverwrite?: boolean }> | undefined,
  addWarning: AddScalarOverwriteWarning,
): Readonly<{
  graph: BuilderGraph
  component: T
  created: boolean
}> {
  if (!graph.hasComponent(incoming.id)) {
    graph.withComponent(incoming)
    return {
      graph,
      component: incoming,
      created: true,
    }
  }

  const existingIndex = graph.getComponentIndex(incoming.id)
  const existing = graph.getComponent(incoming.id)
  if (!isSameTypeComponent(existing, incoming)) {
    throw new ComponentTypeMismatchError(incoming.id, existing?.type ?? 'unknown', incoming.type)
  }

  const component = mergeComponentForUpsert(existing, incoming, options, addWarning)

  graph.withComponentAt(existingIndex, component)

  return {
    graph,
    component,
    created: false,
  }
}

function isSameTypeComponent<T extends Component>(
  existing: Component | undefined,
  incoming: T,
): existing is T {
  return existing?.type === incoming.type
}
