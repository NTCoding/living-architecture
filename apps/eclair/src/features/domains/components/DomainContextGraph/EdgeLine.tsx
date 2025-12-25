import type { DomainPosition } from './DomainContextGraph'

interface EdgeLineProps {
  from: DomainPosition
  to: DomainPosition
  fromRadius: number
  toRadius: number
  testId: string
  direction: 'incoming' | 'outgoing'
}

export function EdgeLine({ from, to, fromRadius, toRadius, testId, direction }: EdgeLineProps): React.ReactElement {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) return <g data-testid={testId} data-direction={direction} />

  const startOffset = fromRadius / length
  const endOffset = toRadius / length

  const startX = from.x + dx * startOffset
  const startY = from.y + dy * startOffset
  const endX = to.x - dx * endOffset
  const endY = to.y - dy * endOffset

  return (
    <g data-testid={testId} data-direction={direction}>
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
    </g>
  )
}
