import type { PathMatcher } from '../domain/role-enforcement-config'

export function normalizePath(input: string): string {
  return input.replaceAll('\\', '/')
}

function escapeRegexCharacter(character: string): string {
  return /[|\\{}()[\]^$+?.]/.test(character) ? `\\${character}` : character
}

function globPatternToRegexSource(pattern: string, index = 0): string {
  const currentCharacter = pattern[index]

  if (currentCharacter === undefined) {
    return ''
  }

  const nextCharacter = pattern[index + 1]
  const afterNextCharacter = pattern[index + 2]

  if (currentCharacter === '*' && nextCharacter === '*' && afterNextCharacter === '/') {
    return `(?:.*/)?${globPatternToRegexSource(pattern, index + 3)}`
  }

  if (currentCharacter === '*' && nextCharacter === '*') {
    return `.*${globPatternToRegexSource(pattern, index + 2)}`
  }

  if (currentCharacter === '*') {
    return `[^/]*${globPatternToRegexSource(pattern, index + 1)}`
  }

  if (currentCharacter === '?') {
    return `.${globPatternToRegexSource(pattern, index + 1)}`
  }

  return `${escapeRegexCharacter(currentCharacter)}${globPatternToRegexSource(pattern, index + 1)}`
}

function globPatternToRegExp(pattern: string): RegExp {
  const normalizedPattern = normalizePath(pattern)

  return new RegExp(`^${globPatternToRegexSource(normalizedPattern)}$`)
}

export function createPathMatcher(pattern: string): PathMatcher {
  const matcher = globPatternToRegExp(pattern)

  return (candidate: string): boolean => matcher.test(normalizePath(candidate))
}

export function matchesAnyPattern(matchers: readonly PathMatcher[], candidate: string): boolean {
  const normalizedCandidate = normalizePath(candidate)

  return matchers.some((match) => match(normalizedCandidate))
}
