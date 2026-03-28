import {
  BaseEdge, getSmoothStepPath, getStraightPath 
} from '@xyflow/react'
import type {
  Edge, EdgeProps 
} from '@xyflow/react'
import type { ArchitectureEvolutionEdgeData } from '../architecture-evolution-scenario'

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

function measureLabelWidth(labelText: string): number {
  return Math.max(92, labelText.length * 6.4 + 28)
}

function getBadgeWidth(badgeText: string): number {
  return Math.max(50, badgeText.length * 6.2 + 16)
}

function getLabelWidth(labelText: string, badgeWidth: number): number {
  return measureLabelWidth(labelText) + badgeWidth + 10
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

function isSvgNumberStart(character: string): boolean {
  return (
    character === '-' ||
    character === '+' ||
    character === '.' ||
    (character >= '0' && character <= '9')
  )
}

function isSvgNumberContinuation(character: string, previousCharacter: string): boolean {
  if (character >= '0' && character <= '9') return true
  if (character === '.') return true
  if (character === 'e' || character === 'E') return true
  return (
    (character === '-' || character === '+') &&
    (previousCharacter === 'e' || previousCharacter === 'E')
  )
}

function readSvgNumber(
  path: string,
  startIndex: number,
  nextIndex: number = startIndex + 1,
): {
  readonly value: number
  readonly nextIndex: number
} | null {
  const currentCharacter = path[nextIndex]

  if (currentCharacter === undefined) {
    const value = Number(path.slice(startIndex, nextIndex))
    if (Number.isNaN(value)) return null

    return {
      value,
      nextIndex,
    }
  }

  const previousCharacter = path[nextIndex - 1]
  if (previousCharacter === undefined) {
    return null
  }

  if (!isSvgNumberContinuation(currentCharacter, previousCharacter)) {
    const value = Number(path.slice(startIndex, nextIndex))
    if (Number.isNaN(value)) return null

    return {
      value,
      nextIndex,
    }
  }

  return readSvgNumber(path, startIndex, nextIndex + 1)
}

function collectPathNumbers(
  path: string,
  index = 0,
  values: ReadonlyArray<number> = [],
): ReadonlyArray<number> {
  if (index >= path.length) return values

  const character = path[index]
  if (character === undefined) return values

  if (!isSvgNumberStart(character)) {
    return collectPathNumbers(path, index + 1, values)
  }

  const parsedValue = readSvgNumber(path, index)
  if (parsedValue === null) {
    return collectPathNumbers(path, index + 1, values)
  }

  return collectPathNumbers(path, parsedValue.nextIndex, [...values, parsedValue.value])
}

function collectPathPoints(
  values: ReadonlyArray<number>,
  index = 0,
  points: ReadonlyArray<{
    readonly x: number
    readonly y: number
  }> = [],
): ReadonlyArray<{
  readonly x: number
  readonly y: number
}> {
  if (index + 1 >= values.length) return points

  const x = values[index]
  const y = values[index + 1]

  if (x === undefined || y === undefined) return points

  return collectPathPoints(values, index + 2, [
    ...points,
    {
      x,
      y,
    },
  ])
}

function parsePathPoints(path: string): ReadonlyArray<{
  readonly x: number
  readonly y: number
}> {
  return collectPathPoints(collectPathNumbers(path))
}

function getLabelPlacement(
  path: string,
  labelWidth: number,
): {
  readonly x: number
  readonly y: number
} | null {
  const points = parsePathPoints(path)

  if (points.length < 2) {
    return null
  }

  const midpointIndex = Math.floor(points.length / 2)
  const currentPoint = points[midpointIndex]
  const previousPoint = points[Math.max(midpointIndex - 1, 0)]
  const nextPoint = points[Math.min(midpointIndex + 1, points.length - 1)]

  if (currentPoint === undefined || previousPoint === undefined || nextPoint === undefined) {
    return null
  }

  const isHorizontal =
    Math.abs(nextPoint.x - previousPoint.x) >= Math.abs(nextPoint.y - previousPoint.y)

  return {
    x: currentPoint.x - labelWidth / 2 + (isHorizontal ? 0 : 18),
    y: currentPoint.y - (isHorizontal ? 34 : 13),
  }
}

function getFallbackLabelPlacement(
  props: Omit<ArchitectureEvolutionEdgeProps, 'data'>,
  labelWidth: number,
): {
  readonly x: number
  readonly y: number
} {
  return {
    x: (props.sourceX + props.targetX) / 2 - labelWidth / 2,
    y: (props.sourceY + props.targetY) / 2 - 13,
  }
}

export function ArchitectureEvolutionEdge(
  props: ArchitectureEvolutionEdgeProps,
): React.ReactElement | null {
  const {
    data, id, markerEnd, style 
  } = props

  if (data === undefined) return null

  const edgePath = data.graphvizPath ?? getEdgePath(props, data).edgePath
  const labelText = getLabelText(data)
  const strokeColor = getStrokeColor(style)
  const badgeText = getTransitionBadgeText(data.transition)
  const badgeWidth = badgeText === null ? 0 : getBadgeWidth(badgeText)
  const labelWidth = labelText === undefined ? 0 : getLabelWidth(labelText, badgeWidth)
  const labelPoint =
    labelText === undefined
      ? null
      : (getLabelPlacement(edgePath, labelWidth) ?? getFallbackLabelPlacement(props, labelWidth))

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
