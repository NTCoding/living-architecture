type Position = 'before' | 'same' | 'after'

const ascendingArraySortResults = {
  before: -1,
  same: 0,
  after: 1,
} as const satisfies Record<Position, -1 | 0 | 1>

/** @riviere-role value-object */
export class RelativePosition {
  declare private readonly brand: 'RelativePosition'

  private constructor(readonly value: Position) {}

  static parse(value: Position): RelativePosition {
    return new RelativePosition(value)
  }

  asAscendingArraySortResult(): -1 | 0 | 1 {
    return ascendingArraySortResults[this.value]
  }
}
