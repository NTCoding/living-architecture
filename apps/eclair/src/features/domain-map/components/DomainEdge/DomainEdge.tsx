import { BaseEdge, getStraightPath } from '@xyflow/react'

interface DomainEdgeProps {
  readonly id: string
  readonly sourceX: number
  readonly sourceY: number
  readonly targetX: number
  readonly targetY: number
  readonly data?: Readonly<{
    readonly apiCount?: number
    readonly eventCount?: number
  }>
}

function getEdgeLabel(apiCount: number, eventCount: number): string | undefined {
  if (apiCount > 0 && eventCount > 0) return `${apiCount} API · ${eventCount} Event`
  if (apiCount > 0) return `${apiCount} API`
  if (eventCount > 0) return `${eventCount} Event`
  return undefined
}

export function DomainEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: Readonly<DomainEdgeProps>): React.ReactElement {
  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY })

  const apiCount = data?.apiCount ?? 0
  const eventCount = data?.eventCount ?? 0

  const labelText = getEdgeLabel(apiCount, eventCount)

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      labelX={labelX}
      labelY={labelY}
      label={labelText}
      style={{
        stroke: 'var(--accent-primary)',
        strokeWidth: 2,
      }}
    />
  )
}
