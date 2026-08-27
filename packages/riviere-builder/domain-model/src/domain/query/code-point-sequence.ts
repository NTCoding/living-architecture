import { RelativePosition } from './relative-position'

/** @riviere-role value-object */
export class CodePointSequence {
  declare private readonly brand: 'CodePointSequence'

  private constructor(private readonly codePoints: readonly number[]) {}

  static parse(value: string): CodePointSequence {
    const codePoints = Array.from(value, (character) => character.codePointAt(0)).filter(
      (codePoint) => codePoint !== undefined,
    )
    return new CodePointSequence(codePoints)
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
