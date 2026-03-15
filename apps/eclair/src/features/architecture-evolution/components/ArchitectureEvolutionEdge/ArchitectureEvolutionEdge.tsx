import {
  BaseEdge, getSmoothStepPath, getStraightPath 
} from '@xyflow/react'
import type {
  Edge, EdgeProps 
} from '@xyflow/react'
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
  if (data.transition === 'unchanged') return data.label
  return `${data.label} · ${data.transition}`
}

function getLabelWidth(labelText: string): number {
  return Math.max(92, labelText.length * 6.4 + 28)
}

function getStrokeColor(style: React.CSSProperties | undefined): string {
  return typeof style?.stroke === 'string' ? style.stroke : 'var(--text-primary)'
}

export function ArchitectureEvolutionEdge(
  props: ArchitectureEvolutionEdgeProps,
): React.ReactElement | null {
  const {
    data, id, markerEnd, style 
  } = props

  if (data === undefined) return null

  const {
    edgePath, labelX, labelY 
  } = getEdgePath(props, data)
  const labelText = getLabelText(data)
  const shouldRenderGlow = data.transition !== 'unchanged' && data.state !== 'hidden'
  const strokeColor = getStrokeColor(style)
  const labelWidth = labelText === undefined ? 0 : getLabelWidth(labelText)

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
      {labelText !== undefined && (
        <g
          data-testid={`arch-evo-edge-label-${id}`}
          transform={`translate(${labelX - labelWidth / 2} ${labelY - 13})`}
          pointerEvents="none"
        >
          <rect
            width={labelWidth}
            height={26}
            rx={13}
            fill="var(--bg-secondary)"
            fillOpacity={data.state === 'ghosted' ? 0.48 : 0.96}
            stroke={
              data.transition === 'unchanged'
                ? 'var(--border-color)'
                : 'color-mix(in srgb, var(--amber) 48%, var(--border-color))'
            }
          />
          <circle cx={12} cy={13} r={4} fill={strokeColor} />
          <text
            x={22}
            y={16}
            fill="var(--text-primary)"
            fontSize={11}
            fontWeight={data.transition === 'unchanged' ? 700 : 800}
          >
            {labelText}
          </text>
        </g>
      )}
    </g>
  )
}
