import type { DomainPosition } from './domain-position'

interface EdgeLineProps {
  readonly from: DomainPosition
  readonly to: DomainPosition
  readonly fromRadius: number
  readonly toRadius: number
  readonly testId: string
  readonly direction: 'incoming' | 'outgoing'
  readonly relationshipCount: number
  readonly isBidirectional: boolean
}

const BIDIRECTIONAL_EDGE_SEPARATION = 8

export function EdgeLine({
  from,
  to,
  fromRadius,
  toRadius,
  testId,
  direction,
  relationshipCount,
  isBidirectional,
}: Readonly<EdgeLineProps>): React.ReactElement {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) return <g data-testid={testId} data-direction={direction} />

  const startOffset = fromRadius / length
  const endOffset = toRadius / length
  const edgeSeparation = isBidirectional ? BIDIRECTIONAL_EDGE_SEPARATION : 0
  const separationX = (-dy / length) * edgeSeparation
  const separationY = (dx / length) * edgeSeparation

  const startX = from.x + dx * startOffset + separationX
  const startY = from.y + dy * startOffset + separationY
  const endX = to.x - dx * endOffset + separationX
  const endY = to.y - dy * endOffset + separationY

  return (
    <g data-testid={testId} data-direction={direction} data-bidirectional={isBidirectional}>
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        style={{ stroke: 'var(--text-tertiary)' }}
        strokeWidth="1"
        strokeOpacity="0.6"
        markerEnd="url(#arrow-marker)"
      />
      <text
        x={(startX + endX) / 2}
        y={(startY + endY) / 2 - 6}
        textAnchor="middle"
        className="fill-[var(--text-secondary)] text-[10px] font-semibold"
      >
        {relationshipCount} {relationshipCount === 1 ? 'relationship' : 'relationships'}
      </text>
    </g>
  )
}
