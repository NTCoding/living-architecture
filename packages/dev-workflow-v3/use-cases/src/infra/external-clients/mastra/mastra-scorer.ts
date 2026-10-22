import { createScorer } from '@mastra/core/evals'
import type { MastraScorers } from '@mastra/core/evals'

/** @riviere-role external-client-model */
export interface MastraScorerDeclaration {
  readonly id: string
  readonly description: string
  readonly rate: number
  readonly score: (judged: { readonly data: unknown; readonly outcome: unknown }) => number
}

/**
 * @riviere-role external-client-service
 */
export function createMastraScorers(declaration: MastraScorerDeclaration): MastraScorers {
  return {
    [declaration.id]: {
      scorer: createScorer<unknown, unknown, string>({
        id: declaration.id,
        description: declaration.description,
      }).generateScore(({ run }) => declaration.score({ data: run.input, outcome: run.output })),
      sampling: { type: 'ratio', rate: declaration.rate },
    },
  }
}
