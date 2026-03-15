import {
  useCallback, useEffect, useMemo, useRef, useState 
} from 'react'
import { ReactFlow } from '@xyflow/react'
import type {
  Edge, EdgeMouseHandler 
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useExport } from '@/platform/infra/export/ExportContext'
import {
  exportElementAsPng,
  exportSvgAsFile,
  generateExportFilename,
} from '@/platform/infra/export/export-graph'
import { ArchitectureEvolutionEdge } from '../components/ArchitectureEvolutionEdge/ArchitectureEvolutionEdge'
import { ArchitectureEvolutionNode } from '../components/ArchitectureEvolutionNode/ArchitectureEvolutionNode'
import {
  ARCHITECTURE_EVOLUTION_STEP_COUNT,
  getArchitectureEvolutionView,
  type ArchitectureEvolutionEdgeData,
} from '../data/architecture-evolution-scenario'

const nodeTypes = { architecture: ArchitectureEvolutionNode }
const edgeTypes = { architecture: ArchitectureEvolutionEdge }
const EXPORT_NAME = 'architecture-evolution-mvp'
const ENABLED_NAVIGATION_BUTTON_CLASS_NAME = 'icon-btn'
const DISABLED_NAVIGATION_BUTTON_CLASS_NAME = 'icon-btn opacity-40 cursor-not-allowed'

function truncateCommitTitle(title: string): string {
  if (title.length <= 46) return title
  return `${title.slice(0, 43)}...`
}

function getEdgeKindBadgeClassName(kind: ArchitectureEvolutionEdgeData['kind']): string {
  if (kind === 'query') return 'arch-evo-inspector-badge arch-evo-inspector-badge--read'
  if (kind === 'event') return 'arch-evo-inspector-badge arch-evo-inspector-badge--event'
  return 'arch-evo-inspector-badge arch-evo-inspector-badge--write'
}

export function ArchitectureEvolutionPage(): React.ReactElement {
  const [stepIndex, setStepIndex] = useState(0)
  const [showCommitDetails, setShowCommitDetails] = useState(false)
  const [showAllLabels, setShowAllLabels] = useState(false)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const {
    registerExportHandlers, clearExportHandlers 
  } = useExport()
  const exportContainerRef = useRef<HTMLDivElement>(null)
  const view = useMemo(() => getArchitectureEvolutionView(stepIndex), [stepIndex])
  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === ARCHITECTURE_EVOLUTION_STEP_COUNT - 1
  const previousButtonClassName = isFirstStep
    ? DISABLED_NAVIGATION_BUTTON_CLASS_NAME
    : ENABLED_NAVIGATION_BUTTON_CLASS_NAME
  const nextButtonClassName = isLastStep
    ? DISABLED_NAVIGATION_BUTTON_CLASS_NAME
    : ENABLED_NAVIGATION_BUTTON_CLASS_NAME
  const nodeLabelById = useMemo(
    () => new Map(view.nodes.map((node) => [node.id, node.data.label])),
    [view.nodes],
  )

  const renderedEdges = useMemo(
    () =>
      view.edges.map((edge): Edge<ArchitectureEvolutionEdgeData> => {
        if (edge.data === undefined) {
          throw new TypeError(`Architecture evolution edge is missing data: ${edge.id}`)
        }

        return {
          ...edge,
          selected: edge.id === selectedEdgeId,
          data: {
            ...edge.data,
            showLabel: showAllLabels || edge.data.transition !== 'unchanged',
          },
        }
      }),
    [selectedEdgeId, showAllLabels, view.edges],
  )

  const selectedEdge = useMemo(
    () => renderedEdges.find((edge) => edge.id === selectedEdgeId && edge.hidden !== true) ?? null,
    [renderedEdges, selectedEdgeId],
  )

  useEffect(() => {
    if (selectedEdgeId === null) return

    const stillVisible = renderedEdges.some(
      (edge) => edge.id === selectedEdgeId && edge.hidden !== true,
    )
    if (!stillVisible) {
      setSelectedEdgeId(null)
    }
  }, [renderedEdges, selectedEdgeId])

  const goToPreviousStep = useCallback(() => {
    setStepIndex((previous) => Math.max(previous - 1, 0))
  }, [])

  const goToNextStep = useCallback(() => {
    setStepIndex((previous) => Math.min(previous + 1, ARCHITECTURE_EVOLUTION_STEP_COUNT - 1))
  }, [])

  const toggleCommitDetails = useCallback(() => {
    setShowCommitDetails((previous) => !previous)
  }, [])

  const toggleLabels = useCallback(() => {
    setShowAllLabels((previous) => !previous)
  }, [])

  const handleEdgeClick = useCallback<EdgeMouseHandler<Edge<ArchitectureEvolutionEdgeData>>>(
    (_event, edge) => {
      setSelectedEdgeId(edge.id)
    },
    [],
  )

  const closeInspector = useCallback(() => {
    setSelectedEdgeId(null)
  }, [])

  useEffect(() => {
    const handleExportPng = (): void => {
      if (exportContainerRef.current === null) return

      const filename = generateExportFilename(EXPORT_NAME, 'png')
      const backgroundColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--bg-primary')
        .trim()
      exportElementAsPng(exportContainerRef.current, filename, { backgroundColor }).catch(
        console.error,
      )
    }

    const handleExportSvg = (): void => {
      const svg = exportContainerRef.current?.querySelector('svg')
      if (!(svg instanceof SVGSVGElement)) {
        throw new TypeError('Export container must contain an SVG element')
      }

      const filename = generateExportFilename(EXPORT_NAME, 'svg')
      exportSvgAsFile(svg, filename)
    }

    registerExportHandlers({
      onPng: handleExportPng,
      onSvg: handleExportSvg,
    })

    return () => {
      clearExportHandlers()
    }
  }, [clearExportHandlers, registerExportHandlers])

  return (
    <div
      ref={exportContainerRef}
      data-testid="arch-evolution-page"
      className="flex h-full min-h-[780px] w-full flex-col gap-3"
    >
      <div
        data-testid="arch-evolution-commit-card"
        className="rounded-[var(--radius)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-3 shadow-sm"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Architecture Evolution
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
              <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)]">
                {view.stepIndex + 1} / {view.totalSteps}
              </span>
              <span className="truncate font-medium text-[var(--text-primary)]">
                {view.commit.date} · {truncateCommitTitle(view.commit.title)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="arch-evolution-label-toggle"
              aria-pressed={showAllLabels}
              onClick={toggleLabels}
              className="rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)]"
            >
              {showAllLabels ? 'Hide stable labels' : 'Show all labels'}
            </button>
            <button
              type="button"
              data-testid="arch-evolution-details-toggle"
              aria-expanded={showCommitDetails}
              onClick={toggleCommitDetails}
              className="rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)]"
            >
              {showCommitDetails ? 'Hide details' : 'Show details'}
            </button>
            <button
              type="button"
              aria-label="Previous commit"
              onClick={goToPreviousStep}
              disabled={isFirstStep}
              className={previousButtonClassName}
            >
              <i className="ph ph-arrow-left" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Next commit"
              onClick={goToNextStep}
              disabled={isLastStep}
              className={nextButtonClassName}
            >
              <i className="ph ph-arrow-right" aria-hidden="true" />
            </button>
          </div>
        </div>

        {showCommitDetails && (
          <div className="mt-3 border-t border-[var(--border-color)] pt-3">
            <div className="mb-2 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
              <span>{view.commit.shortHash}</span>
              <span>{view.commit.author}</span>
              <span>{view.activeServiceCount} live services</span>
              <span>{view.ghostedNodeCount} ghosted remnants</span>
            </div>
            <p className="max-w-4xl text-sm text-[var(--text-secondary)]">
              {view.commit.description}
            </p>
          </div>
        )}
      </div>

      <div className="canvas-background relative min-h-[780px] flex-1 overflow-hidden rounded-[var(--radius)] border border-[var(--border-color)]">
        <div data-testid="arch-evolution-flow" className="absolute inset-0">
          <ReactFlow
            nodes={[...view.nodes]}
            edges={renderedEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onEdgeClick={handleEdgeClick}
            onPaneClick={closeInspector}
            fitView
            fitViewOptions={{padding: 0.08,}}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
            zIndexMode="manual"
            proOptions={{ hideAttribution: true }}
          />
        </div>

        <div
          data-testid="arch-evolution-inspector"
          className={`inspector-panel ${selectedEdge === null ? 'inspector-panel-collapsed' : 'inspector-panel-expanded'}`}
        >
          {selectedEdge?.data !== undefined && (
            <>
              <div className="inspector-header">
                <div className="inspector-title">
                  <i className="ph ph-line-segment" aria-hidden="true" />
                  <span>Connection Details</span>
                </div>
                <button
                  type="button"
                  onClick={closeInspector}
                  className="inspector-close"
                  aria-label="Close inspector"
                >
                  <i className="ph ph-x" aria-hidden="true" />
                </button>
              </div>

              <div className="inspector-body">
                <div className="inspector-section">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={getEdgeKindBadgeClassName(selectedEdge.data.kind)}>
                      {selectedEdge.data.kind}
                    </span>
                    {selectedEdge.data.transition !== 'unchanged' && (
                      <span className="arch-evo-inspector-transition">
                        {selectedEdge.data.transition}
                      </span>
                    )}
                  </div>
                </div>

                <div className="inspector-section">
                  <div className="inspector-section-title">Contract</div>
                  <div className="inspector-domain-info">{selectedEdge.data.label}</div>
                  <div className="inspector-domain-meta">{selectedEdge.data.subtitle}</div>
                </div>

                <div className="inspector-section">
                  <div className="inspector-section-title">Flow</div>
                  <div className="inspector-integration-flow">
                    <span className="inspector-integration-flow-domain">
                      {nodeLabelById.get(selectedEdge.source) ?? selectedEdge.source}
                    </span>
                    {' → '}
                    <span className="inspector-integration-flow-domain">
                      {nodeLabelById.get(selectedEdge.target) ?? selectedEdge.target}
                    </span>
                  </div>
                </div>

                <div className="inspector-section">
                  <div className="inspector-section-title">Source Interface</div>
                  <div className="inspector-domain-info">{selectedEdge.data.sourcePortLabel}</div>
                </div>

                <div className="inspector-section">
                  <div className="inspector-section-title">Target Interface</div>
                  <div className="inspector-domain-info">{selectedEdge.data.targetPortLabel}</div>
                </div>

                <div className="inspector-section">
                  <div className="inspector-section-title">Meaning</div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    {selectedEdge.data.description}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
