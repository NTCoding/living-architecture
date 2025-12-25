import { useState } from 'react'

interface UrlInputProps {
  onLoadFromUrl: (url: string) => Promise<void>
  isLoading: boolean
}

export function UrlInput({ onLoadFromUrl, isLoading }: UrlInputProps): React.ReactElement {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const validateUrl = (input: string): boolean => {
    try {
      const parsed = new URL(input)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  const handleSubmit = async (): Promise<void> => {
    setError(null)

    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }

    if (!validateUrl(url)) {
      setError('Invalid URL format. Must start with http:// or https://')
      return
    }

    await onLoadFromUrl(url)
  }

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !isLoading) {
      void handleSubmit()
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setError(null)
          }}
          onKeyPress={handleKeyPress}
          placeholder="https://example.com/graph.json"
          disabled={isLoading}
          className="flex-1 px-4 py-2 rounded-[var(--radius)] border border-[var(--border-color)]
                     bg-[var(--bg-primary)] text-[var(--text-primary)]
                     focus:outline-2 focus:outline-[var(--primary)] disabled:opacity-50"
          aria-label="Graph URL"
        />
        <button
          onClick={() => void handleSubmit()}
          disabled={isLoading || !url.trim()}
          className="px-6 py-2 rounded-[var(--radius)]
                     bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)]
                     text-white font-medium
                     disabled:opacity-50 disabled:cursor-not-allowed
                     hover:shadow-lg transition-all duration-200"
        >
          {isLoading ? 'Loading...' : 'Load from URL'}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}
