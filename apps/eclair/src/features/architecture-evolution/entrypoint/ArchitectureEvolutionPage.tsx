import {
  useMemo, useState, useCallback, useEffect, useRef 
} from 'react'
import {
  ReactFlow, Controls 
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useExport } from '@/platform/infra/export/ExportContext'
import {
  exportElementAsPng,
  exportSvgAsFile,
  generateExportFilename,
} from '@/platform/infra/export/export-graph'
import { ArchitectureEvolutionNode } from '../components/ArchitectureEvolutionNode/ArchitectureEvolutionNode'
import {
  ARCHITECTURE_EVOLUTION_STEP_COUNT,
  getArchitectureEvolutionView,
} from '../data/architecture-evolution-scenario'

const nodeTypes = { architecture: ArchitectureEvolutionNode }
const EXPORT_NAME = 'architecture-evolution-mvp'
const ENABLED_NAVIGATION_BUTTON_CLASS_NAME = 'icon-btn'
const DISABLED_NAVIGATION_BUTTON_CLASS_NAME = 'icon-btn opacity-40 cursor-not-allowed'

function LegendRow({
  color,
  label,
  dashed = false,
}: {
  readonly color: string
  readonly label: string
  readonly dashed?: boolean
}): React.ReactElement {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
      <span
        className="block w-8 border-t-2"
        style={{
          borderColor: color,
          borderStyle: dashed ? 'dashed' : 'solid',
        }}
      />
      <span>{label}</span>
    </div>
  )
}

export function ArchitectureEvolutionPage(): React.ReactElement {
  const [stepIndex, setStepIndex] = useState(0)
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

  const goToPreviousStep = useCallback(() => {
    setStepIndex((previous) => Math.max(previous - 1, 0))
  }, [])

  const goToNextStep = useCallback(() => {
    setStepIndex((previous) => Math.min(previous + 1, ARCHITECTURE_EVOLUTION_STEP_COUNT - 1))
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
  }, [registerExportHandlers, clearExportHandlers])

  return (
    <div
      ref={exportContainerRef}
      data-testid="arch-evolution-page"
      className="canvas-background relative h-full min-h-[680px] w-full overflow-hidden rounded-[var(--radius)] border border-[var(--border-color)]"
    >
      <div data-testid="arch-evolution-flow" className="absolute inset-0">
        <ReactFlow
          nodes={[...view.nodes]}
          edges={[...view.edges]}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{padding: 0.18,}}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Controls showInteractive={false} className="!left-4 !bottom-4" />
        </ReactFlow>
      </div>

      <div
        data-testid="arch-evolution-commit-card"
        className="floating-panel absolute left-3 top-3 z-10 w-[min(100%-24px,440px)] md:left-4 md:top-4"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Architecture Evolution
            </div>
            <h1 className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {view.commit.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
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

        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2.5 py-1 font-semibold text-[var(--text-primary)]">
            {view.stepIndex + 1} / {view.totalSteps}
          </span>
          <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2.5 py-1 text-[var(--text-secondary)]">
            {view.commit.shortHash}
          </span>
          <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2.5 py-1 text-[var(--text-secondary)]">
            {view.commit.date}
          </span>
          <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2.5 py-1 text-[var(--text-secondary)]">
            {view.commit.author}
          </span>
        </div>

        <p className="mb-3 text-sm text-[var(--text-secondary)]">{view.commit.description}</p>

        <div className="flex flex-wrap gap-4 text-xs text-[var(--text-secondary)]">
          <span>{view.activeServiceCount} live services</span>
          <span>{view.ghostedNodeCount} ghosted remnants</span>
          <span>Stable layout across commits</span>
        </div>
      </div>

      <div className="floating-panel absolute bottom-3 right-3 z-10 w-[min(100%-24px,260px)] md:bottom-4 md:right-4">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          Reading Guide
        </div>
        <div className="space-y-2">
          <LegendRow color="var(--node-ui)" label="Client reads" />
          <LegendRow color="var(--node-api)" label="Service writes" />
          <LegendRow color="var(--amber)" label="Order placed sync" dashed />
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span className="block h-2 w-2 rounded-full bg-[var(--text-tertiary)] opacity-35" />
            <span>Ghosted items are removed but kept in place</span>
          </div>
        </div>
      </div>
    </div>
  )
}
