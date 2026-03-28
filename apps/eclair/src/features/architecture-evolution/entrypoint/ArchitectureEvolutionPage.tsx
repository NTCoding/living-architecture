import {
  useCallback, useEffect, useMemo, useRef, useState 
} from 'react'
import { ReactFlow } from '@xyflow/react'
import type {
  Edge, EdgeMouseHandler, Node, ReactFlowInstance 
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useExport } from '@/platform/infra/export/ExportContext'
import {
  exportElementAsPng,
  exportSvgAsFile,
  generateExportFilename,
} from '@/platform/infra/export/export-graph'
import {
  CommitHeader,
  FlowControls,
  getRenderedFlowBounds,
} from '../components/ArchitectureEvolutionPageChrome'
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
} from '../components/architecture-evolution-scenario'
import { applyGraphvizLayout } from '../components/architecture-evolution-layout'

interface LayoutedBoundary {
  readonly id: string
  readonly label: string
  readonly kind: 'slice'
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

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
const IS_TEST_ENVIRONMENT = import.meta.env.MODE === 'test'

export function ArchitectureEvolutionPage(): React.ReactElement {
  const topologyView = useMemo(() => getArchitectureEvolutionView(0), [])
  const [stepIndex, setStepIndex] = useState(0)
  const view = useMemo(() => getArchitectureEvolutionView(stepIndex), [stepIndex])
  const [showCommitDetails, setShowCommitDetails] = useState(false)
  const [showEdgeLabels, setShowEdgeLabels] = useState(false)
  const [layoutedNodes, setLayoutedNodes] = useState<readonly Node[]>(
    IS_TEST_ENVIRONMENT ? topologyView.nodes : [],
  )
  const [layoutedBoundaries, setLayoutedBoundaries] = useState<readonly LayoutedBoundary[]>([])
  const [edgePathsById, setEdgePathsById] = useState<ReadonlyMap<string, string>>(new Map())
  const [isLayouting, setIsLayouting] = useState(false)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<
    Node<ArchitectureEvolutionNodeData> | Node<ArchitectureEvolutionBoundaryData>,
    Edge<ArchitectureEvolutionEdgeData>
  > | null>(null)
  const {
    registerExportHandlers, clearExportHandlers 
  } = useExport()
  const exportContainerRef = useRef<HTMLDivElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const flowContainerRef = useRef<HTMLDivElement>(null)
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
    if (IS_TEST_ENVIRONMENT) {
      return
    }

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
          showLabel: showEdgeLabels || edge.data.transition !== 'unchanged',
          ...(graphvizPath === undefined ? {} : { graphvizPath }),
        },
      }
    })
  }, [edgePathsById, selectedEdgeId, showEdgeLabels, view.edges])

  const selectedEdge = useMemo(() => {
    return renderedEdges.find((edge) => edge.id === selectedEdgeId && edge.hidden !== true) ?? null
  }, [renderedEdges, selectedEdgeId])

  useEffect(() => {
    if (IS_TEST_ENVIRONMENT) {
      return
    }

    const flowContainer = flowContainerRef.current

    if (reactFlowInstance === null || flowContainer === null) {
      return
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const bounds = getRenderedFlowBounds(flowContainer, reactFlowInstance)

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
