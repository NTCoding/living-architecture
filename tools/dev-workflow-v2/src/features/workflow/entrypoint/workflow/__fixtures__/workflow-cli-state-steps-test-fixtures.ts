export const CREATE_PR_COMMAND = [
  'create-pr',
  '--title',
  'Fixture change',
  '--description',
  'A'.repeat(120),
  '--problem',
  'Fixture problem',
  '--acceptance-criteria',
  'Fixture criteria',
  '--key-changes',
  'Fixture changes',
  '--architecture-impact',
  'None',
  '--validation',
  'pnpm verify',
  '--notes',
  'None',
] as const

const VERIFYING_STEPS = [
  ['record-issue', '1'],
  ['record-branch', 'feat/test'],
  ['transition', 'VERIFYING'],
] as const
const SUBMITTING_PR_STEPS = [
  ...VERIFYING_STEPS,
  ['verify-local'],
  ['transition', 'SUBMITTING_PR'],
] as const
const REVIEWING_STEPS = [
  ...SUBMITTING_PR_STEPS,
  CREATE_PR_COMMAND,
  ['transition', 'REVIEWING'],
] as const
const ADDRESSING_FEEDBACK_STEPS = [
  ...REVIEWING_STEPS,
  ['set-pr-feedback', 'actionable'],
  ['verify-pr-review-gate'],
] as const
const REFLECTING_STEPS = [
  ...REVIEWING_STEPS,
  ['seed-reviewer-satisfaction'],
  ['sync-reviewer-satisfaction'],
  ['set-pr-feedback', 'clean'],
  ['verify-pr-review-gate'],
] as const

export const STATE_STEPS: Readonly<Record<string, readonly (readonly string[])[]>> = {
  VERIFYING: VERIFYING_STEPS,
  REVIEWING: REVIEWING_STEPS,
  SUBMITTING_PR: SUBMITTING_PR_STEPS,
  ADDRESSING_FEEDBACK: ADDRESSING_FEEDBACK_STEPS,
  REFLECTING: REFLECTING_STEPS,
}
