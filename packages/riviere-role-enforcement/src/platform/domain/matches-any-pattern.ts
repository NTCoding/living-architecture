import type { PathMatcher } from './role-enforcement-config'

/** @riviere-role domain-service */
export function matchesAnyPattern(matchers: readonly PathMatcher[], candidate: string): boolean {
  return matchers.some((match) => match(candidate))
}
