import {
  useCallback, useEffect, useId, useState 
} from 'react'
import {
  JsonView, collapseAllNested 
} from 'react-json-view-lite'
import 'react-json-view-lite/dist/index.css'
import type {
  RiviereGraph, GraphName 
} from '@/types/riviere'
import styles from './SchemaModal.module.css'

function getStyle(name: string): string {
  const value = styles[name]
  if (value === undefined) {
    throw new Error(`CSS module class "${name}" not found in SchemaModal.module.css`)
  }
  return value
}

const jsonViewStyles = {
  container: getStyle('jsonContainer'),
  basicChildStyle: getStyle('jsonBasicChild'),
  label: getStyle('jsonLabel'),
  clickableLabel: getStyle('jsonClickableLabel'),
  nullValue: getStyle('jsonNull'),
  undefinedValue: getStyle('jsonUndefined'),
  numberValue: getStyle('jsonNumber'),
  stringValue: getStyle('jsonString'),
  booleanValue: getStyle('jsonBoolean'),
  otherValue: getStyle('jsonOther'),
  punctuation: getStyle('jsonPunctuation'),
  expandIcon: getStyle('jsonExpandIcon'),
  collapseIcon: getStyle('jsonCollapseIcon'),
  collapsedContent: getStyle('jsonCollapsedContent'),
  childFieldsContainer: getStyle('jsonChildFields'),
  quotesForFieldNames: true,
  noQuotesForStringValues: false,
  stringifyStringValues: false,
  ariaLables: {
    collapseJson: 'Collapse JSON node',
    expandJson: 'Expand JSON node',
  },
}

interface SchemaModalProps {
  readonly graph: RiviereGraph | null
  readonly graphName: GraphName | undefined
  readonly isOpen: boolean
  readonly onClose: () => void
}

export function SchemaModal({
  graph,
  graphName,
  isOpen,
  onClose,
}: SchemaModalProps): React.ReactElement | null {
  const titleId = useId()
  const [copyFeedback, setCopyFeedback] = useState(false)
  const shouldExpandNode = useCallback(
    (level: number) => collapseAllNested(level),
    []
  )

  useEffect(() => {
    if (graph === null || !isOpen) {
      return
    }

    function closeModalOnEscape(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', closeModalOnEscape)
    return () => document.removeEventListener('keydown', closeModalOnEscape)
  }, [graph, isOpen, onClose])

  if (graph === null || !isOpen) {
    return null
  }

  const jsonContent = JSON.stringify(graph, null, 2)

  const copySchemaJson = async (): Promise<void> => {
    await navigator.clipboard.writeText(jsonContent)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  const downloadSchemaAsJson = (): void => {
    if (graphName === undefined) {
      throw new Error('Cannot download: graphName is required. Button should be disabled when graphName is undefined.')
    }
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = graphName
    link.click()
    URL.revokeObjectURL(url)
  }

  const nodeCount = graph.components.length
  const edgeCount = graph.links.length
  const domainCount = Object.keys(graph.metadata.domains).length

  function formatGeneratedDate(isoDateString: string | undefined): string {
    if (isoDateString === undefined) {
      return 'Unknown'
    }
    const parts = isoDateString.split('T')
    const datePart = parts[0]
    if (datePart === undefined || datePart === '') {
      throw new Error(`Invalid ISO date string: "${isoDateString}". Expected format like "2024-01-15T10:30:00Z".`)
    }
    return datePart
  }

  const generatedDate = formatGeneratedDate(graph.metadata.generated)

  return (
    <div
      role="dialog"
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-10"
    >
      <div
        data-testid="modal-backdrop"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onClose()
          }
        }}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-[var(--bg-primary)] rounded-xl shadow-2xl w-full max-w-[1200px] max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border-color)]">
          <span
            id={titleId}
            className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-3"
          >
            {graphName}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={copySchemaJson}
              aria-label="Copy JSON"
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            >
              <i className="ph ph-copy" aria-hidden="true" />
              {copyFeedback ? 'Copied!' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={downloadSchemaAsJson}
              aria-label="Download JSON"
              disabled={graphName === undefined}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="ph ph-download-simple" aria-hidden="true" />
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex items-center justify-center w-8 h-8 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            >
              <i className="ph ph-x text-lg" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="px-8 py-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
            <div className="flex flex-col gap-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Schema Version
              </div>
              <div className="text-[13px] font-semibold text-[var(--text-primary)] font-mono">
                {graph.version}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Total Nodes
              </div>
              <div className="text-[13px] font-semibold text-[var(--text-primary)] font-mono">
                {nodeCount}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Total Edges
              </div>
              <div className="text-[13px] font-semibold text-[var(--text-primary)] font-mono">
                {edgeCount}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Domains
              </div>
              <div className="text-[13px] font-semibold text-[var(--text-primary)] font-mono">
                {domainCount}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Generated
              </div>
              <div className="text-[13px] font-semibold text-[var(--text-primary)] font-mono">
                {generatedDate}
              </div>
            </div>
          </div>
          <div
            data-testid="json-viewer"
            className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-5 font-mono text-xs leading-relaxed overflow-x-auto"
          >
            <JsonView
              data={graph}
              shouldExpandNode={shouldExpandNode}
              style={jsonViewStyles}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
