import {
  useCallback, useRef 
} from 'react'
import type { RiviereGraph } from '@/types/riviere'

interface UploadedFile {
  readonly name: string
  readonly graph: RiviereGraph
}

interface UploadError {readonly message: string}

export type UploadState =
  | { readonly status: 'empty' }
  | {
    readonly status: 'loaded'
    readonly file: UploadedFile
  }
  | {
    readonly status: 'error'
    readonly error: UploadError
  }

interface UploadZoneProps {
  readonly label: string
  readonly sublabel: string
  readonly number: number
  readonly state: UploadState
  readonly onFileSelect: (file: File) => void
}

export function UploadZone({
  label,
  sublabel,
  number,
  state,
  onFileSelect,
}: UploadZoneProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        onFileSelect(file)
      }
    },
    [onFileSelect],
  )

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      inputRef.current?.click()
    }
  }, [])

  const isLoaded = state.status === 'loaded'
  const hasError = state.status === 'error'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-white">
          {number}
        </div>
        <div>
          <div className="font-bold text-[var(--text-primary)]">{label}</div>
          <div className="text-xs text-[var(--text-tertiary)]">{sublabel}</div>
        </div>
      </div>
      {(() => {
        const getBorderColor = (): string => {
          if (isLoaded) return 'border-green-500 bg-green-50 dark:bg-green-950'
          if (hasError) return 'border-red-500 bg-red-50 dark:bg-red-950'
          return 'border-[var(--border-color)] bg-[var(--bg-secondary)]'
        }
        const borderColor = getBorderColor()
        return (
          <div
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius)] border-2 border-dashed p-6 transition-all hover:border-[var(--primary)] hover:bg-[var(--bg-tertiary)] ${borderColor}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleChange}
              className="sr-only"
              aria-label={`Upload ${label} file`}
            />
            {state.status === 'empty' && (
              <>
                <i
                  className="ph ph-file-arrow-up text-4xl text-[var(--text-tertiary)]"
                  aria-hidden="true"
                />
                <div className="text-center">
                  <div className="font-semibold text-[var(--text-primary)]">
                    Drop JSON file or click to upload
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">Rivière schema JSON</div>
                </div>
              </>
            )}
            {state.status === 'loaded' && (
              <>
                <i className="ph ph-check-circle text-4xl text-green-600" aria-hidden="true" />
                <div className="text-center">
                  <div className="font-semibold text-green-600">{state.file.name}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">
                    {state.file.graph.components.length} nodes
                  </div>
                </div>
              </>
            )}
            {state.status === 'error' && (
              <>
                <i className="ph ph-x-circle text-4xl text-red-600" aria-hidden="true" />
                <div className="text-center">
                  <div className="font-semibold text-red-600">Invalid file</div>
                  <div className="text-xs text-red-500">{state.error.message}</div>
                </div>
              </>
            )}
          </div>
        )
      })()}
    </div>
  )
}
