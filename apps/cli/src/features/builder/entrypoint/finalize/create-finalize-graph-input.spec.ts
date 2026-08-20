import { expect, it } from 'vitest'
import { createFinalizeGraphInput } from './create-finalize-graph-input'

it('uses the explicit output path', () => {
  expect(createFinalizeGraphInput({ graph: 'source.json', output: 'final.json' })).toStrictEqual({
    graphPathOption: 'source.json',
    outputPath: 'final.json',
  })
})

it('uses the graph path as the output path by default', () => {
  expect(createFinalizeGraphInput({ graph: 'source.json' })).toStrictEqual({
    graphPathOption: 'source.json',
    outputPath: 'source.json',
  })
})
