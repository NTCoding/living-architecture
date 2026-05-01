import {
  afterEach, describe, it, expect, vi 
} from 'vitest'
import {
  CallSite, RawLink 
} from './call-graph-types'
import { buildComponent } from './call-graph-fixtures'

type ExtractedLinkMockMode =
  | 'missingSourceLocation'
  | 'missingExistingSourceLocation'
  | 'missingLineNumber'
  | 'missingMethodName'

const extractedLinkState = vi.hoisted((): { mode: ExtractedLinkMockMode } => ({mode: 'missingSourceLocation',}))

vi.mock('../extracted-link', () => ({
  ExtractedLink: class {
    readonly source: string
    readonly target: string
    readonly type: 'sync' | 'async' | undefined
    readonly _uncertain: string | undefined
    readonly sourceLocation:
      | {
        repository: string
        filePath: string
        lineNumber?: number
        methodName?: string
      }
      | undefined

    constructor(params: {
      source: string
      target: string
      type?: 'sync' | 'async'
      _uncertain?: string
      sourceLocation?: {
        repository: string
        filePath: string
        lineNumber?: number
        methodName?: string
      }
    }) {
      this.source = params.source
      this.target = params.target
      this.type = params.type
      this._uncertain = params._uncertain

      if (extractedLinkState.mode === 'missingSourceLocation') {
        this.sourceLocation = undefined
        return
      }

      if (extractedLinkState.mode === 'missingExistingSourceLocation') {
        const sourceLocationValues = [
          {
            repository: 'test-repo',
            filePath: '/src/test.ts',
            lineNumber: 10,
            methodName: 'execute',
          },
          undefined,
        ][Symbol.iterator]()
        Object.defineProperty(this, 'sourceLocation', {
          configurable: true,
          enumerable: true,
          get() {
            return sourceLocationValues.next().value
          },
        })
        return
      }

      if (extractedLinkState.mode === 'missingLineNumber') {
        this.sourceLocation = {
          repository: 'test-repo',
          filePath: '/src/test.ts',
          methodName: 'execute',
        }
        return
      }

      this.sourceLocation = {
        repository: 'test-repo',
        filePath: '/src/test.ts',
        lineNumber: 10,
      }
    }
  },
}))

afterEach(() => {
  extractedLinkState.mode = 'missingSourceLocation'
})

function buildRawLink(sourceName: string, targetName: string, lineNumber: number): RawLink {
  return new RawLink({
    source: buildComponent(sourceName, '/test.ts', 1),
    target: buildComponent(targetName, '/test.ts', 10, { type: 'domainOp' }),
    callSite: new CallSite({
      filePath: '/test.ts',
      lineNumber,
      methodName: 'execute',
    }),
  })
}

describe('deduplicateLinks guards', () => {
  it('throws when constructed extracted link has no source location', async () => {
    extractedLinkState.mode = 'missingSourceLocation'
    const { deduplicateLinks } = await import('./deduplicate-links')

    expect(() => deduplicateLinks([buildRawLink('Source', 'Target', 10)], [])).toThrow(
      'Expected sourceLocation on extracted link',
    )
  })

  it('throws when duplicate extracted link has no source location', async () => {
    extractedLinkState.mode = 'missingExistingSourceLocation'
    const { deduplicateLinks } = await import('./deduplicate-links')

    expect(() =>
      deduplicateLinks(
        [buildRawLink('Source', 'Target', 10), buildRawLink('Source', 'Target', 5)],
        [],
      ),
    ).toThrow('Expected sourceLocation on extracted link')
  })

  it('throws when duplicate extracted link source location has no line number', async () => {
    extractedLinkState.mode = 'missingLineNumber'
    const { deduplicateLinks } = await import('./deduplicate-links')

    expect(() =>
      deduplicateLinks(
        [buildRawLink('Source', 'Target', 10), buildRawLink('Source', 'Target', 5)],
        [],
      ),
    ).toThrow('Expected sourceLocation on extracted link')
  })

  it('throws when duplicate extracted link source location has no method name', async () => {
    extractedLinkState.mode = 'missingMethodName'
    const { deduplicateLinks } = await import('./deduplicate-links')

    expect(() =>
      deduplicateLinks(
        [buildRawLink('Source', 'Target', 10), buildRawLink('Source', 'Target', 5)],
        [],
      ),
    ).toThrow('Expected sourceLocation on extracted link')
  })
})
