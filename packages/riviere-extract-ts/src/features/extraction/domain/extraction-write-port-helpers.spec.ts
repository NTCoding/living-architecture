import {
  describe, expect, it 
} from 'vitest'
import {
  createLinkWriteInput, toSourceLocation 
} from './extraction-write-port'

describe('write-port helpers', () => {
  it('creates link inputs with and without explicit link types', () => {
    expect(createLinkWriteInput('a', 'b')).toStrictEqual({
      from: 'a',
      to: 'b',
    })
    expect(createLinkWriteInput('a', 'b', 'async')).toStrictEqual({
      from: 'a',
      to: 'b',
      type: 'async',
    })
  })

  it('creates source locations for extracted source files', () => {
    expect(toSourceLocation('test/repo', '/workspace/orders/place-order.ts', 7)).toStrictEqual({
      repository: 'test/repo',
      filePath: '/workspace/orders/place-order.ts',
      lineNumber: 7,
    })
  })
})
