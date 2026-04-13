import {
  describe, it, expect 
} from 'vitest'
import { deduplicateLinks } from './deduplicate-links'
import type {
  RawLink, UncertainRawLink 
} from './call-graph-types'
import { buildComponent } from './call-graph-fixtures'

function buildRawLink(sourceName: string, targetName: string, lineNumber: number): RawLink {
  return {
    source: buildComponent(sourceName, '/test.ts', 1),
    target: buildComponent(targetName, '/test.ts', 10, { type: 'domainOp' }),
    callSite: {
      filePath: '/test.ts',
      lineNumber,
      methodName: 'execute',
    },
  }
}

describe('deduplicateLinks', () => {
  it('replaces duplicate with earlier line number when second link is earlier', () => {
    const links: RawLink[] = [
      buildRawLink('Source', 'Target', 20),
      buildRawLink('Source', 'Target', 10),
    ]

    const result = deduplicateLinks(links, [])

    expect(result).toHaveLength(1)
    expect(result[0]?.sourceLocation?.lineNumber).toBe(10)
  })

  it('keeps first link when duplicate has later line number', () => {
    const links: RawLink[] = [
      buildRawLink('Source', 'Target', 10),
      buildRawLink('Source', 'Target', 20),
    ]

    const result = deduplicateLinks(links, [])

    expect(result).toHaveLength(1)
    expect(result[0]?.sourceLocation?.lineNumber).toBe(10)
  })

  it('returns empty array for empty inputs', () => {
    const result = deduplicateLinks([], [])

    expect(result).toStrictEqual([])
  })

  it('keeps first link when duplicate has equal line number', () => {
    const links: RawLink[] = [
      buildRawLink('Source', 'Target', 10),
      buildRawLink('Source', 'Target', 10),
    ]

    const result = deduplicateLinks(links, [])

    expect(result).toHaveLength(1)
    expect(result[0]?.sourceLocation?.lineNumber).toBe(10)
  })

  it('includes multiple uncertain links in output', () => {
    const uncertainLinks: UncertainRawLink[] = [
      {
        source: buildComponent('Source1', '/test.ts', 1),
        reason: "Receiver type is 'any'",
        callSite: {
          filePath: '/test.ts',
          lineNumber: 5,
          methodName: 'execute',
        },
      },
      {
        source: buildComponent('Source2', '/test.ts', 2),
        reason: 'No implementation found for Foo',
        callSite: {
          filePath: '/test.ts',
          lineNumber: 8,
          methodName: 'run',
        },
      },
    ]

    const result = deduplicateLinks([], uncertainLinks)

    expect(result).toHaveLength(2)
    expect(result[0]?._uncertain).toBe("Receiver type is 'any'")
    expect(result[1]?._uncertain).toBe('No implementation found for Foo')
  })

  it('includes uncertain links in output', () => {
    const uncertainLinks: UncertainRawLink[] = [
      {
        source: buildComponent('Source', '/test.ts', 1),
        reason: "Receiver type is 'any'",
        callSite: {
          filePath: '/test.ts',
          lineNumber: 5,
          methodName: 'execute',
        },
      },
    ]

    const result = deduplicateLinks([], uncertainLinks)

    expect(result).toHaveLength(1)
    expect(result[0]).toStrictEqual(
      expect.objectContaining({
        source: 'orders:orders-module:useCase:source',
        target: '_unresolved',
        _uncertain: "Receiver type is 'any'",
      }),
    )
  })
})
