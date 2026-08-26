import { expect, it } from 'vitest'
import { createFinalizeGraphInput } from './create-finalize-graph-input'

it('uses the explicit output path', () => {
  expect(
    createFinalizeGraphInput(
      { graph: 'source.json', output: 'final.json' },
      'default.json',
    ),
  ).toStrictEqual({
    graphFileLocation: 'source.json',
    outputPath: 'final.json',
  })
})

it('uses the graph path as the output path by default', () => {
  expect(createFinalizeGraphInput({ graph: 'source.json' }, 'default.json')).toStrictEqual({
    graphFileLocation: 'source.json',
    outputPath: 'source.json',
  })
})
