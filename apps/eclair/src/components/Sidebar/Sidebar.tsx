import { Link, useLocation } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'

interface NavItemProps {
  icon: string
  label: string
  to: string
  disabled?: boolean
  active?: boolean
  collapsed?: boolean
}

function NavItem({ icon, label, to, disabled = false, active = false, collapsed = false }: NavItemProps): React.ReactElement {
  const baseClasses = collapsed
    ? 'w-full flex items-center justify-center p-2 rounded-[var(--radius)] transition-all duration-200'
    : 'w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius)] text-left text-sm transition-all duration-200'

  const stateClasses = disabled
    ? 'opacity-40 cursor-not-allowed'
    : active
      ? 'bg-[var(--bg-tertiary)] text-[var(--primary)] font-medium'
      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'

  if (disabled) {
    return (
      <span className={`${baseClasses} ${stateClasses}`} aria-disabled="true" title={collapsed ? label : undefined}>
        <i className={`ph ph-${icon} text-lg`} aria-hidden="true" />
        {!collapsed && <span>{label}</span>}
      </span>
    )
  }

  return (
    <Link to={to} className={`${baseClasses} ${stateClasses}`} title={collapsed ? label : undefined}>
      <i className={`ph ph-${icon} text-lg`} aria-hidden="true" />
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}

interface SidebarProps {
  hasGraph: boolean
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ hasGraph, collapsed = false, onToggleCollapse }: SidebarProps): React.ReactElement {
  const location = useLocation()
  const currentPath = location.pathname

  const sidebarWidth = collapsed ? 'w-16' : 'w-60'

  return (
    <aside className={`${sidebarWidth} flex flex-col bg-[var(--bg-secondary)] border-r border-[var(--border-color)] transition-all duration-300`}>
      <div className={`h-16 ${collapsed ? 'px-3 justify-center' : 'px-5'} flex items-center gap-2.5 border-b border-[var(--border-color)] shrink-0`}>
        <Logo />
        {!collapsed && <span className="logo-text">Éclair</span>}
      </div>

      <nav className={`flex-1 ${collapsed ? 'px-2' : 'px-3'} py-4 space-y-1`}>
        <NavItem icon="house" label="Overview" to="/" active={currentPath === '/'} collapsed={collapsed} />
        <NavItem icon="flow-arrow" label="Flows" to="/flows" active={currentPath === '/flows'} disabled={!hasGraph} collapsed={collapsed} />
        <NavItem icon="circles-three" label="Domain Map" to="/domains" active={currentPath === '/domains'} disabled={!hasGraph} collapsed={collapsed} />
        <NavItem icon="graph" label="Full Graph" to="/full-graph" active={currentPath === '/full-graph'} disabled={!hasGraph} collapsed={collapsed} />
        <NavItem icon="cube" label="Entities" to="/entities" active={currentPath === '/entities'} disabled={!hasGraph} collapsed={collapsed} />
        <NavItem icon="broadcast" label="Events" to="/events" active={currentPath === '/events'} disabled={!hasGraph} collapsed={collapsed} />
        <NavItem icon="git-diff" label="Compare" to="/compare" active={currentPath === '/compare'} collapsed={collapsed} />

        <div className="my-3 border-t border-[var(--border-color)]" />
        <NavItem icon="info" label="About Rivière" to="/about" active={currentPath === '/about'} collapsed={collapsed} />
      </nav>

      {!collapsed && (
        <div className="px-5 py-4 border-t border-[var(--border-color)]">
          <span className="block text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
            Theme
          </span>
          <ThemeSwitcher />
        </div>
      )}

      <button
        type="button"
        onClick={onToggleCollapse}
        className={`${collapsed ? 'mx-2' : 'mx-3'} mb-3 flex items-center justify-center gap-2 py-2 rounded-[var(--radius)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-all duration-200`}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        data-testid="sidebar-toggle"
      >
        <i className={`ph ph-caret-${collapsed ? 'right' : 'left'} text-lg`} aria-hidden="true" />
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  )
}
