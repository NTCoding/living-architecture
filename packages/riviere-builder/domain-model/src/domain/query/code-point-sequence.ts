import { RelativePosition } from './relative-position'

/** @riviere-role value-object */
export class CodePointSequence {
  declare private readonly brand: 'CodePointSequence'

  private constructor(private readonly codePoints: readonly number[]) {}

  static parse(value: string): CodePointSequence {
    return new CodePointSequence(Array.from(value, toCodePoint))
  }

  positionRelativeTo(other: CodePointSequence): RelativePosition {
    for (const [index, codePoint] of this.codePoints.entries()) {
      const otherCodePoint = other.codePoints[index]
      if (otherCodePoint === undefined) return RelativePosition.parse('after')
      if (codePoint < otherCodePoint) return RelativePosition.parse('before')
      if (codePoint > otherCodePoint) return RelativePosition.parse('after')
    }

    if (this.codePoints.length < other.codePoints.length) {
      return RelativePosition.parse('before')
    }
    return RelativePosition.parse('same')
  }
}

function toCodePoint(character: string): number {
  const firstCodeUnit = character.charCodeAt(0)
  if (character.length === 1) return firstCodeUnit

  const secondCodeUnit = character.charCodeAt(1)
  return (firstCodeUnit - 0xd800) * 0x400 + secondCodeUnit - 0xdc00 + 0x10000
}
