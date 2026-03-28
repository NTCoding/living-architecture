import type { Theme } from '@/types/theme'
import {
  FullGraphViewTabs, type FullGraphViewMode 
} from '../FullGraphViewTabs/FullGraphViewTabs'

interface FocusColors {
  readonly borderColor: string
  readonly glowColor: string
  readonly shadowColor: string
}

interface FullGraphHeaderOverlayProps {
  readonly viewMode: FullGraphViewMode
  readonly onViewModeChange: (mode: FullGraphViewMode) => void
  readonly focusedDomain: string | null
  readonly focusedNodeCount: number
  readonly renderedNodeCount: number
  readonly renderedEdgeCount: number
  readonly domainCount: number
  readonly theme: Theme
  readonly focusColors: FocusColors
  readonly onClearFocus: () => void
}

function FocusedDomainBanner({
  focusedDomain,
  focusedNodeCount,
  theme,
  focusColors,
  onClearFocus,
}: Readonly<{
  focusedDomain: string
  focusedNodeCount: number
  theme: Theme
  focusColors: FocusColors
  onClearFocus: () => void
}>): React.ReactElement {
  return (
    <div
      className="floating-panel absolute left-2 top-4 z-10 animate-fade-in border-l-8 px-8 py-6 md:left-4"
      style={{
        borderLeftColor: focusColors.borderColor,
        boxShadow: `0 0 60px ${focusColors.shadowColor}, 0 8px 24px rgba(0, 0, 0, ${theme === 'voltage' ? 0.3 : 0.12})`,
        background: theme === 'voltage' ? 'rgba(26, 26, 36, 0.95)' : undefined,
      }}
      data-testid="focused-domain-banner"
    >
      <div className="flex items-center gap-4">
        <div
          className="h-4 w-4 animate-pulse rounded-full"
          style={{
            backgroundColor: focusColors.glowColor,
            boxShadow: `0 0 20px ${focusColors.shadowColor}`,
          }}
        />
        <div className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)] md:text-4xl">
          {focusedDomain}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] md:text-base">
        <i className="ph ph-circles-three text-base md:text-lg" />
        <span>{focusedNodeCount} nodes focused</span>
      </div>
      <button
        type="button"
        onClick={onClearFocus}
        className="mt-4 flex items-center gap-2 text-sm font-medium transition-colors"
        style={{ color: focusColors.borderColor }}
      >
        <i className="ph ph-x-circle text-base" />
        <span>Clear focus</span>
      </button>
    </div>
  )
}

function StatsPanel({
  renderedNodeCount,
  renderedEdgeCount,
  domainCount,
}: Readonly<{
  renderedNodeCount: number
  renderedEdgeCount: number
  domainCount: number
}>): React.ReactElement {
  return (
    <div className="floating-panel absolute left-2 top-4 z-10 md:left-4" data-testid="stats-panel">
      <h1 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">Full Graph</h1>
      <div className="flex flex-wrap gap-2 pr-24 text-xs text-[var(--text-secondary)] md:gap-4 md:pr-32">
        <span>{renderedNodeCount} nodes</span>
        <span>{renderedEdgeCount} edges</span>
        <span>{domainCount} domains</span>
      </div>
    </div>
  )
}

export function FullGraphHeaderOverlay({
  viewMode,
  onViewModeChange,
  focusedDomain,
  focusedNodeCount,
  renderedNodeCount,
  renderedEdgeCount,
  domainCount,
  theme,
  focusColors,
  onClearFocus,
}: Readonly<FullGraphHeaderOverlayProps>): React.ReactElement {
  return (
    <>
      <div className="floating-panel absolute left-1/2 top-4 z-10 -translate-x-1/2 px-2 py-2">
        <FullGraphViewTabs viewMode={viewMode} onChange={onViewModeChange} />
      </div>
      {focusedDomain === null ? (
        <StatsPanel
          renderedNodeCount={renderedNodeCount}
          renderedEdgeCount={renderedEdgeCount}
          domainCount={domainCount}
        />
      ) : (
        <FocusedDomainBanner
          focusedDomain={focusedDomain}
          focusedNodeCount={focusedNodeCount}
          theme={theme}
          focusColors={focusColors}
          onClearFocus={onClearFocus}
        />
      )}
    </>
  )
}
