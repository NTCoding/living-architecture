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
  if (transition === 'added') return 'color-mix(in srgb, var(--accent) 16%, var(--bg-secondary))'
  return 'color-mix(in srgb, var(--amber) 16%, var(--bg-secondary))'
}

function getBadgeTextColor(transition: ArchitectureEvolutionEdgeData['transition']): string {
  if (transition === 'removed') return '#991b1b'
  if (transition === 'added') return 'color-mix(in srgb, var(--accent) 80%, var(--text-primary))'
  return 'color-mix(in srgb, var(--amber) 74%, var(--text-primary))'
}

function getLabelStroke(transition: ArchitectureEvolutionEdgeData['transition']): string {
  if (transition === 'removed') return '#fca5a5'
  if (transition === 'added') return 'color-mix(in srgb, var(--accent) 48%, var(--border-color))'
  if (transition === 'changed') return 'color-mix(in srgb, var(--amber) 48%, var(--border-color))'
  return 'var(--border-color)'
}

function getLabelPointFromPath(path: string): { readonly x: number; readonly y: number } | null {
  const points = [...path.matchAll(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g)]

  if (points.length === 0) {
    return null
  }

  const middlePoint = points[Math.floor(points.length / 2)]

  if (middlePoint === undefined) {
    return null
  }

  return {
    x: Number(middlePoint[1]),
    y: Number(middlePoint[2]),
  }
}

export function ArchitectureEvolutionEdge(
  props: ArchitectureEvolutionEdgeProps,
): React.ReactElement | null {
  const { data, id, markerEnd, style } = props

  if (data === undefined) return null

  const edgePath = data.graphvizPath ?? getEdgePath(props, data).edgePath
  const shouldRenderGlow = data.transition !== 'unchanged' && data.state !== 'hidden'
  const labelText = getLabelText(data)
  const labelPoint = labelText === undefined ? null : getLabelPointFromPath(edgePath)
  const strokeColor = getStrokeColor(style)
  const badgeText = getTransitionBadgeText(data.transition)
  const badgeWidth = badgeText === null ? 0 : getBadgeWidth(badgeText)
  const labelWidth =
    labelText === undefined
      ? 0
      : getLabelWidth(labelText) + (badgeText === null ? 0 : badgeWidth + 10)

  return (
    <g data-testid={`arch-evo-edge-${id}`}>
      {shouldRenderGlow && (
        <path
          d={edgePath}
          className={`arch-evo-edge-glow arch-evo-edge-glow--${data.transition}`}
        />
      )}
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
          transform={`translate(${labelPoint.x - labelWidth / 2} ${labelPoint.y - 13})`}
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
