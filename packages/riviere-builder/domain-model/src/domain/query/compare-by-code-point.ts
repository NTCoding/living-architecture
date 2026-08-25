/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function compareByCodePoint(a: string, b: string): number {
  const leftCodePoints = Array.from(a, toCodePoint)
  const rightCodePoints = Array.from(b, toCodePoint)

  for (const [index, leftCodePoint] of leftCodePoints.entries()) {
    const rightCodePoint = rightCodePoints[index]
    if (rightCodePoint === undefined) return 1
    if (leftCodePoint < rightCodePoint) return -1
    if (leftCodePoint > rightCodePoint) return 1
  }

  if (leftCodePoints.length < rightCodePoints.length) return -1
  return 0
}

function toCodePoint(character: string): number {
  const firstCodeUnit = character.charCodeAt(0)
  if (character.length === 1) return firstCodeUnit

  const secondCodeUnit = character.charCodeAt(1)
  return (firstCodeUnit - 0xd800) * 0x400 + secondCodeUnit - 0xdc00 + 0x10000
}
