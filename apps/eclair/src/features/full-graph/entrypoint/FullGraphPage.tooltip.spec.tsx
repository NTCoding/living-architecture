import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  hasCapturedNodeHoverCallback,
  mockTooltipData,
  renderFullGraphPage,
  resetCapturedCallbacks,
  triggerNodeHover,
} from './FullGraphPage-fixtures'

describe('FullGraphPage tooltip mouse interaction', () => {
  beforeEach(resetCapturedCallbacks)
  afterEach(() => vi.useRealTimers())

  it('captures onNodeHover callback from ForceGraph', () => {
    renderFullGraphPage()
    expect(hasCapturedNodeHoverCallback()).toBe(true)
  })

  it('tooltip appears when onNodeHover is called', () => {
    renderFullGraphPage()
    act(() => triggerNodeHover(mockTooltipData))
    expect(screen.getByTestId('graph-tooltip')).not.toBeNull()
  })

  it('tooltip hides after debounce when mouse leaves tooltip', async () => {
    vi.useFakeTimers()
    renderFullGraphPage()
    act(() => triggerNodeHover(mockTooltipData))
    expect(screen.getByTestId('graph-tooltip')).not.toBeNull()

    fireEvent.mouseLeave(screen.getByTestId('graph-tooltip'))
    expect(screen.getByTestId('graph-tooltip')).not.toBeNull()

    await act(async () => {
      vi.advanceTimersByTime(199)
    })
    expect(screen.getByTestId('graph-tooltip')).not.toBeNull()

    await act(async () => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.queryByTestId('graph-tooltip')).toBeNull()
  })

  it('tooltip stays visible when mouse re-enters before debounce expires', async () => {
    renderFullGraphPage()
    act(() => triggerNodeHover(mockTooltipData))
    expect(screen.getByTestId('graph-tooltip')).not.toBeNull()

    vi.useFakeTimers()
    const tooltip = screen.getByTestId('graph-tooltip')
    fireEvent.mouseLeave(tooltip)
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    fireEvent.mouseEnter(tooltip)
    await act(async () => {
      vi.advanceTimersByTime(150)
    })
    expect(screen.getByTestId('graph-tooltip')).not.toBeNull()
  })
})

describe('FullGraphPage tooltip cleanup', () => {
  beforeEach(resetCapturedCallbacks)
  afterEach(() => vi.useRealTimers())

  it('calls clearTimeout when component unmounts with pending timeout', () => {
    vi.useFakeTimers()
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    const { unmount } = renderFullGraphPage()

    act(() => triggerNodeHover(mockTooltipData))
    fireEvent.mouseLeave(screen.getByTestId('graph-tooltip'))
    const callCountBeforeUnmount = clearTimeoutSpy.mock.calls.length

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(callCountBeforeUnmount + 1)
    clearTimeoutSpy.mockRestore()
  })

  it('does not throw when unmounting with no pending timeout', () => {
    const { unmount } = renderFullGraphPage()
    expect(unmount).not.toThrow()
  })
})
