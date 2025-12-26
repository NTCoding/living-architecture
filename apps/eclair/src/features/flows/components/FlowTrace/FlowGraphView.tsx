import { useMemo } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { ForceGraph } from '@/features/full-graph/components/ForceGraph'
import type { FlowStep } from '../../extractFlows'
import type { RiviereGraph } from '@/types/riviere'

interface FlowGraphViewProps {
  steps: FlowStep[]
  graph: RiviereGraph
}

function extractSubgraph(steps: FlowStep[], graph: RiviereGraph): RiviereGraph {
  const nodeIds = new Set(steps.map((step) => step.node.id))

  const components = graph.components.filter((node) => nodeIds.has(node.id))
  const links = graph.links.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
  const externalLinks = steps.flatMap((step) => step.externalLinks)

  return {
    ...graph,
    components,
    links,
    externalLinks,
  }
}

export function FlowGraphView({ steps, graph }: FlowGraphViewProps): React.ReactElement {
  const { theme } = useTheme()
  const subgraph = useMemo(() => extractSubgraph(steps, graph), [steps, graph])

  return (
    <div className="flow-graph-container">
      <ForceGraph graph={subgraph} theme={theme} />
    </div>
  )
}
