import { useState } from 'react'
import { FileUpload } from '@/components/FileUpload/FileUpload'
import { useGraph } from '@/contexts/GraphContext'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'

export function EmptyState(): React.ReactElement {
  const { setGraph } = useGraph()
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

      {error !== null && (
        <div className="mt-6 p-4 rounded-[var(--radius)] bg-red-50 border border-red-200 text-red-700">
          <div className="flex items-start gap-3">
            <i className="ph ph-warning-circle text-xl flex-shrink-0 mt-0.5" aria-hidden="true" />
            <pre className="text-sm whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        </div>
      )}

      <div className="text-center mt-8">
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          Want to see it in action first?
        </p>
        <a
          href="?demo=true"
          className="inline-flex items-center gap-2 px-6 py-2 rounded-[var(--radius)]
                     border-2 border-[var(--primary)] text-[var(--primary)]
                     font-medium hover:bg-[var(--primary)]/10 transition-all duration-200"
        >
          <i className="ph ph-play-circle" aria-hidden="true" />
          View Demo
        </a>
      </div>

      <div className="mt-12 p-6 rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          What is a Rivière graph?
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          <a
            href="https://living-architecture.dev/reference/schema/graph-structure"
            className="text-[var(--primary)] hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Rivière
          </a>{' '}
          is a JSON format for describing flow-based software architecture. It
          captures how operations flow through your system, from UI interactions
          through APIs, use cases, domain operations, and events.
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          Upload your graph or view the demo to get started. Learn more at{' '}
          <a
            href="https://living-architecture.dev"
            className="text-[var(--primary)] hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            living-architecture.dev
          </a>
          .
        </p>
      </div>
    </div>
  )
}
