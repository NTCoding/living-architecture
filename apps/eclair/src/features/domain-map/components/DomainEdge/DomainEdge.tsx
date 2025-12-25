import { BaseEdge, getStraightPath } from '@xyflow/react'

interface DomainEdgeProps {
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  data?: {
    apiCount?: number
    eventCount?: number
  }
}

export function DomainEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: DomainEdgeProps): React.ReactElement {
  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY })

  const apiCount = data?.apiCount ?? 0
  const eventCount = data?.eventCount ?? 0

  const labelText =
    apiCount > 0 && eventCount > 0 ? `${apiCount} API · ${eventCount} Event` :
    apiCount > 0 ? `${apiCount} API` :
    eventCount > 0 ? `${eventCount} Event` :
    undefined

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
