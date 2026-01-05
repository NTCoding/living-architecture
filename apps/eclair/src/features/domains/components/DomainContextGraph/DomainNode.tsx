import type { DomainPosition } from './DomainContextGraph'

interface DomainNodeProps {
  readonly position: DomainPosition
  readonly isSelected: boolean
  readonly onClick: () => void
}

export function DomainNode({
  position,
  isSelected,
  onClick,
}: Readonly<DomainNodeProps>): React.ReactElement {
  const nodeRadius = position.isCurrent ? 40 : 30

  const fillStyle = position.isCurrent ? { fill: 'var(--primary)' } : { fill: 'var(--bg-tertiary)' }

  const getStrokeStyle = (): Record<string, string> => {
    if (isSelected) return { stroke: 'var(--primary)' }
    if (position.isCurrent) return { stroke: 'var(--primary-dark)' }
    return { stroke: 'var(--border-color)' }
  }

  const strokeStyle = getStrokeStyle()

  const textStyle = position.isCurrent ? { fill: 'white' } : { fill: 'var(--text-primary)' }

  return (
    <g
      data-testid={`domain-node-${position.id}`}
      data-current={position.isCurrent.toString()}
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <circle
        cx={position.x}
        cy={position.y}
        r={nodeRadius}
        style={{
          ...fillStyle,
          ...strokeStyle,
        }}
        strokeWidth={isSelected ? '3' : '2'}
      />
      <text
        x={position.x}
        y={position.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={position.isCurrent ? '10' : '9'}
        fontWeight="500"
        style={textStyle}
      >
        {position.id}
      </text>
    </g>
  )
}
