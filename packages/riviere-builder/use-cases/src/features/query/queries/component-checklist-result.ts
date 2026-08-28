/** @riviere-role query-model-value */
export interface ChecklistComponent {
  domain: string
  id: string
  name: string
  type: string
}

/** @riviere-role query-model-value */
export type ComponentChecklistErrorCode = 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND' | 'VALIDATION_ERROR'

type ComponentChecklistResultValue =
  | {
      readonly components: ChecklistComponent[]
      readonly success: true
      readonly total: number
    }
  | {
      readonly code: ComponentChecklistErrorCode
      readonly message: string
      readonly success: false
    }

/** @riviere-role query-model */
export class ComponentChecklistResult {
  private constructor(readonly result: ComponentChecklistResultValue) {}

  static fromGraph(graph: unknown, type: ComponentType | undefined): ComponentChecklistResult {
    const allComponents = RiviereQuery.fromJSON(graph).components()
    const filteredComponents =
      type === undefined
        ? allComponents
        : allComponents.filter((component) => component.type === type)
    const components = filteredComponents.map((component) => ({
      domain: component.domain,
      id: component.id,
      name: component.name,
      type: component.type,
    }))
    return new ComponentChecklistResult({ components, success: true, total: components.length })
  }

  static failure(code: ComponentChecklistErrorCode, message: string): ComponentChecklistResult {
    return new ComponentChecklistResult({ code, message, success: false })
  }
}
import { RiviereQuery } from '@living-architecture/riviere-builder-domain-model/query'
import type { ComponentType } from '@living-architecture/riviere-schema-published-language/schema'
