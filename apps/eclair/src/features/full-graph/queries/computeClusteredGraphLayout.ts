import type { ExternalLink } from '@living-architecture/riviere-schema'
import { compareByCodePoint } from '@/platform/domain/compare-by-code-point'
import type {
  Edge, Node 
} from '@/platform/domain/eclair-types'
import type {
  SimulationLink, SimulationNode 
} from '@/platform/infra/graph/graph-types'
import {
  truncateClusteredNodeLabel,
  type DomainCircle,
  packDomainNodes,
} from '@/platform/infra/graph/ClusteredGraph/computeCircleEnclosures'
import { renderClusteredGraphvizLayout } from '@/platform/infra/graph/graphviz/renderClusteredGraphvizLayout'
import {
  createSimulationNodes,
  createSimulationLinks,
  createExternalNodes,
  createExternalLinks,
  getNodeRadius,
} from '@/platform/infra/graph/ForceGraph/VisualizationDataAdapters'
import { LayoutError } from '@/platform/infra/errors/errors'
import { buildDomainClusters } from '../domain/clustered-graph/buildDomainClusters'

export interface ClusteredGraphLayout {
  readonly nodes: readonly SimulationNode[]
  readonly links: readonly SimulationLink[]
  readonly circles: readonly DomainCircle[]
  readonly uniqueDomains: readonly string[]
}

const DOMAIN_LAYOUT_PADDING = 84
const EXTERNAL_LAYOUT_WIDTH = 148
const EXTERNAL_LAYOUT_HEIGHT = 80

function createDomainLayoutId(domain: string): string {
  return `domain:${domain}`
}

function estimateExternalNodeWidth(label: string): number {
  return Math.max(EXTERNAL_LAYOUT_WIDTH, Math.min(220, label.length * 7 + 46))
}

function buildDomainLevelEdges(params: {
  readonly internalNodes: readonly SimulationNode[]
  readonly internalEdges: readonly Edge[]
  readonly externalLinks: readonly ExternalLink[]
}): readonly {
  source: string;
  target: string 
}[] {
  const domainByNodeId = new Map(params.internalNodes.map((node) => [node.id, node.domain]))
  const seenEdgeKeys = new Set<string>()
  const layoutEdges: {
    source: string;
    target: string 
  }[] = []

  for (const edge of params.internalEdges) {
    const sourceDomain = domainByNodeId.get(edge.source)
    const targetDomain = domainByNodeId.get(edge.target)

    if (sourceDomain === undefined || targetDomain === undefined || sourceDomain === targetDomain) {
      continue
    }

    const source = createDomainLayoutId(sourceDomain)
    const target = createDomainLayoutId(targetDomain)
    const edgeKey = `${source}->${target}`

    if (seenEdgeKeys.has(edgeKey)) {
      continue
    }

    seenEdgeKeys.add(edgeKey)
    layoutEdges.push({
      source,
      target 
    })
  }

  for (const link of params.externalLinks) {
    const sourceDomain = domainByNodeId.get(link.source)

    if (sourceDomain === undefined) {
      continue
    }

    const source = createDomainLayoutId(sourceDomain)
    const target = `external:${link.target.name}`
    const edgeKey = `${source}->${target}`

    if (seenEdgeKeys.has(edgeKey)) {
      continue
    }

    seenEdgeKeys.add(edgeKey)
    layoutEdges.push({
      source,
      target 
    })
  }

  return layoutEdges
}

export async function computeClusteredGraphLayout(params: {
  readonly nodes: readonly Node[]
  readonly edges: readonly Edge[]
  readonly externalLinks: readonly ExternalLink[] | undefined
}): Promise<ClusteredGraphLayout> {
  const externalLinksInput = params.externalLinks === undefined ? [] : [...params.externalLinks]
  const regularNodes = createSimulationNodes([...params.nodes])
  const regularLinks = createSimulationLinks([...params.edges])
  const externalNodes = createExternalNodes(externalLinksInput)
  const externalLinks = createExternalLinks(externalLinksInput)
  const domainClusters = buildDomainClusters(params.nodes)
  const packedDomains = packDomainNodes({
    nodes: regularNodes,
    clusters: domainClusters,
    getNodeRadius,
  })

  const layoutNodes = [
    ...packedDomains.map((cluster) => ({
      id: createDomainLayoutId(cluster.domain),
      label: cluster.label,
      widthPx: Math.max(cluster.r * 2 + DOMAIN_LAYOUT_PADDING, 240),
      heightPx: Math.max(cluster.r * 2 + DOMAIN_LAYOUT_PADDING, 240),
    })),
    ...externalNodes.map((node) => ({
      id: node.id,
      label: truncateClusteredNodeLabel(node.name),
      widthPx: estimateExternalNodeWidth(truncateClusteredNodeLabel(node.name)),
      heightPx: EXTERNAL_LAYOUT_HEIGHT,
    })),
  ]
  const layoutEdges = buildDomainLevelEdges({
    internalNodes: regularNodes,
    internalEdges: params.edges,
    externalLinks: externalLinksInput,
  })
  const islandLayout = await renderClusteredGraphvizLayout({
    nodes: layoutNodes,
    edges: layoutEdges,
  })

  const internalNodeById = new Map(regularNodes.map((node) => [node.id, node]))
  const circles: DomainCircle[] = packedDomains.map((cluster) => {
    const domainPosition = islandLayout.positions.get(createDomainLayoutId(cluster.domain))

    if (domainPosition === undefined) {
      throw new LayoutError(`Missing Graphviz position for domain '${cluster.domain}'`)
    }

    for (const [nodeId, offset] of cluster.nodeOffsets.entries()) {
      const node = internalNodeById.get(nodeId)

      if (node === undefined) {
        throw new LayoutError(`Packed node '${nodeId}' not found in clustered graph layout`)
      }

      node.x = domainPosition.x + offset.x
      node.y = domainPosition.y + offset.y
    }

    return {
      id: cluster.id,
      domain: cluster.domain,
      label: cluster.label,
      x: domainPosition.x,
      y: domainPosition.y,
      r: cluster.r,
      nodeIds: cluster.nodeIds,
    }
  })

  for (const externalNode of externalNodes) {
    const position = islandLayout.positions.get(externalNode.id)

    if (position === undefined) {
      throw new LayoutError(`Missing Graphviz position for external node '${externalNode.id}'`)
    }

    externalNode.x = position.x
    externalNode.y = position.y
  }

  const uniqueDomains = [...new Set(regularNodes.map((node) => node.domain))].sort(
    compareByCodePoint,
  )

  return {
    nodes: [...regularNodes, ...externalNodes],
    links: [...regularLinks, ...externalLinks],
    circles,
    uniqueDomains,
  }
}
