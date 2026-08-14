import type * as RiviereSchema from '@living-architecture/riviere-schema-published-language/schema'
import * as EclairDomain from '@/platform/domain/eclair-types'
import { getEffectiveNodeType } from '@/platform/domain/node-type-presentation'

export interface DomainNode {
  id: string
  type: string
  typeDescription?: string
  name: string
  location: string | undefined
  sourceLocation: RiviereSchema.SourceLocation | undefined
}

export type NodeBreakdown = Record<string, number>

const NODE_TYPE_PRIORITY: Readonly<Record<string, number>> = {
  UI: 1,
  API: 2,
  UseCase: 3,
  DomainOp: 4,
  Event: 5,
  EventHandler: 6,
}

export function countNodesByType(nodes: EclairDomain.Node[]): NodeBreakdown {
  const breakdown: NodeBreakdown = {}
  for (const node of nodes) {
    const type = getEffectiveNodeType(node)
    breakdown[type] = (breakdown[type] ?? 0) + 1
  }
  return breakdown
}

function formatLocation(filePath: string, lineNumber: number | undefined): string {
  if (lineNumber !== undefined) {
    return `${filePath}:${lineNumber}`
  }
  return filePath
}

export function formatDomainNodes(
  nodes: EclairDomain.Node[],
  customTypes: Record<string, RiviereSchema.CustomTypeDefinition> | undefined = undefined,
): DomainNode[] {
  return nodes
    .map((node) => {
      const typeDescription =
        node.type === 'Custom' ? customTypes?.[node.customTypeName]?.description : undefined
      return {
        id: node.id,
        type: getEffectiveNodeType(node),
        ...(typeDescription === undefined ? {} : { typeDescription }),
        name: node.name,
        location: formatLocation(node.sourceLocation.filePath, node.sourceLocation.lineNumber),
        sourceLocation: node.sourceLocation,
      }
    })
    .sort((a, b) => {
      const priorityDifference =
        (NODE_TYPE_PRIORITY[a.type] ?? Number.MAX_SAFE_INTEGER) -
        (NODE_TYPE_PRIORITY[b.type] ?? Number.MAX_SAFE_INTEGER)
      if (priorityDifference !== 0) return priorityDifference
      const typeOrder = a.type.localeCompare(b.type)
      if (typeOrder !== 0) return typeOrder
      return a.name.localeCompare(b.name)
    })
}

export function extractEntryPoints(
  nodes: EclairDomain.Node[],
): ReturnType<typeof EclairDomain.entryPointSchema.parse>[] {
  const entryPoints: ReturnType<typeof EclairDomain.entryPointSchema.parse>[] = []
  for (const node of nodes) {
    if (node.type === 'UI') {
      entryPoints.push(EclairDomain.entryPointSchema.parse(node.route))
    } else if (node.type === 'API' && node.path !== undefined) {
      entryPoints.push(EclairDomain.entryPointSchema.parse(node.path))
    }
  }
  return entryPoints
}
