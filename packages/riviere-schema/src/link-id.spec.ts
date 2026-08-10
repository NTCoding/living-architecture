import { createLinkId } from './link-id'

describe('createLinkId()', () => {
  it('uses source and target when source location is absent', () => {
    expect(
      createLinkId({
        source: 'source',
        target: 'target',
      }),
    ).toBe('source->target')
  })

  it('adds file path when line and column are absent', () => {
    expect(
      createLinkId({
        source: 'source',
        target: 'target',
        sourceLocation: {
          repository: 'repo',
          filePath: 'src/file.ts',
        },
      }),
    ).toBe('source->target@src/file.ts')
  })

  it('adds an empty line segment when only column is present', () => {
    expect(
      createLinkId({
        source: 'source',
        target: 'target',
        sourceLocation: {
          repository: 'repo',
          filePath: 'src/file.ts',
          columnNumber: 5,
        },
      }),
    ).toBe('source->target@src/file.ts::5')
  })

  it('adds line when column is absent', () => {
    expect(
      createLinkId({
        source: 'source',
        target: 'target',
        sourceLocation: {
          repository: 'repo',
          filePath: 'src/file.ts',
          lineNumber: 12,
        },
      }),
    ).toBe('source->target@src/file.ts:12')
  })

  it('adds line and column when both are present', () => {
    expect(
      createLinkId({
        source: 'source',
        target: 'target',
        sourceLocation: {
          repository: 'repo',
          filePath: 'src/file.ts',
          lineNumber: 12,
          columnNumber: 5,
        },
      }),
    ).toBe('source->target@src/file.ts:12:5')
  })
})
