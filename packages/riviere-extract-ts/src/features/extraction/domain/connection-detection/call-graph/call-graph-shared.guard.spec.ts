import {
  describe, it, expect, vi 
} from 'vitest'
import { Project } from 'ts-morph'
import { resolveTypeThroughInterface } from './call-graph-shared'
import { ComponentIndex } from '../component-index'
import { CallGraphOptions } from './call-graph-types'

vi.mock('../interface-resolution/resolve-interface', async () => {
  const actual = await vi.importActual<typeof import('../interface-resolution/resolve-interface')>(
    '../interface-resolution/resolve-interface',
  )
  return {
    ...actual,
    resolveInterface: vi.fn(() => ({
      resolved: true,
      typeName: undefined,
      reason: undefined,
      typeDefinedInSource: undefined,
    })),
  }
})

describe('resolveTypeThroughInterface guards', () => {
  it('throws TypeError when interface resolution is marked resolved without a type name', () => {
    const options = new CallGraphOptions({
      strict: false,
      sourceFilePaths: [],
      repository: 'test-repo',
    })

    expect(() =>
      resolveTypeThroughInterface(
        'OrderGateway',
        new Project({ useInMemoryFileSystem: true }),
        new ComponentIndex([]),
        options,
      ),
    ).toThrow('Expected interface resolution type name')
  })
})
