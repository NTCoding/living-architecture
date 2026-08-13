import { RiviereQuery } from '@living-architecture/riviere-builder/query'
import type { ComponentType } from '@living-architecture/riviere-schema/schema'
import type { QueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model */
export type ListedComponent = ReturnType<RiviereQuery['components']>[number]

/** @riviere-role query-model */
export class ComponentList {
  private constructor(readonly components: ListedComponent[]) {}

  static parse(
    graph: unknown,
    domain: string | undefined,
    type: ComponentType | undefined,
  ): ComponentList {
    const allComponents = RiviereQuery.fromJSON(graph).components()
    const inDomain =
      domain === undefined
        ? allComponents
        : allComponents.filter((component) => component.domain === domain)
    const components =
      type === undefined ? inDomain : inDomain.filter((component) => component.type === type)
    return new ComponentList(components)
  }
}

/** @riviere-role query-model */
export type ListComponentsResult =
  | ComponentList
  | QueryGraphLoadFailure
  | {
      readonly kind: 'invalidComponentType'
      readonly message: string
    }
