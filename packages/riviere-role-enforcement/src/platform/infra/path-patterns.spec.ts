import {
  createPathMatcher, matchesAnyPattern, normalizePath 
} from './path-patterns'

describe('path-patterns', () => {
  it('normalizes windows separators', () => {
    expect(normalizePath('packages\\demo\\src\\shell\\cli.ts')).toBe(
      'packages/demo/src/shell/cli.ts',
    )
  })

  it('matches recursive, single-segment, and single-character patterns', () => {
    const recursiveMatcher = createPathMatcher('packages/**/cli.ts')
    const singleSegmentMatcher = createPathMatcher('packages/*/src/*.ts')
    const singleCharacterMatcher = createPathMatcher('docs/role-?.md')

    expect({
      recursive: recursiveMatcher('packages/demo/src/shell/cli.ts'),
      singleSegmentMatch: singleSegmentMatcher('packages/demo/src/main.ts'),
      singleSegmentMiss: singleSegmentMatcher('packages/demo/src/nested/main.ts'),
      singleCharacterMatch: singleCharacterMatcher('docs/role-a.md'),
      singleCharacterMiss: singleCharacterMatcher('docs/role-ab.md'),
    }).toStrictEqual({
      recursive: true,
      singleSegmentMatch: true,
      singleSegmentMiss: false,
      singleCharacterMatch: true,
      singleCharacterMiss: false,
    })
  })

  it('matches double-star suffixes and escapes regex characters', () => {
    const matcher = createPathMatcher('docs/v1.0/**')

    expect(matcher('docs/v1.0/guide/setup.md')).toBe(true)
    expect(matcher('docs/v1x0/guide/setup.md')).toBe(false)
  })

  it('returns whether any matcher accepts the candidate path', () => {
    const matchers = [
      createPathMatcher('packages/*/src/**/*.ts'),
      createPathMatcher('tools/**/README.md'),
    ]

    expect(matchesAnyPattern(matchers, 'packages/demo/src/shell/cli.ts')).toBe(true)
    expect(matchesAnyPattern(matchers, 'apps/docs/src/main.ts')).toBe(false)
  })
})
