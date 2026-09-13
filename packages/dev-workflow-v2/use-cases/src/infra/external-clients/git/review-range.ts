import { execFileSync } from 'node:child_process'

class InvalidReviewRangeError extends Error {}

/** @riviere-role external-client-service */
export function createReviewRangeReader(
  executeGit: (argumentsList: readonly string[]) => string = (argumentsList) =>
    execFileSync('/usr/bin/git', argumentsList, { encoding: 'utf8' }).trim(),
): (baseRef: string, headCommit: string, previousReviewedCommit: string | undefined) => string {
  return (baseRef, headCommit, previousReviewedCommit) => {
    const rangeBase =
      previousReviewedCommit ?? executeGit(['merge-base', `origin/${baseRef}`, headCommit])
    const ancestorResult = executeGit(['merge-base', '--is-ancestor', rangeBase, headCommit])
    if (ancestorResult !== '') {
      throw new InvalidReviewRangeError(
        `Review range base ${rangeBase} is not an ancestor of ${headCommit}.`,
      )
    }
    return `${rangeBase}..${headCommit}`
  }
}
