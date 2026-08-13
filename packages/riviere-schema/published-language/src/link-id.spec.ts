import { LinkId } from './published-language/link-id'

describe('LinkId', () => {
  it('uses source and target when source location is absent', () => {
    expect(LinkId.parseFromLink({ source: 'source', target: 'target' }).toString()).toBe(
      'source->target',
    )
  })

  it('adds file path when line and column are absent', () => {
    expect(
      LinkId.parseFromLink({
        source: 'source',
        target: 'target',
        sourceLocation: { repository: 'repo', filePath: 'src/file.ts' },
      }).toString(),
    ).toBe('source->target@src/file.ts')
  })

  it('adds an empty line segment when only column is present', () => {
    expect(
      LinkId.parseFromLink({
        source: 'source',
        target: 'target',
        sourceLocation: {
          repository: 'repo',
          filePath: 'src/file.ts',
          columnNumber: 5,
        },
      }).toString(),
    ).toBe('source->target@src/file.ts::5')
  })

  it('adds line when column is absent', () => {
    expect(
      LinkId.parseFromLink({
        source: 'source',
        target: 'target',
        sourceLocation: { repository: 'repo', filePath: 'src/file.ts', lineNumber: 12 },
      }).toString(),
    ).toBe('source->target@src/file.ts:12')
  })

  it('adds line and column when both are present', () => {
    expect(
      LinkId.parseFromLink({
        source: 'source',
        target: 'target',
        sourceLocation: {
          repository: 'repo',
          filePath: 'src/file.ts',
          lineNumber: 12,
          columnNumber: 5,
        },
      }).toString(),
    ).toBe('source->target@src/file.ts:12:5')
  })

  it('escapes identity delimiters so distinct occurrences cannot collide', () => {
    const targetContainingLocation = LinkId.parseFromLink({
      source: 'source',
      target: 'target@src/file.ts:12:5',
    }).toString()
    const targetAtLocation = LinkId.parseFromLink({
      source: 'source',
      target: 'target',
      sourceLocation: {
        repository: 'repo',
        filePath: 'src/file.ts',
        lineNumber: 12,
        columnNumber: 5,
      },
    }).toString()
    const sourceContainingArrow = LinkId.parseFromLink({
      source: 'source->target',
      target: 'target',
    }).toString()

    expect(targetContainingLocation).toBe('source->target%40src/file.ts:12:5')
    expect(targetContainingLocation).not.toBe(targetAtLocation)
    expect(sourceContainingArrow).toBe('source%2D%3Etarget->target')
  })

  it('escapes file-path delimiters so line and column segments remain distinct', () => {
    const colonInFilePath = LinkId.parseFromLink({
      source: 'source',
      target: 'target',
      sourceLocation: {
        repository: 'repo',
        filePath: 'src/file.ts:12',
        lineNumber: 5,
      },
    }).toString()
    const lineAndColumn = LinkId.parseFromLink({
      source: 'source',
      target: 'target',
      sourceLocation: {
        repository: 'repo',
        filePath: 'src/file.ts',
        lineNumber: 12,
        columnNumber: 5,
      },
    }).toString()

    expect(colonInFilePath).toBe('source->target@src/file.ts%3A12:5')
    expect(colonInFilePath).not.toBe(lineAndColumn)
  })

  it('does not include repository in the link identity', () => {
    const first = LinkId.parseFromLink({
      source: 'source',
      target: 'target',
      sourceLocation: {
        repository: 'repo-a',
        filePath: 'src/file.ts',
        lineNumber: 12,
        columnNumber: 5,
      },
    }).toString()
    const second = LinkId.parseFromLink({
      source: 'source',
      target: 'target',
      sourceLocation: {
        repository: 'repo-b',
        filePath: 'src/file.ts',
        lineNumber: 12,
        columnNumber: 5,
      },
    }).toString()

    expect(first).toBe(second)
  })
})
