import {
  describe, expect, it 
} from 'vitest'
import { parseNode } from '@/platform/infra/__fixtures__/riviere-test-fixtures'
import { getNodeTypeBreakdown } from './node-type-breakdown'

const sourceLocation = {
  repository: 'test-repository',
  filePath: 'test.sql',
}

describe('getNodeTypeBreakdown', () => {
  it('counts custom type names that match object prototype properties', () => {
    const components = ['constructor', 'toString', '__proto__'].map((customTypeName, index) =>
      parseNode({
        id: `custom-${index}`,
        type: 'Custom',
        name: customTypeName,
        domain: 'test-domain',
        module: 'test-module',
        customTypeName,
        sourceLocation,
      }),
    )

    expect(getNodeTypeBreakdown(components)).toStrictEqual(
      Object.fromEntries([
        ['constructor', 1],
        ['toString', 1],
        ['__proto__', 1],
      ]),
    )
  })
})
