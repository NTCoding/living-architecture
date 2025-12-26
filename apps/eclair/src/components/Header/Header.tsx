import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RiviereGraph, GraphName } from '@/types/riviere'
import { SchemaModal } from '@/components/SchemaModal/SchemaModal'
import { useGraph } from '@/contexts/GraphContext'
import { OrphanWarning, type OrphanDetectionResult } from '@/components/OrphanWarning/OrphanWarning'
import { useRiviereQuery } from '@/hooks/useRiviereQuery'

interface HeaderProps {
  graphName: GraphName | undefined
  graph: RiviereGraph | null
  onExportPng?: () => void
  onExportSvg?: () => void
}

export function Header({ graphName, graph, onExportPng, onExportSvg }: HeaderProps): React.ReactElement {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { clearGraph } = useGraph()
  const query = useRiviereQuery(graph)

  const orphanResult: OrphanDetectionResult | null = query !== null
    ? (() => {
        const orphanIds = query.detectOrphans()
        return {
          hasOrphans: orphanIds.length > 0,
          orphanNodeIds: new Set(orphanIds),
          orphanCount: orphanIds.length,
        }
      })()
    : null

  useEffect(() => {
    if (!isExportOpen) return

    function handleClickOutside(event: MouseEvent): void {
      const target = event.target
      if (exportRef.current !== null && target instanceof Node && !exportRef.current.contains(target)) {
        setIsExportOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setIsExportOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isExportOpen])

  function handleUploadClick(): void {
    clearGraph()
    navigate('/')
  }

  function handleExportPng(): void {
    setIsExportOpen(false)
    onExportPng?.()
  }

  function handleExportSvg(): void {
    setIsExportOpen(false)
    onExportSvg?.()
  }

  return (
    <div className="flex flex-col">
      <div>
        <header className="h-16 px-8 flex items-center justify-between bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            {graph !== null && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                title="Click to view schema"
                className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)] cursor-pointer px-2 py-1 rounded-[calc(var(--radius)/2)] transition-all hover:bg-[var(--bg-tertiary)]"
              >
                {graph.metadata.name}
                <i className="ph ph-info text-[var(--text-tertiary)] text-sm" aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {(onExportPng !== undefined || onExportSvg !== undefined) && (
              <div ref={exportRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsExportOpen(!isExportOpen)}
                  aria-label="Export"
                  aria-expanded={isExportOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-[var(--radius)] transition-colors"
                >
                  <i className="ph ph-export" aria-hidden="true" />
                  <span>Export</span>
                </button>
                {isExportOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-1 min-w-[140px] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-[var(--radius)] shadow-lg overflow-hidden z-50"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleExportPng}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                    >
                      <i className="ph ph-image" aria-hidden="true" />
                      Download PNG
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleExportSvg}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                    >
                      <i className="ph ph-file-svg" aria-hidden="true" />
                      Download SVG
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={handleUploadClick}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-[var(--radius)] transition-colors"
            >
              <i className="ph ph-upload" aria-hidden="true" />
              <span>Upload Graph</span>
            </button>
          </div>
      </header>
      </div>
      {orphanResult && graph !== null && <OrphanWarning result={orphanResult} nodes={graph.components} />}
      <SchemaModal
        graph={graph}
        graphName={graphName}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
