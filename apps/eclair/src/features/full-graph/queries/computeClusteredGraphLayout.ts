import type { ExternalLink } from '@living-architecture/riviere-schema'
import { compareByCodePoint } from '@/platform/domain/compare-by-code-point'
import type { Edge, Node } from '@/platform/domain/eclair-types'
import type { SimulationLink, SimulationNode } from '@/platform/infra/graph/graph-types'
import {
  computeCircleEnclosures,
  type DomainCircle,
} from '@/platform/infra/graph/ClusteredGraph/computeCircleEnclosures'
import { renderClusteredGraphvizLayout } from '@/platform/infra/graph/graphviz/renderClusteredGraphvizLayout'
import {
  createSimulationNodes,
  createSimulationLinks,
  createExternalNodes,
  createExternalLinks,
  getNodeRadius,
  truncateName,
} from '@/platform/infra/graph/ForceGraph/VisualizationDataAdapters'
import { buildDomainClusters } from '../domain/clustered-graph/buildDomainClusters'

export interface ClusteredGraphLayout {
  readonly nodes: readonly SimulationNode[]
  readonly links: readonly SimulationLink[]
  readonly circles: readonly DomainCircle[]
  readonly uniqueDomains: readonly string[]
}

export async function computeClusteredGraphLayout(params: {
  readonly nodes: readonly Node[]
  readonly edges: readonly Edge[]
  readonly externalLinks: readonly ExternalLink[] | undefined
}): Promise<ClusteredGraphLayout> {
  const externalLinksInput =
    params.externalLinks === undefined ? undefined : [...params.externalLinks]
  const regularNodes = createSimulationNodes([...params.nodes])
  const regularLinks = createSimulationLinks([...params.edges])
  const externalNodes = createExternalNodes(externalLinksInput)
  const externalLinks = createExternalLinks(externalLinksInput)
  const layoutNodes = [...regularNodes, ...externalNodes]
  const clusters = buildDomainClusters(params.nodes)
  const layoutEdges = [
    ...params.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
    })),
    ...(externalLinksInput ?? []).map((link) => ({
      source: link.source,
      target: `external:${link.target.name}`,
    })),
  ]
  const layoutResult = await renderClusteredGraphvizLayout({
    nodes: layoutNodes.map((node) => ({
      id: node.id,
      label: truncateName(node.name, 26),
    })),
    edges: layoutEdges,
    clusters: clusters.map((cluster) => ({
      id: cluster.id,
      label: cluster.label,
      nodeIds: cluster.nodeIds,
    })),
  })

  for (const node of layoutNodes) {
    const position = layoutResult.positions.get(node.id)
    if (position !== undefined) {
      node.x = position.x
      node.y = position.y
    }
  }

  const circles = computeCircleEnclosures({
    nodes: regularNodes,
    clusters,
    getNodeRadius,
  })
  const uniqueDomains = [...new Set(regularNodes.map((node) => node.domain))].sort(
    compareByCodePoint,
  )

  return {
    nodes: layoutNodes,
    links: [...regularLinks, ...externalLinks],
    circles,
    uniqueDomains,
  }
}
