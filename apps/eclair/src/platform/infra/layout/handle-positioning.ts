interface AngleRange {
  minAngle: number
  maxAngle: number
  sourceHandle: string
  targetHandle: string
}

const ANGLE_RANGES: AngleRange[] = [
  {
    minAngle: -Math.PI / 4,
    maxAngle: Math.PI / 4,
    sourceHandle: 'right-source',
    targetHandle: 'left-target',
  },
  {
    minAngle: Math.PI / 4,
    maxAngle: (3 * Math.PI) / 4,
    sourceHandle: 'bottom-source',
    targetHandle: 'top-target',
  },
  {
    minAngle: -(3 * Math.PI) / 4,
    maxAngle: -Math.PI / 4,
    sourceHandle: 'top-source',
    targetHandle: 'bottom-target',
  },
]

function getHandleForAngle(angle: number): {
  sourceHandle: string
  targetHandle: string
} {
  for (const range of ANGLE_RANGES) {
    const inRange = angle > range.minAngle && angle <= range.maxAngle
    if (inRange) {
      return {
        sourceHandle: range.sourceHandle,
        targetHandle: range.targetHandle,
      }
    }
  }

  return {
    sourceHandle: 'left-source',
    targetHandle: 'right-target',
  }
}

export function getClosestHandle(
  sourcePos: {
    x: number
    y: number
  },
  targetPos: {
    x: number
    y: number
  },
): {
  sourceHandle: string
  targetHandle: string
} {
  const dx = targetPos.x - sourcePos.x
  const dy = targetPos.y - sourcePos.y
  const angle = Math.atan2(dy, dx)

  return getHandleForAngle(angle)
}
