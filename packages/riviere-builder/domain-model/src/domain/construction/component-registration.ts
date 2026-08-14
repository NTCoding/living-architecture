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

/** @riviere-role domain-service */
export function registerComponent<T extends Component>(
  graph: BuilderGraph,
  component: T,
): Readonly<{
  graph: BuilderGraph
  component: T
}> {
  if (graph.components.some((existing) => existing.id === component.id)) {
    throw new DuplicateComponentError(component.id)
  }

  return {
    graph: graph.withComponent(component),
    component,
  }
}

/** @riviere-role domain-service */
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
  const existingIndex = graph.components.findIndex((component) => component.id === incoming.id)
  if (existingIndex === -1) {
    return {
      graph: graph.withComponent(incoming),
      component: incoming,
      created: true,
    }
  }

  const existing = graph.components[existingIndex]
  if (!isSameTypeComponent(existing, incoming)) {
    throw new ComponentTypeMismatchError(incoming.id, existing?.type ?? 'unknown', incoming.type)
  }

  const component = mergeComponentForUpsert(existing, incoming, options, addWarning)

  return {
    graph: graph.withComponentAt(existingIndex, component),
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
