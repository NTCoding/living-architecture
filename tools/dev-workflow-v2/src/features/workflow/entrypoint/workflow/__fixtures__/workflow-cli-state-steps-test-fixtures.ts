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
const AWAITING_CI_STEPS = [
  ...REVIEWING_STEPS,
  ['record-review', 'architecture-review', 'PASS'],
  ['record-review', 'code-review', 'PASS'],
  ['record-review', 'bug-scanner', 'PASS'],
  ['record-review', 'task-check', 'PASS'],
  ['transition', 'SUBMITTING_PR'],
  ['record-pr', '1'],
  ['transition', 'AWAITING_CI'],
] as const
const AWAITING_FEEDBACK_STEPS = [
  ...AWAITING_CI_STEPS,
  ['record-ci-passed'],
  ['transition', 'AWAITING_PR_FEEDBACK'],
] as const

export const STATE_STEPS: Readonly<Record<string, readonly (readonly string[])[]>> = {
  VERIFYING: VERIFYING_STEPS,
  REVIEWING: REVIEWING_STEPS,
  SUBMITTING_PR: SUBMITTING_PR_STEPS,
  AWAITING_CI: AWAITING_CI_STEPS,
  AWAITING_PR_FEEDBACK: AWAITING_FEEDBACK_STEPS,
  ADDRESSING_FEEDBACK: AWAITING_FEEDBACK_STEPS,
  REFLECTING: AWAITING_FEEDBACK_STEPS,
}
