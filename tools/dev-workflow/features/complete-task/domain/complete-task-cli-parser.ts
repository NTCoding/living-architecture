import { z } from 'zod'
import { WorkflowError } from '../../../platform/domain/workflow-execution/workflow-runner'
import {
  prModeSchema, type PRMode 
} from './task-to-complete'

export interface CliReader {
  requireArg: (flag: string) => string
  hasFlag: (flag: string) => boolean
}

function sanitizeBranchNameForPath(branch: string): string {
  return branch.replaceAll(/[^a-zA-Z0-9_-]/g, '_')
}

export function buildReviewDir(branch: string): string {
  const safeBranch = sanitizeBranchNameForPath(branch)
  return `reviews/${safeBranch}`
}

const nonNegativeIntSchema = z.coerce.number().int().nonnegative()

export function parsePRMode(cliReader: CliReader): PRMode {
  const raw = cliReader.requireArg('--prmode')
  const parsed = prModeSchema.safeParse(raw)
  if (!parsed.success) {
    throw new WorkflowError(`--prmode must be 'create' or 'update', got '${raw}'`)
  }
  return parsed.data
}

export function parseNumberArg(cliReader: CliReader, flag: string): number {
  const raw = cliReader.requireArg(flag)
  const parsed = nonNegativeIntSchema.safeParse(raw)
  if (!parsed.success) {
    throw new WorkflowError(`${flag} must be a non-negative integer, got '${raw}'`)
  }
  return parsed.data
}

export function validateCreateMode(existingPrNumber: number | undefined): void {
  if (existingPrNumber !== undefined) {
    throw new WorkflowError(
      `PR #${existingPrNumber} already exists for this branch. Use --prmode update instead.`,
    )
  }
}

export function validateUpdateMode(
  existingPrNumber: number | undefined,
  feedbackItemsRemaining: number,
): void {
  if (existingPrNumber === undefined) {
    throw new WorkflowError('No PR exists for this branch. Use --prmode create instead.')
  }
  if (feedbackItemsRemaining > 0) {
    throw new WorkflowError(
      `${feedbackItemsRemaining} feedback items remaining. ` +
        'Fix ALL feedback items before re-submitting to avoid expensive round-trip costs (10min CI + review cycle).',
    )
  }
}

export function resolveSkipReview(cliReader: CliReader): boolean {
  const hasFlag = cliReader.hasFlag('--reject-review-feedback')
  if (!hasFlag) {
    return false
  }
  const prMode = parsePRMode(cliReader)
  if (prMode !== 'update') {
    throw new WorkflowError('--reject-review-feedback can only be used with --prmode update')
  }
  return true
}
