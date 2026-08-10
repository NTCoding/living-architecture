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

  it('escapes identity delimiters so distinct occurrences cannot collide', () => {
    const targetContainingLocation = createLinkId({
      source: 'source',
      target: 'target@src/file.ts:12:5',
    })
    const targetAtLocation = createLinkId({
      source: 'source',
      target: 'target',
      sourceLocation: {
        repository: 'repo',
        filePath: 'src/file.ts',
        lineNumber: 12,
        columnNumber: 5,
      },
    })
    const sourceContainingArrow = createLinkId({
      source: 'source->target',
      target: 'target',
    })

    expect(targetContainingLocation).toBe('source->target%40src/file.ts:12:5')
    expect(targetContainingLocation).not.toBe(targetAtLocation)
    expect(sourceContainingArrow).toBe('source%2D%3Etarget->target')
  })

  it('escapes file-path delimiters so line and column segments remain distinct', () => {
    const colonInFilePath = createLinkId({
      source: 'source',
      target: 'target',
      sourceLocation: {
        repository: 'repo',
        filePath: 'src/file.ts:12',
        lineNumber: 5,
      },
    })
    const lineAndColumn = createLinkId({
      source: 'source',
      target: 'target',
      sourceLocation: {
        repository: 'repo',
        filePath: 'src/file.ts',
        lineNumber: 12,
        columnNumber: 5,
      },
    })

    expect(colonInFilePath).toBe('source->target@src/file.ts%3A12:5')
    expect(colonInFilePath).not.toBe(lineAndColumn)
  })

  it('does not include repository in Link identity', () => {
    const identity = {
      source: 'source',
      target: 'target',
      sourceLocation: {
        repository: 'repo-a',
        filePath: 'src/file.ts',
        lineNumber: 12,
        columnNumber: 5,
      },
    }

    expect(createLinkId(identity)).toBe(
      createLinkId({
        ...identity,
        sourceLocation: {
          ...identity.sourceLocation,
          repository: 'repo-b',
        },
      }),
    )
  })
})
