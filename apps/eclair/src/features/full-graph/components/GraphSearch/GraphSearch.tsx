import { useState, useCallback, useEffect, useRef } from 'react'

interface GraphSearchProps {
  onSearch: (query: string) => void
  placeholder?: string | undefined
}

export function GraphSearch({
  onSearch,
  placeholder = 'Search nodes...',
}: GraphSearchProps): React.ReactElement {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setQuery(value)
      onSearch(value)
    },
    [onSearch]
  )

  const handleClear = useCallback(() => {
    setQuery('')
    onSearch('')
    inputRef.current?.focus()
  }, [onSearch])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        handleClear()
      }
    },
    [handleClear]
  )

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/' && event.target === document.body) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  return (
    <div className="relative" data-testid="graph-search">
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] py-2 pl-10 pr-10 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all focus:border-[var(--primary)] focus:bg-[var(--bg-secondary)] focus:outline-none"
        aria-label="Search nodes"
        data-testid="graph-search-input"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          aria-label="Clear search"
          data-testid="graph-search-clear"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
