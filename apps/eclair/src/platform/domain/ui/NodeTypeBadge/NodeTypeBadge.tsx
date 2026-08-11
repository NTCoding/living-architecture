import { getNodeTypeColor } from '@/platform/domain/node-type-presentation'
import type { Theme } from '@/platform/domain/theme/theme'
import { DEFAULT_THEME } from '@/platform/domain/theme/theme'

interface NodeTypeBadgeProps {
  readonly type: string
  readonly description?: string | undefined
  readonly theme?: Theme
}

const BADGE_CLASSES: Readonly<Record<string, string>> = {
  UI: 'badge-ui',
  API: 'badge-api',
  UseCase: 'badge-usecase',
  DomainOp: 'badge-domainop',
  Event: 'badge-event',
  EventHandler: 'badge-eventhandler',
  Custom: 'badge-custom',
}

export function NodeTypeBadge({
  type,
  description,
  theme = DEFAULT_THEME,
}: Readonly<NodeTypeBadgeProps>): React.ReactElement {
  const badgeClass = BADGE_CLASSES[type] ?? 'badge-custom'

  return (
    <span
      data-testid="node-type-badge"
      className={`node-type-badge ${badgeClass}`}
      style={{ backgroundColor: getNodeTypeColor(type, theme) }}
      title={description}
    >
      {type}
    </span>
  )
}
