import { createContext, useContext, useState, useCallback, useMemo } from 'react'

interface ExportHandlers {
  readonly onPng: (() => void) | null
  readonly onSvg: (() => void) | null
}

interface ExportContextValue {
  readonly exportHandlers: ExportHandlers
  readonly registerExportHandlers: (handlers: ExportHandlers) => void
  readonly clearExportHandlers: () => void
}

const exportContext = createContext<ExportContextValue | null>(null)

interface ExportProviderProps {
  readonly children: React.ReactNode
}

export function ExportProvider({ children }: ExportProviderProps): React.ReactElement {
  const [handlers, setHandlers] = useState<ExportHandlers>({ onPng: null, onSvg: null })

  const registerExportHandlers = useCallback((newHandlers: ExportHandlers) => {
    setHandlers(newHandlers)
  }, [])

  const clearExportHandlers = useCallback(() => {
    setHandlers({ onPng: null, onSvg: null })
  }, [])

  const value = useMemo(
    () => ({
      exportHandlers: handlers,
      registerExportHandlers,
      clearExportHandlers,
    }),
    [handlers, registerExportHandlers, clearExportHandlers]
  )

  return <exportContext.Provider value={value}>{children}</exportContext.Provider>
}

export function useExport(): ExportContextValue {
  const context = useContext(exportContext)
  if (context === null) {
    throw new Error('useExport must be used within ExportProvider')
  }
  return context
}
