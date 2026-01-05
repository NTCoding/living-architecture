import {
  useMemo, useState, useCallback, useRef 
} from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { ForceGraph } from '@/features/full-graph/components/ForceGraph/ForceGraph'
import { GraphTooltip } from '@/features/full-graph/components/GraphTooltip/GraphTooltip'
import type { TooltipData } from '@/features/full-graph/types'
import type { FlowStep } from '../../extractFlows'
import type { RiviereGraph } from '@/types/riviere'

interface FlowGraphViewProps {
  readonly steps: readonly FlowStep[]
  readonly graph: RiviereGraph
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

export function FlowGraphView({
  steps, graph 
}: Readonly<FlowGraphViewProps>): React.ReactElement {
  const { theme } = useTheme()
  const subgraph = useMemo(() => extractSubgraph(steps, graph), [steps, graph])
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null)
  const tooltipHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleNodeHover = useCallback((data: TooltipData | null) => {
    if (tooltipHideTimeoutRef.current) {
      clearTimeout(tooltipHideTimeoutRef.current)
      tooltipHideTimeoutRef.current = null
    }

    if (data) {
      setTooltipData(data)
    } else {
      tooltipHideTimeoutRef.current = setTimeout(() => {
        setTooltipData(null)
      }, 200)
    }
  }, [])

  const handleTooltipMouseEnter = useCallback(() => {
    if (tooltipHideTimeoutRef.current) {
      clearTimeout(tooltipHideTimeoutRef.current)
      tooltipHideTimeoutRef.current = null
    }
  }, [])

  const handleTooltipMouseLeave = useCallback(() => {
    tooltipHideTimeoutRef.current = setTimeout(() => {
      setTooltipData(null)
    }, 200)
  }, [])

  return (
    <div className="flow-graph-container relative">
      <ForceGraph graph={subgraph} theme={theme} onNodeHover={handleNodeHover} />
      <GraphTooltip
        data={tooltipData}
        onMouseEnter={handleTooltipMouseEnter}
        onMouseLeave={handleTooltipMouseLeave}
      />
    </div>
  )
}
