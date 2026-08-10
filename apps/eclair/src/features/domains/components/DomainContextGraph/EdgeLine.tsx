import type { DomainPosition } from './domain-position'

interface EdgeLineProps {
  readonly from: DomainPosition
  readonly to: DomainPosition
  readonly fromRadius: number
  readonly toRadius: number
  readonly testId: string
  readonly direction: 'incoming' | 'outgoing'
  readonly relationshipCount: number
  readonly relationshipTypes?: readonly string[]
  readonly deliveryTypes?: readonly ('sync' | 'async')[]
  readonly isBidirectional: boolean
}

const BIDIRECTIONAL_EDGE_SEPARATION = 8
const BIDIRECTIONAL_LABEL_POSITION_FROM_SOURCE = 0.35

function formatEdgeLabel(
  relationshipCount: number,
  relationshipTypes: readonly string[] | undefined,
  deliveryTypes: readonly ('sync' | 'async')[] | undefined,
): string {
  if (relationshipTypes === undefined || relationshipTypes.length === 0) {
    const noun = relationshipCount === 1 ? 'relationship' : 'relationships'
    return `${relationshipCount} ${noun}`
  }
  const semanticLabel = relationshipTypes.join(', ')
  if (deliveryTypes === undefined || deliveryTypes.length === 0) return semanticLabel
  return `${semanticLabel} · ${deliveryTypes.join('/')}`
}

export function EdgeLine({
  from,
  to,
  fromRadius,
  toRadius,
  testId,
  direction,
  relationshipCount,
  relationshipTypes,
  deliveryTypes,
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
  const edgeLabel = formatEdgeLabel(relationshipCount, relationshipTypes, deliveryTypes)
  const labelPosition = isBidirectional ? BIDIRECTIONAL_LABEL_POSITION_FROM_SOURCE : 0.5
  const labelX = startX + (endX - startX) * labelPosition
  const labelY = startY + (endY - startY) * labelPosition - 6

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
        strokeDasharray={deliveryTypes?.length === 1 && deliveryTypes[0] === 'async' ? '5 3' : undefined}
        markerEnd="url(#arrow-marker)"
      />
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        className="fill-[var(--text-secondary)] text-[10px] font-semibold"
      >
        {edgeLabel}
      </text>
    </g>
  )
}
