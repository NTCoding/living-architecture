import type { RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'
import {
  getEffectiveNodeType,
  getNodeTypeDescription,
} from '@/platform/domain/node-type-presentation'
import { compareByCodePoint } from '@/platform/domain/compare-by-code-point'

export interface ModuleNode {
  id: string
  name: string
  type: string
  typeDescription: string | undefined
}

interface ModuleInfo {
  name: string
  nodes: ModuleNode[]
}

export interface DomainModules {
  domain: string
  modules: ModuleInfo[]
}

export function extractModules(graph: RiviereGraph): DomainModules[] {
  const domains = new Map<string, Map<string, ModuleNode[]>>()

  for (const component of graph.components) {
    const modules = domains.get(component.domain) ?? new Map<string, ModuleNode[]>()
    const nodes = modules.get(component.module) ?? []
    const type = getEffectiveNodeType(component)
    nodes.push({
      id: component.id,
      name: component.name,
      type,
      typeDescription: getNodeTypeDescription(graph, type),
    })
    modules.set(component.module, nodes)
    domains.set(component.domain, modules)
  }

  return [...domains.entries()]
    .sort(([left], [right]) => compareByCodePoint(left, right))
    .map(([domain, modules]) => ({
      domain,
      modules: [...modules.entries()]
        .sort(([left], [right]) => compareByCodePoint(left, right))
        .map(([name, nodes]) => ({
          name,
          nodes: nodes.toSorted((left, right) => compareByCodePoint(left.name, right.name)),
        })),
    }))
}
