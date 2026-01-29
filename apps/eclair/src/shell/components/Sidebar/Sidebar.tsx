import {
  Link, useLocation 
} from 'react-router-dom'
import { Logo } from '@/shell/components/Logo/Logo'
import { ThemeSwitcher } from '@/shell/components/ThemeSwitcher/ThemeSwitcher'

function getCollapsedNavItemClasses(): string {
  return 'w-full flex items-center justify-center p-2 rounded-[var(--radius)] transition-all duration-200'
}

function getExpandedNavItemClasses(): string {
  return 'w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius)] text-left text-sm transition-all duration-200'
}

interface NavItemContentProps {
  readonly icon: string
  readonly label: string
  readonly collapsed: boolean
}

function NavItemContent({
  icon, label, collapsed 
}: NavItemContentProps): React.ReactElement {
  return (
    <>
      <i className={`ph ph-${icon} text-lg`} aria-hidden="true" />
      {!collapsed && <span>{label}</span>}
    </>
  )
}

interface NavItemProps {
  readonly icon: string
  readonly label: string
  readonly to: string
  readonly disabled?: boolean
  readonly active?: boolean
  readonly collapsed?: boolean
}

function getDisabledStateClasses(): string {
  return 'opacity-40 cursor-not-allowed'
}

function getActiveStateClasses(): string {
  return 'bg-[var(--bg-tertiary)] text-[var(--primary)] font-medium'
}

function getDefaultStateClasses(): string {
  return 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
}

function getNavItemStateClasses(disabled: boolean, active: boolean): string {
  if (disabled) return getDisabledStateClasses()
  if (active) return getActiveStateClasses()
  return getDefaultStateClasses()
}

function getTooltipTitle(collapsed: boolean, label: string): string | undefined {
  if (collapsed) return label
  return undefined
}

function NavItem({
  icon,
  label,
  to,
  disabled = false,
  active = false,
  collapsed = false,
}: NavItemProps): React.ReactElement {
  const baseClasses = collapsed ? getCollapsedNavItemClasses() : getExpandedNavItemClasses()
  const stateClasses = getNavItemStateClasses(disabled, active)

  if (disabled) {
    return (
      <span
        className={`${baseClasses} ${stateClasses}`}
        aria-disabled="true"
        title={getTooltipTitle(collapsed, label)}
      >
        <NavItemContent icon={icon} label={label} collapsed={collapsed} />
      </span>
    )
  }

  return (
    <Link
      to={to}
      className={`${baseClasses} ${stateClasses}`}
      title={getTooltipTitle(collapsed, label)}
    >
      <NavItemContent icon={icon} label={label} collapsed={collapsed} />
    </Link>
  )
}

interface ExternalLinkProps {
  readonly icon: string
  readonly label: string
  readonly href: string
  readonly collapsed?: boolean
}

function ExternalLink({
  icon,
  label,
  href,
  collapsed = false,
}: ExternalLinkProps): React.ReactElement {
  const baseClasses = collapsed ? getCollapsedNavItemClasses() : getExpandedNavItemClasses()

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${baseClasses} text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]`}
      title={getTooltipTitle(collapsed, label)}
    >
      <NavItemContent icon={icon} label={label} collapsed={collapsed} />
    </a>
  )
}

interface SidebarProps {
  readonly hasGraph: boolean
  readonly collapsed?: boolean
  readonly onToggleCollapse?: () => void
}

export function Sidebar({
  hasGraph,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps): React.ReactElement {
  const location = useLocation()
  const currentPath = location.pathname

  const sidebarWidth = collapsed ? 'w-16' : 'w-60'

  return (
    <aside
      className={`${sidebarWidth} flex flex-col bg-[var(--bg-secondary)] border-r border-[var(--border-color)] transition-all duration-300`}
    >
      <div
        className={`h-16 ${collapsed ? 'px-3 justify-center' : 'px-5'} flex items-center gap-2.5 border-b border-[var(--border-color)] shrink-0`}
      >
        <Logo />
        {!collapsed && <span className="logo-text">Éclair</span>}
      </div>

      <nav className={`flex-1 ${collapsed ? 'px-2' : 'px-3'} py-4 space-y-1`}>
        <NavItem
          icon="house"
          label="Overview"
          to="/"
          active={currentPath === '/'}
          collapsed={collapsed}
        />
        <NavItem
          icon="flow-arrow"
          label="Flows"
          to="/flows"
          active={currentPath === '/flows'}
          disabled={!hasGraph}
          collapsed={collapsed}
        />
        <NavItem
          icon="circles-three"
          label="Domain Map"
          to="/domains"
          active={currentPath === '/domains'}
          disabled={!hasGraph}
          collapsed={collapsed}
        />
        <NavItem
          icon="graph"
          label="Full Graph"
          to="/full-graph"
          active={currentPath === '/full-graph'}
          disabled={!hasGraph}
          collapsed={collapsed}
        />
        <NavItem
          icon="cube"
          label="Entities"
          to="/entities"
          active={currentPath === '/entities'}
          disabled={!hasGraph}
          collapsed={collapsed}
        />
        <NavItem
          icon="broadcast"
          label="Events"
          to="/events"
          active={currentPath === '/events'}
          disabled={!hasGraph}
          collapsed={collapsed}
        />
        <NavItem
          icon="git-diff"
          label="Compare"
          to="/compare"
          active={currentPath === '/compare'}
          collapsed={collapsed}
        />

        <div className="my-3 border-t border-[var(--border-color)]" />
        <ExternalLink
          icon="info"
          label="About Rivière"
          href="https://living-architecture.dev"
          collapsed={collapsed}
        />
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
