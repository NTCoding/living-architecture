import { createContext, useContext, useState, useCallback, useMemo } from 'react'

interface ExportHandlers {
  onPng: (() => void) | null
  onSvg: (() => void) | null
}

interface ExportContextValue {
  exportHandlers: ExportHandlers
  registerExportHandlers: (handlers: ExportHandlers) => void
  clearExportHandlers: () => void
}

const ExportContext = createContext<ExportContextValue | null>(null)

interface ExportProviderProps {
  children: React.ReactNode
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

  return <ExportContext.Provider value={value}>{children}</ExportContext.Provider>
}

export function useExport(): ExportContextValue {
  const context = useContext(ExportContext)
  if (context === null) {
    throw new Error('useExport must be used within ExportProvider')
  }
  return context
}
