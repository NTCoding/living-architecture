import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFlowsState } from './useFlowsState'

describe('useFlowsState', () => {
  describe('searchQuery', () => {
    it('initializes with empty search query', () => {
      const { result } = renderHook(() => useFlowsState())

      expect(result.current.searchQuery).toBe('')
    })

    it('updates search query', () => {
      const { result } = renderHook(() => useFlowsState())

      act(() => {
        result.current.setSearchQuery('order')
      })

      expect(result.current.searchQuery).toBe('order')
    })
  })

  describe('activeFilter', () => {
    it('initializes with all filter', () => {
      const { result } = renderHook(() => useFlowsState())

      expect(result.current.activeFilter).toBe('all')
    })

    it('updates active filter', () => {
      const { result } = renderHook(() => useFlowsState())

      act(() => {
        result.current.setActiveFilter('api')
      })

      expect(result.current.activeFilter).toBe('api')
    })
  })

  describe('expandedFlowIds', () => {
    it('initializes with no expanded flows', () => {
      const { result } = renderHook(() => useFlowsState())

      expect(result.current.expandedFlowIds.size).toBe(0)
    })

    it('toggles flow to expanded', () => {
      const { result } = renderHook(() => useFlowsState())

      act(() => {
        result.current.toggleFlow('flow-1')
      })

      expect(result.current.expandedFlowIds.has('flow-1')).toBe(true)
    })

    it('toggles flow to collapsed', () => {
      const { result } = renderHook(() => useFlowsState())

      act(() => {
        result.current.toggleFlow('flow-1')
      })

      act(() => {
        result.current.toggleFlow('flow-1')
      })

      expect(result.current.expandedFlowIds.has('flow-1')).toBe(false)
    })

    it('supports multiple expanded flows', () => {
      const { result } = renderHook(() => useFlowsState())

      act(() => {
        result.current.toggleFlow('flow-1')
        result.current.toggleFlow('flow-2')
      })

      expect(result.current.expandedFlowIds.has('flow-1')).toBe(true)
      expect(result.current.expandedFlowIds.has('flow-2')).toBe(true)
    })
  })

  describe('activeDomains', () => {
    it('initializes with empty set (all domains visible)', () => {
      const { result } = renderHook(() => useFlowsState())

      expect(result.current.activeDomains.size).toBe(0)
    })

    it('toggles domain to active', () => {
      const { result } = renderHook(() => useFlowsState())

      act(() => {
        result.current.toggleDomain('orders')
      })

      expect(result.current.activeDomains.has('orders')).toBe(true)
    })

    it('toggles domain to inactive', () => {
      const { result } = renderHook(() => useFlowsState())

      act(() => {
        result.current.toggleDomain('orders')
      })

      act(() => {
        result.current.toggleDomain('orders')
      })

      expect(result.current.activeDomains.has('orders')).toBe(false)
    })

    it('supports multiple active domains', () => {
      const { result } = renderHook(() => useFlowsState())

      act(() => {
        result.current.toggleDomain('orders')
        result.current.toggleDomain('shipping')
      })

      expect(result.current.activeDomains.has('orders')).toBe(true)
      expect(result.current.activeDomains.has('shipping')).toBe(true)
    })
  })
})
