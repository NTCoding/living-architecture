import type {
  Edge, Node, ReactFlowInstance 
} from '@xyflow/react'

import type { ArchitectureEvolutionBoundaryData } from '../components/ArchitectureEvolutionBoundaryNode/ArchitectureEvolutionBoundaryNode'
import type {
  ArchitectureEvolutionEdgeData,
  ArchitectureEvolutionNodeData,
} from './architecture-evolution-scenario'

interface ArchitectureEvolutionCommit {
  readonly title: string
  readonly shortHash: string
  readonly date: string
  readonly author: string
  readonly description: string
}

export interface CommitHeaderProps {
  readonly stepIndex: number
  readonly totalSteps: number
  readonly commit: ArchitectureEvolutionCommit
  readonly showCommitDetails: boolean
  readonly showEdgeLabels: boolean
  readonly previousButtonClassName: string
  readonly nextButtonClassName: string
  readonly onToggleEdgeLabels: () => void
  readonly onToggleCommitDetails: () => void
  readonly onPreviousStep: () => void
  readonly onNextStep: () => void
}

export interface FlowControlsProps {
  readonly onZoomIn: () => void
  readonly onZoomOut: () => void
  readonly onToggleFullscreen: () => void
}

export function getRenderedFlowBounds(
  container: HTMLDivElement,
  reactFlowInstance: Pick<
    ReactFlowInstance<
      Node<ArchitectureEvolutionNodeData> | Node<ArchitectureEvolutionBoundaryData>,
      Edge<ArchitectureEvolutionEdgeData>
    >,
    'screenToFlowPosition'
  >,
): {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
} | null {
  const elements = [
    ...container.querySelectorAll<HTMLElement>('.react-flow__node'),
    ...container.querySelectorAll<SVGGElement>('[data-testid^="arch-evo-edge-label-"]'),
  ]

  if (elements.length === 0) {
    return null
  }

  const bounds = elements.reduce(
    (accumulator, element) => {
      const rect = element.getBoundingClientRect()

      if (rect.width === 0 || rect.height === 0) {
        return accumulator
      }

      return {
        minLeft: Math.min(accumulator.minLeft, rect.left),
        minTop: Math.min(accumulator.minTop, rect.top),
        maxRight: Math.max(accumulator.maxRight, rect.right),
        maxBottom: Math.max(accumulator.maxBottom, rect.bottom),
      }
    },
    {
      minLeft: Number.POSITIVE_INFINITY,
      minTop: Number.POSITIVE_INFINITY,
      maxRight: Number.NEGATIVE_INFINITY,
      maxBottom: Number.NEGATIVE_INFINITY,
    },
  )

  if (
    !Number.isFinite(bounds.minLeft) ||
    !Number.isFinite(bounds.minTop) ||
    !Number.isFinite(bounds.maxRight) ||
    !Number.isFinite(bounds.maxBottom)
  ) {
    return null
  }

  const topLeft = reactFlowInstance.screenToFlowPosition({
    x: bounds.minLeft,
    y: bounds.minTop,
  })
  const bottomRight = reactFlowInstance.screenToFlowPosition({
    x: bounds.maxRight,
    y: bounds.maxBottom,
  })

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  }
}

function truncateCommitTitle(title: string): string {
  if (title.length <= 46) return title
  return `${title.slice(0, 43)}...`
}

export function CommitHeader({
  stepIndex,
  totalSteps,
  commit,
  showCommitDetails,
  showEdgeLabels,
  previousButtonClassName,
  nextButtonClassName,
  onToggleEdgeLabels,
  onToggleCommitDetails,
  onPreviousStep,
  onNextStep,
}: CommitHeaderProps): React.ReactElement {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            Architecture Evolution
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)]">
              {stepIndex + 1} / {totalSteps}
            </span>
            <span className="truncate font-medium text-[var(--text-primary)]">
              {commit.date} · {truncateCommitTitle(commit.title)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="arch-evolution-label-toggle"
            aria-pressed={showEdgeLabels}
            onClick={onToggleEdgeLabels}
            className="rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)]"
          >
            {showEdgeLabels ? 'Hide labels' : 'Show labels'}
          </button>
          <button
            type="button"
            data-testid="arch-evolution-details-toggle"
            aria-expanded={showCommitDetails}
            onClick={onToggleCommitDetails}
            className="rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)]"
          >
            {showCommitDetails ? 'Hide details' : 'Show details'}
          </button>
          <button
            type="button"
            aria-label="Previous commit"
            onClick={onPreviousStep}
            disabled={stepIndex === 0}
            className={previousButtonClassName}
          >
            <i className="ph ph-arrow-left" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next commit"
            onClick={onNextStep}
            disabled={stepIndex === totalSteps - 1}
            className={nextButtonClassName}
          >
            <i className="ph ph-arrow-right" aria-hidden="true" />
          </button>
        </div>
      </div>

      {showCommitDetails && (
        <div className="mt-3 border-t border-[var(--border-color)] pt-3 text-sm text-[var(--text-secondary)]">
          <div className="mb-2 flex flex-wrap gap-2 text-xs">
            <span>{commit.shortHash}</span>
            <span>{commit.author}</span>
          </div>
          <p className="max-w-4xl">{commit.description}</p>
        </div>
      )}
    </div>
  )
}

export function FlowControls({
  onZoomIn,
  onZoomOut,
  onToggleFullscreen,
}: FlowControlsProps): React.ReactElement {
  return (
    <div className="arch-evo-flow-controls" data-testid="arch-evolution-flow-controls">
      <button
        type="button"
        aria-label="Zoom in"
        onClick={onZoomIn}
        className="arch-evo-flow-control-btn"
      >
        <i className="ph ph-plus" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        onClick={onZoomOut}
        className="arch-evo-flow-control-btn"
      >
        <i className="ph ph-minus" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Toggle fullscreen"
        onClick={onToggleFullscreen}
        className="arch-evo-flow-control-btn"
      >
        <i className="ph ph-corners-out" aria-hidden="true" />
      </button>
    </div>
  )
}
