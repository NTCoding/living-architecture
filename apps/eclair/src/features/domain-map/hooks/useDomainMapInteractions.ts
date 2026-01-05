import {
  useState, useCallback 
} from 'react'
import type { ConnectionDetail } from '../extractDomainMap'
import {
  pluralizeComponent, pluralizeConnection 
} from '../pluralize'

interface TooltipState {
  visible: boolean
  x: number
  y: number
  title: string
  detail: string
}

interface InspectorState {
  visible: boolean
  source: string
  target: string
  apiCount: number
  eventCount: number
  sourceNodeCount: number
  targetNodeCount: number
  connections: ConnectionDetail[]
}

interface UseDomainMapInteractionsOptions {initialFocusedDomain?: string | null}

interface UseDomainMapInteractionsResult {
  tooltip: TooltipState
  inspector: InspectorState
  focusedDomain: string | null
  showNodeTooltip: (x: number, y: number, label: string, nodeCount: number) => void
  showExternalNodeTooltip: (x: number, y: number, label: string, connectionCount: number) => void
  showEdgeTooltip: (x: number, y: number, source: string, target: string, apiCount: number, eventCount: number) => void
  hideTooltip: () => void
  selectEdge: (source: string, target: string, apiCount: number, eventCount: number, sourceNodeCount: number, targetNodeCount: number, connections: ConnectionDetail[]) => void
  closeInspector: () => void
  selectDomain: (domain: string) => void
  clearFocus: () => void
}

const TOOLTIP_OFFSET_X = 14
const TOOLTIP_OFFSET_Y = -14

export function useDomainMapInteractions(options: UseDomainMapInteractionsOptions = {}): UseDomainMapInteractionsResult {
  const { initialFocusedDomain = null } = options

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    title: '',
    detail: '',
  })

  const [inspector, setInspector] = useState<InspectorState>({
    visible: false,
    source: '',
    target: '',
    apiCount: 0,
    eventCount: 0,
    sourceNodeCount: 0,
    targetNodeCount: 0,
    connections: [],
  })

  const [focusedDomain, setFocusedDomain] = useState<string | null>(initialFocusedDomain)

  const showNodeTooltip = useCallback((x: number, y: number, label: string, nodeCount: number) => {
    setTooltip({
      visible: true,
      x: x + TOOLTIP_OFFSET_X,
      y: y + TOOLTIP_OFFSET_Y,
      title: label,
      detail: pluralizeComponent(nodeCount),
    })
  }, [])

  const showExternalNodeTooltip = useCallback((x: number, y: number, label: string, connectionCount: number) => {
    setTooltip({
      visible: true,
      x: x + TOOLTIP_OFFSET_X,
      y: y + TOOLTIP_OFFSET_Y,
      title: label,
      detail: `External System · ${pluralizeConnection(connectionCount)}`,
    })
  }, [])

  const showEdgeTooltip = useCallback((x: number, y: number, source: string, target: string, apiCount: number, eventCount: number) => {
    const total = apiCount + eventCount
    setTooltip({
      visible: true,
      x: x + TOOLTIP_OFFSET_X,
      y: y + TOOLTIP_OFFSET_Y,
      title: `${source} → ${target}`,
      detail: `${pluralizeConnection(total)} · Click for details`,
    })
  }, [])

  const hideTooltip = useCallback(() => {
    setTooltip((prev) => ({
      ...prev,
      visible: false 
    }))
  }, [])

  const selectEdge = useCallback((source: string, target: string, apiCount: number, eventCount: number, sourceNodeCount: number, targetNodeCount: number, connections: ConnectionDetail[]) => {
    setTooltip((prev) => ({
      ...prev,
      visible: false 
    }))
    setInspector({
      visible: true,
      source,
      target,
      apiCount,
      eventCount,
      sourceNodeCount,
      targetNodeCount,
      connections,
    })
  }, [])

  const closeInspector = useCallback(() => {
    setInspector((prev) => ({
      ...prev,
      visible: false 
    }))
  }, [])

  const selectDomain = useCallback((domain: string) => {
    setFocusedDomain((prev) => (prev === domain ? null : domain))
  }, [])

  const clearFocus = useCallback(() => {
    setFocusedDomain(null)
  }, [])

  return {
    tooltip,
    inspector,
    focusedDomain,
    showNodeTooltip,
    showExternalNodeTooltip,
    showEdgeTooltip,
    hideTooltip,
    selectEdge,
    closeInspector,
    selectDomain,
    clearFocus,
  }
}
