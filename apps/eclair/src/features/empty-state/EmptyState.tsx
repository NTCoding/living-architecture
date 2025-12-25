import { useState, useEffect } from 'react'
import { FileUpload } from '@/components/FileUpload'
import { UrlInput } from '@/components/UrlInput'
import { useGraph } from '@/contexts/GraphContext'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'

export function EmptyState(): React.ReactElement {
  const { setGraph, loadGraphFromUrl, isLoadingFromUrl, urlLoadError, clearUrlLoadError } = useGraph()
  const [error, setError] = useState<string | null>(null)

  const handleFileLoaded = (content: string, fileName: string): void => {
    setError(null)
    try {
      const data: unknown = JSON.parse(content)
      const graph = parseRiviereGraph(data)
      setGraph(graph)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      setError(`Validation failed for ${fileName}:\n${message}`)
    }
  }

  const handleError = (errorMessage: string): void => {
    setError(errorMessage)
  }

  useEffect(() => {
    return () => {
      clearUrlLoadError()
    }
  }, [clearUrlLoadError])

  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3">
          Welcome to Éclair
        </h1>
        <p className="text-lg text-[var(--text-secondary)]">
          Upload a Rivière architecture graph to start exploring your system
        </p>
      </div>

      <FileUpload onFileLoaded={handleFileLoaded} onError={handleError} />

      <div className="my-8 flex items-center">
        <div className="flex-1 border-t border-[var(--border-color)]" />
        <span className="px-4 text-sm text-[var(--text-tertiary)]">OR</span>
        <div className="flex-1 border-t border-[var(--border-color)]" />
      </div>

      <UrlInput
        onLoadFromUrl={loadGraphFromUrl}
        isLoading={isLoadingFromUrl}
      />

      {(error !== null || urlLoadError !== null) && (
        <div className="mt-6 p-4 rounded-[var(--radius)] bg-red-50 border border-red-200 text-red-700">
          <div className="flex items-start gap-3">
            <i className="ph ph-warning-circle text-xl flex-shrink-0 mt-0.5" aria-hidden="true" />
            <pre className="text-sm whitespace-pre-wrap font-mono">{error !== null ? error : urlLoadError}</pre>
          </div>
        </div>
      )}

      <div className="mt-12 p-6 rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          What is a Rivière graph?
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Rivière is a JSON format for describing flow-based software architecture.
          It captures how operations flow through your system, from UI interactions
          through APIs, use cases, domain operations, and events.
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          Load an example graph or generate one from your codebase to get started.
        </p>
      </div>
    </div>
  )
}
