import { useMemo } from 'react'
import type { RiviereGraph } from '@living-architecture/riviere-schema'
import { NodeTypeBadge } from '@/platform/infra/ui/NodeTypeBadge/NodeTypeBadge'
import { extractModules } from '../queries/extract-modules'
import type { Theme } from '@/types/theme'
import { DEFAULT_THEME } from '@/types/theme'

interface ModulesPageProps {
  readonly graph: RiviereGraph
  readonly theme?: Theme
}

export function ModulesPage({
  graph,
  theme = DEFAULT_THEME,
}: Readonly<ModulesPageProps>): React.ReactElement {
  const domains = useMemo(() => extractModules(graph), [graph])
  const moduleCount = domains.reduce((total, domain) => total + domain.modules.length, 0)

  return (
    <div data-testid="modules-page" className="space-y-6">
      <header className="page-header">
        <h1 className="page-title">Modules</h1>
        <p className="page-subtitle">Nodes grouped by their graph-defined domain and module</p>
      </header>

      <div className="stats-bar">
        <div className="stats-bar-item">
          <i className="ph ph-stack stats-bar-icon" aria-hidden="true" />
          <div className="stats-bar-content">
            <div className="stats-bar-label">Modules</div>
            <div className="stats-bar-value">{moduleCount}</div>
          </div>
        </div>
        <div className="stats-bar-item">
          <i className="ph ph-circles-three stats-bar-icon" aria-hidden="true" />
          <div className="stats-bar-content">
            <div className="stats-bar-label">Domains</div>
            <div className="stats-bar-value">{domains.length}</div>
          </div>
        </div>
      </div>

      {domains.map((domain) => (
        <section key={domain.domain} aria-labelledby={`domain-${domain.domain}`} className="space-y-3">
          <h2
            id={`domain-${domain.domain}`}
            className="font-[var(--font-heading)] text-xl font-bold text-[var(--text-primary)]"
          >
            {domain.domain}
          </h2>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {domain.modules.map((module) => (
              <article
                key={module.name}
                className="rounded-[var(--radius)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-[var(--text-primary)]">{module.name}</h3>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {module.nodes.length} {module.nodes.length === 1 ? 'node' : 'nodes'}
                  </span>
                </div>
                <div className="space-y-2">
                  {module.nodes.map((node) => (
                    <div
                      key={node.id}
                      className="flex items-center gap-3 rounded bg-[var(--bg-tertiary)] px-3 py-2"
                    >
                      <NodeTypeBadge
                        type={node.type}
                        description={node.typeDescription}
                        theme={theme}
                      />
                      <span className="min-w-0 truncate text-sm text-[var(--text-primary)]">
                        {node.name}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
