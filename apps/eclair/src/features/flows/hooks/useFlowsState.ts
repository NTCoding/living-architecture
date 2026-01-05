import {
  useState, useCallback 
} from 'react'

export type FlowFilter = 'all' | 'ui' | 'api' | 'jobs'

interface FlowsState {
  searchQuery: string
  setSearchQuery: (query: string) => void
  activeFilter: FlowFilter
  setActiveFilter: (filter: FlowFilter) => void
  expandedFlowIds: Set<string>
  toggleFlow: (flowId: string) => void
  activeDomains: Set<string>
  toggleDomain: (domain: string) => void
}

export function useFlowsState(): FlowsState {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FlowFilter>('all')
  const [expandedFlowIds, setExpandedFlowIds] = useState<Set<string>>(new Set())
  const [activeDomains, setActiveDomains] = useState<Set<string>>(new Set())

  const toggleFlow = useCallback((flowId: string) => {
    setExpandedFlowIds((prev) => {
      const next = new Set(prev)
      if (next.has(flowId)) {
        next.delete(flowId)
      } else {
        next.add(flowId)
      }
      return next
    })
  }, [])

  const toggleDomain = useCallback((domain: string) => {
    setActiveDomains((prev) => {
      const next = new Set(prev)
      if (next.has(domain)) {
        next.delete(domain)
      } else {
        next.add(domain)
      }
      return next
    })
  }, [])

  return {
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    expandedFlowIds,
    toggleFlow,
    activeDomains,
    toggleDomain,
  }
}
