import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ReactFlow } from '@xyflow/react'
import type { Edge, EdgeMouseHandler, Node, ReactFlowInstance } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useExport } from '@/platform/infra/export/ExportContext'
import {
  exportElementAsPng,
  exportSvgAsFile,
  generateExportFilename,
} from '@/platform/infra/export/export-graph'
import {
  ArchitectureEvolutionBoundaryNode,
  type ArchitectureEvolutionBoundaryData,
} from '../components/ArchitectureEvolutionBoundaryNode/ArchitectureEvolutionBoundaryNode'
import { ArchitectureEvolutionEdge } from '../components/ArchitectureEvolutionEdge/ArchitectureEvolutionEdge'
import { ArchitectureEvolutionInspector } from '../components/ArchitectureEvolutionInspector/ArchitectureEvolutionInspector'
import { ArchitectureEvolutionNode } from '../components/ArchitectureEvolutionNode/ArchitectureEvolutionNode'
import {
  ARCHITECTURE_EVOLUTION_STEP_COUNT,
  getArchitectureEvolutionView,
  type ArchitectureEvolutionEdgeData,
  type ArchitectureEvolutionNodeData,
} from '../data/architecture-evolution-scenario'
import { applyGraphvizLayout, type GraphvizBoundary } from '../data/architecture-evolution-layout'

const nodeTypes = {
  architecture: ArchitectureEvolutionNode,
  boundary: ArchitectureEvolutionBoundaryNode,
}
const edgeTypes = { architecture: ArchitectureEvolutionEdge }
const EXPORT_NAME = 'architecture-evolution-mvp'
const ENABLED_NAVIGATION_BUTTON_CLASS_NAME = 'icon-btn'
const DISABLED_NAVIGATION_BUTTON_CLASS_NAME = 'icon-btn opacity-40 cursor-not-allowed'
const FIT_PADDING = 0.22
const FIT_MIN_ZOOM = 0.05

function getRenderedFlowBounds(
  container: HTMLDivElement,
  reactFlowInstance: ReactFlowInstance<any, any>,
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

  let minLeft = Number.POSITIVE_INFINITY
  let minTop = Number.POSITIVE_INFINITY
  let maxRight = Number.NEGATIVE_INFINITY
  let maxBottom = Number.NEGATIVE_INFINITY

  for (const element of elements) {
    const rect = element.getBoundingClientRect()

    if (rect.width === 0 || rect.height === 0) {
      continue
    }

    minLeft = Math.min(minLeft, rect.left)
    minTop = Math.min(minTop, rect.top)
    maxRight = Math.max(maxRight, rect.right)
    maxBottom = Math.max(maxBottom, rect.bottom)
  }

  if (
    !Number.isFinite(minLeft) ||
    !Number.isFinite(minTop) ||
    !Number.isFinite(maxRight) ||
    !Number.isFinite(maxBottom)
  ) {
    return null
  }

  const topLeft = reactFlowInstance.screenToFlowPosition({ x: minLeft, y: minTop })
  const bottomRight = reactFlowInstance.screenToFlowPosition({ x: maxRight, y: maxBottom })

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

interface CommitHeaderProps {
  readonly stepIndex: number
  readonly totalSteps: number
  readonly commit: {
    title: string
    shortHash: string
    date: string
    author: string
    description: string
  }
  readonly showCommitDetails: boolean
  readonly showEdgeLabels: boolean
  readonly previousButtonClassName: string
  readonly nextButtonClassName: string
  readonly onToggleEdgeLabels: () => void
  readonly onToggleCommitDetails: () => void
  readonly onPreviousStep: () => void
  readonly onNextStep: () => void
}

function CommitHeader({
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

interface FlowControlsProps {
  readonly onZoomIn: () => void
  readonly onZoomOut: () => void
  readonly onToggleFullscreen: () => void
}

function FlowControls({
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

export function ArchitectureEvolutionPage(): React.ReactElement {
  const [stepIndex, setStepIndex] = useState(0)
  const [showCommitDetails, setShowCommitDetails] = useState(false)
  const [showEdgeLabels, setShowEdgeLabels] = useState(true)
  const [layoutedNodes, setLayoutedNodes] = useState<readonly Node[]>([])
  const [layoutedBoundaries, setLayoutedBoundaries] = useState<readonly GraphvizBoundary[]>([])
  const [edgePathsById, setEdgePathsById] = useState<ReadonlyMap<string, string>>(new Map())
  const [isLayouting, setIsLayouting] = useState(false)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<any, any> | null>(
    null,
  )
  const { registerExportHandlers, clearExportHandlers } = useExport()
  const exportContainerRef = useRef<HTMLDivElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const flowContainerRef = useRef<HTMLDivElement>(null)
  const topologyView = useMemo(() => getArchitectureEvolutionView(0), [])
  const view = useMemo(() => getArchitectureEvolutionView(stepIndex), [stepIndex])
  const previousButtonClassName =
    stepIndex === 0 ? DISABLED_NAVIGATION_BUTTON_CLASS_NAME : ENABLED_NAVIGATION_BUTTON_CLASS_NAME
  const nextButtonClassName =
    stepIndex === ARCHITECTURE_EVOLUTION_STEP_COUNT - 1
      ? DISABLED_NAVIGATION_BUTTON_CLASS_NAME
      : ENABLED_NAVIGATION_BUTTON_CLASS_NAME
  const layoutedNodeById = useMemo(() => {
    return new Map(layoutedNodes.map((node) => [node.id, node]))
  }, [layoutedNodes])
  const nodeLabelById = useMemo(
    () => new Map(view.nodes.map((node) => [node.id, node.data.label])),
    [view.nodes],
  )
  const renderedNodes = useMemo(() => {
    return view.nodes.map((node): Node<ArchitectureEvolutionNodeData> => {
      const layoutedNode = layoutedNodeById.get(node.id)

      if (layoutedNode === undefined) {
        return {
          ...node,
          type: 'architecture',
          zIndex: 20,
        }
      }

      return {
        ...node,
        type: 'architecture',
        zIndex: 20,
        position: layoutedNode.position,
        ...(layoutedNode.width === undefined ? {} : { width: layoutedNode.width }),
        ...(layoutedNode.height === undefined ? {} : { height: layoutedNode.height }),
      }
    })
  }, [layoutedNodeById, view.nodes])
  const boundaryNodes = useMemo(() => {
    return layoutedBoundaries.map((boundary): Node<ArchitectureEvolutionBoundaryData> => {
      return {
        id: `boundary:${boundary.id}`,
        type: 'boundary',
        position: {
          x: boundary.x,
          y: boundary.y,
        },
        width: boundary.width,
        height: boundary.height,
        draggable: false,
        selectable: false,
        connectable: false,
        focusable: false,
        zIndex: 5,
        style: {
          width: boundary.width,
          height: boundary.height,
          pointerEvents: 'none',
        },
        data: {
          label: boundary.label,
          boundaryKind: boundary.kind,
        },
      }
    })
  }, [layoutedBoundaries])
  const flowNodes = useMemo(() => {
    return [...boundaryNodes, ...renderedNodes]
  }, [boundaryNodes, renderedNodes])

  useEffect(() => {
    const cancelled = { value: false }

    const runLayout = async (): Promise<void> => {
      setIsLayouting(true)

      try {
        const result = await applyGraphvizLayout(topologyView.nodes, topologyView.edges)

        if (cancelled.value) {
          return
        }

        setLayoutedNodes(result.nodes)
        setLayoutedBoundaries(result.boundaries)
        setEdgePathsById(result.edgePathsById)
      } finally {
        if (!cancelled.value) {
          setIsLayouting(false)
        }
      }
    }

    void runLayout()

    return () => {
      cancelled.value = true
    }
  }, [topologyView.edges, topologyView.nodes])

  const renderedEdges = useMemo(() => {
    return view.edges.map((edge): Edge<ArchitectureEvolutionEdgeData> => {
      if (edge.data === undefined) {
        throw new TypeError(`Architecture evolution edge is missing data: ${edge.id}`)
      }

      const graphvizPath = edgePathsById.get(edge.id)

      return {
        ...edge,
        selected: edge.id === selectedEdgeId,
        data: {
          ...edge.data,
          showLabel: showEdgeLabels,
          ...(graphvizPath === undefined ? {} : { graphvizPath }),
        },
      }
    })
  }, [edgePathsById, selectedEdgeId, showEdgeLabels, view.edges])

  const selectedEdge = useMemo(() => {
    return renderedEdges.find((edge) => edge.id === selectedEdgeId && edge.hidden !== true) ?? null
  }, [renderedEdges, selectedEdgeId])

  useEffect(() => {
    if (reactFlowInstance === null || flowContainerRef.current === null) {
      return
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const bounds = getRenderedFlowBounds(
          flowContainerRef.current as HTMLDivElement,
          reactFlowInstance,
        )

        if (bounds === null) {
          return
        }

        void reactFlowInstance.fitBounds(bounds, {
          padding: FIT_PADDING,
          duration: 0,
        })
      })
    })
  }, [flowNodes, renderedEdges, reactFlowInstance, showEdgeLabels, stepIndex])

  useEffect(() => {
    if (selectedEdgeId === null) {
      return
    }

    if (!renderedEdges.some((edge) => edge.id === selectedEdgeId && edge.hidden !== true)) {
      setSelectedEdgeId(null)
    }
  }, [renderedEdges, selectedEdgeId])

  const handleEdgeClick = useCallback<EdgeMouseHandler<Edge<ArchitectureEvolutionEdgeData>>>(
    (_event, edge) => {
      setSelectedEdgeId(edge.id)
    },
    [],
  )

  const closeInspector = useCallback(() => {
    setSelectedEdgeId(null)
  }, [])

  const goToPreviousStep = useCallback(() => {
    setStepIndex((previous) => Math.max(previous - 1, 0))
  }, [])

  const goToNextStep = useCallback(() => {
    setStepIndex((previous) => Math.min(previous + 1, ARCHITECTURE_EVOLUTION_STEP_COUNT - 1))
  }, [])

  const toggleCommitDetails = useCallback(() => {
    setShowCommitDetails((previous) => !previous)
  }, [])

  const toggleEdgeLabels = useCallback(() => {
    setShowEdgeLabels((previous) => !previous)
  }, [])

  const zoomIn = useCallback(() => {
    if (reactFlowInstance === null) {
      return
    }

    void reactFlowInstance.zoomIn({ duration: 150 })
  }, [reactFlowInstance])

  const zoomOut = useCallback(() => {
    if (reactFlowInstance === null) {
      return
    }

    void reactFlowInstance.zoomOut({ duration: 150 })
  }, [reactFlowInstance])

  const toggleFullscreen = useCallback(() => {
    const canvasContainer = canvasContainerRef.current

    if (canvasContainer === null) {
      return
    }

    if (document.fullscreenElement instanceof Element) {
      void document.exitFullscreen()
      return
    }

    void canvasContainer.requestFullscreen()
  }, [])

  useEffect(() => {
    const handleExportPng = (): void => {
      if (exportContainerRef.current === null) {
        return
      }

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

      exportSvgAsFile(svg, generateExportFilename(EXPORT_NAME, 'svg'))
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
      className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden"
    >
      <CommitHeader
        stepIndex={stepIndex}
        totalSteps={view.totalSteps}
        commit={view.commit}
        showCommitDetails={showCommitDetails}
        showEdgeLabels={showEdgeLabels}
        previousButtonClassName={previousButtonClassName}
        nextButtonClassName={nextButtonClassName}
        onToggleEdgeLabels={toggleEdgeLabels}
        onToggleCommitDetails={toggleCommitDetails}
        onPreviousStep={goToPreviousStep}
        onNextStep={goToNextStep}
      />

      <div
        ref={canvasContainerRef}
        className="canvas-background relative min-h-0 flex-1 overflow-hidden rounded-[var(--radius)] border border-[var(--border-color)]"
      >
        <div ref={flowContainerRef} data-testid="arch-evolution-flow" className="absolute inset-0">
          <ReactFlow
            onInit={(instance) => {
              setReactFlowInstance(instance)
            }}
            nodes={flowNodes}
            edges={renderedEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onEdgeClick={handleEdgeClick}
            onPaneClick={closeInspector}
            minZoom={FIT_MIN_ZOOM}
            maxZoom={1.5}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            zIndexMode="manual"
            proOptions={{ hideAttribution: true }}
          />
        </div>

        <FlowControls onZoomIn={zoomIn} onZoomOut={zoomOut} onToggleFullscreen={toggleFullscreen} />

        {isLayouting && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-primary)]/50">
            <div className="rounded-lg bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)]">
              Applying Graphviz layout...
            </div>
          </div>
        )}

        <ArchitectureEvolutionInspector
          selectedEdge={selectedEdge}
          nodeLabelById={nodeLabelById}
          onClose={closeInspector}
        />
      </div>
    </div>
  )
}
