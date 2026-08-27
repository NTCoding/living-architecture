import { CodePointSequence } from '@living-architecture/riviere-builder-domain-model/query/code-point-sequence'

export function ascendingCodePointSortResult(left: string, right: string): -1 | 0 | 1 {
  return CodePointSequence.parse(left)
    .positionRelativeTo(CodePointSequence.parse(right))
    .asAscendingArraySortResult()
}
