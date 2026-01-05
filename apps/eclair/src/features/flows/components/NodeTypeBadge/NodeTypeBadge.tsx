import type { NodeType } from '@/types/riviere'

interface NodeTypeBadgeProps {readonly type: NodeType}

function getBadgeClass(type: NodeType): string {
  switch (type) {
    case 'UI':
      return 'badge-ui'
    case 'API':
      return 'badge-api'
    case 'UseCase':
      return 'badge-usecase'
    case 'DomainOp':
      return 'badge-domainop'
    case 'Event':
      return 'badge-event'
    case 'EventHandler':
      return 'badge-eventhandler'
    case 'Custom':
      return 'badge-custom'
  }
}

function getDisplayLabel(type: NodeType): string {
  if (type === 'Custom') return 'JOB'
  return type
}

export function NodeTypeBadge({ type }: Readonly<NodeTypeBadgeProps>): React.ReactElement {
  const badgeClass = getBadgeClass(type)

  return (
    <span
      data-testid="node-type-badge"
      className={`node-type-badge ${badgeClass}`}
    >
      {getDisplayLabel(type)}
    </span>
  )
}
