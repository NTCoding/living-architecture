import { BaseEdge, getSmoothStepPath, getStraightPath } from '@xyflow/react'
import type { Edge, EdgeProps } from '@xyflow/react'
import type { ArchitectureEvolutionEdgeData } from '../../data/architecture-evolution-scenario'

type ArchitectureEvolutionEdgeProps = EdgeProps<Edge<ArchitectureEvolutionEdgeData, 'architecture'>>

function getEdgePath(
  props: Omit<ArchitectureEvolutionEdgeProps, 'data'>,
  data: ArchitectureEvolutionEdgeData,
): {
  readonly edgePath: string
  readonly labelX: number
  readonly labelY: number
} {
  if (data.pathShape === 'straight') {
    const [edgePath, labelX, labelY] = getStraightPath({
      sourceX: props.sourceX,
      sourceY: props.sourceY,
      targetX: props.targetX,
      targetY: props.targetY,
    })

    return {
      edgePath,
      labelX,
      labelY,
    }
  }

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
    ...(data.pathOptions.borderRadius === undefined
      ? {}
      : { borderRadius: data.pathOptions.borderRadius }),
    ...(data.pathOptions.offset === undefined ? {} : { offset: data.pathOptions.offset }),
    ...(data.pathOptions.stepPosition === undefined
      ? {}
      : { stepPosition: data.pathOptions.stepPosition }),
  })

  return {
    edgePath,
    labelX,
    labelY,
  }
}

function getLabelText(data: ArchitectureEvolutionEdgeData): string | undefined {
  if (data.showLabel === false || data.state === 'hidden') return undefined
  return data.label
}

function getTransitionBadgeText(
  transition: ArchitectureEvolutionEdgeData['transition'],
): string | null {
  if (transition === 'changed') return 'modified'
  if (transition === 'added') return 'added'
  if (transition === 'removed') return 'removed'
  return null
}

function getLabelWidth(labelText: string): number {
  return Math.max(92, labelText.length * 6.4 + 28)
}

function getBadgeWidth(badgeText: string): number {
  return Math.max(50, badgeText.length * 6.2 + 16)
}

function getStrokeColor(style: React.CSSProperties | undefined): string {
  return typeof style?.stroke === 'string' ? style.stroke : 'var(--text-primary)'
}

function getBadgeFill(transition: ArchitectureEvolutionEdgeData['transition']): string {
  if (transition === 'removed') return '#fee2e2'
  if (transition === 'added') return 'color-mix(in srgb, #7c3aed 16%, var(--bg-secondary))'
  return 'color-mix(in srgb, var(--amber) 16%, var(--bg-secondary))'
}

function getBadgeTextColor(transition: ArchitectureEvolutionEdgeData['transition']): string {
  if (transition === 'removed') return '#991b1b'
  if (transition === 'added') return 'color-mix(in srgb, #7c3aed 80%, var(--text-primary))'
  return 'color-mix(in srgb, var(--amber) 74%, var(--text-primary))'
}

function getLabelStroke(transition: ArchitectureEvolutionEdgeData['transition']): string {
  if (transition === 'removed') return '#fca5a5'
  if (transition === 'added') return 'color-mix(in srgb, #7c3aed 48%, var(--border-color))'
  if (transition === 'changed') return 'color-mix(in srgb, var(--amber) 48%, var(--border-color))'
  return 'var(--border-color)'
}

function getPathPoints(path: string): ReadonlyArray<{ readonly x: number; readonly y: number }> {
  return [...path.matchAll(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g)].map((match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
  }))
}

function getLabelPlacement(
  path: string,
  labelWidth: number,
): { readonly x: number; readonly y: number } | null {
  const points = getPathPoints(path)

  if (points.length < 2) {
    return null
  }

  const segments = points.slice(1).map((point, index) => {
    const previous = points[index]

    if (previous === undefined) {
      throw new TypeError('Missing previous point while building label placement')
    }

    const dx = point.x - previous.x
    const dy = point.y - previous.y

    return {
      start: previous,
      end: point,
      dx,
      dy,
      length: Math.hypot(dx, dy),
    }
  })

  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0)

  if (totalLength === 0) {
    return null
  }

  let traversed = 0
  const halfway = totalLength / 2

  for (const segment of segments) {
    if (traversed + segment.length < halfway) {
      traversed += segment.length
      continue
    }

    const localDistance = halfway - traversed
    const ratio = segment.length === 0 ? 0 : localDistance / segment.length
    const pointX = segment.start.x + segment.dx * ratio
    const pointY = segment.start.y + segment.dy * ratio
    const isHorizontal = Math.abs(segment.dx) >= Math.abs(segment.dy)

    return {
      x: pointX - labelWidth / 2 + (isHorizontal ? 0 : 18),
      y: pointY - (isHorizontal ? 34 : 13),
    }
  }

  return null
}

export function ArchitectureEvolutionEdge(
  props: ArchitectureEvolutionEdgeProps,
): React.ReactElement | null {
  const { data, id, markerEnd, style } = props

  if (data === undefined) return null

  const edgePath = data.graphvizPath ?? getEdgePath(props, data).edgePath
  const labelText = getLabelText(data)
  const strokeColor = getStrokeColor(style)
  const badgeText = getTransitionBadgeText(data.transition)
  const badgeWidth = badgeText === null ? 0 : getBadgeWidth(badgeText)
  const labelWidth =
    labelText === undefined
      ? 0
      : getLabelWidth(labelText) + (badgeText === null ? 0 : badgeWidth + 10)
  const labelPoint = labelText === undefined ? null : getLabelPlacement(edgePath, labelWidth)

  return (
    <g
      data-testid={`arch-evo-edge-${id}`}
      className={`arch-evo-edge-group arch-evo-edge-group--${data.transition}`}
    >
      <BaseEdge
        id={id}
        path={edgePath}
        style={style}
        interactionWidth={28}
        {...(markerEnd === undefined ? {} : { markerEnd })}
      />
      {labelText !== undefined && labelPoint !== null && (
        <g
          data-testid={`arch-evo-edge-label-${id}`}
          transform={`translate(${labelPoint.x} ${labelPoint.y})`}
          pointerEvents="none"
        >
          <rect
            width={labelWidth}
            height={26}
            rx={13}
            fill="var(--bg-secondary)"
            fillOpacity={data.state === 'ghosted' ? 0.48 : 0.96}
            stroke={getLabelStroke(data.transition)}
          />
          <circle cx={12} cy={13} r={4} fill={strokeColor} />
          <text x={22} y={16} fill="var(--text-primary)" fontSize={11} fontWeight={700}>
            {labelText}
          </text>
          {badgeText !== null && (
            <>
              <rect
                x={labelWidth - badgeWidth - 8}
                y={4}
                width={badgeWidth}
                height={18}
                rx={9}
                fill={getBadgeFill(data.transition)}
              />
              <text
                x={labelWidth - badgeWidth / 2 - 8}
                y={16}
                fill={getBadgeTextColor(data.transition)}
                fontSize={10}
                fontWeight={700}
                textAnchor="middle"
              >
                {badgeText}
              </text>
            </>
          )}
        </g>
      )}
    </g>
  )
}
