import { useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { useExport } from '@/contexts/ExportContext'
import type { RiviereGraph, GraphName } from '@/types/riviere'

interface AppShellProps {
  children: React.ReactNode
  hasGraph: boolean
  graphName: GraphName | undefined
  graph: RiviereGraph | null
}

const COLLAPSED_BY_DEFAULT_ROUTES = ['/full-graph']
const MOBILE_BREAKPOINT = 768

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

export function AppShell({ children, hasGraph, graphName, graph }: AppShellProps): React.ReactElement {
  const location = useLocation()
  const { exportHandlers } = useExport()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    isMobileViewport() || COLLAPSED_BY_DEFAULT_ROUTES.includes(location.pathname)
  )

  const toggleSidebarCollapsedState = useCallback(() => {
    setSidebarCollapsed((prev) => !prev)
  }, [])

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--bg-primary)]">
      <Sidebar hasGraph={hasGraph} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebarCollapsedState} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          graphName={graphName}
          graph={graph}
          {...(exportHandlers.onPng !== null && { onExportPng: exportHandlers.onPng })}
          {...(exportHandlers.onSvg !== null && { onExportSvg: exportHandlers.onSvg })}
        />
        <main className="flex-1 min-h-0 overflow-auto p-6">
          {children}
        </main>
        <footer className="shrink-0 px-6 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <p className="text-xs text-[var(--text-tertiary)] text-center">
            Created by{' '}
            <a
              href="https://nick-tune.me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent-primary)] hover:underline"
            >
              Nick Tune
            </a>
            {' · '}
            <a
              href="https://linkedin.com/in/nick-tune"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent-primary)] hover:underline"
            >
              LinkedIn
            </a>
            {' · '}
            <a
              href="https://github.com/ntcoding"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent-primary)] hover:underline"
            >
              GitHub
            </a>
            {' · '}
            <a
              href="https://bsky.app/profile/nick-tune.me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent-primary)] hover:underline"
            >
              Bluesky
            </a>
          </p>
        </footer>
      </div>
    </div>
  )
}
