import {
  useMemo, useState, useCallback, useRef 
} from 'react'
import { ForceGraph } from '@/platform/domain/graph/ForceGraph/ForceGraph'
import {
  GraphTooltip,
  type GraphTooltipData,
} from '@/platform/infra/presentation/GraphTooltip/GraphTooltip'
import type { TooltipData } from '@/platform/domain/graph/graph-types'
import type { FlowStep } from '../../queries/extract-flows'
import type { RiviereGraph } from '@living-architecture/riviere-schema'
import type { Theme } from '@/platform/domain/theme/theme'
import { DEFAULT_THEME } from '@/platform/domain/theme/theme'

interface FlowGraphViewProps {
  readonly steps: readonly FlowStep[]
  readonly graph: RiviereGraph
  readonly theme?: Theme
}

function toGraphTooltipData(data: TooltipData | null): GraphTooltipData | null {
  if (data === null) return null

  const { node } = data
  const sourceLocation = node.originalNode.sourceLocation
  return {
    domain: node.domain,
    incomingCount: data.incomingCount,
    name: node.name,
    outgoingCount: data.outgoingCount,
    ...(typeof sourceLocation.lineNumber === 'number' && {
      sourceLocation: {
        filePath: sourceLocation.filePath,
        lineNumber: sourceLocation.lineNumber,
        repository: sourceLocation.repository,
      },
    }),
    type: node.effectiveType ?? node.type,
    ...(node.typeDescription !== undefined && { typeDescription: node.typeDescription }),
    x: data.x,
    y: data.y,
  }
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
  steps, graph, theme = DEFAULT_THEME,
}: Readonly<FlowGraphViewProps>): React.ReactElement {
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
        data={toGraphTooltipData(tooltipData)}
        onMouseEnter={handleTooltipMouseEnter}
        onMouseLeave={handleTooltipMouseLeave}
      />
    </div>
  )
}
