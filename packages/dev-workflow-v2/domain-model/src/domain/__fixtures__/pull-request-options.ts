export const CREATE_PR_DESCRIPTION = 'A'.repeat(100)

export const CREATE_PR_OPTIONS = [
  '--title',
  'Add workflow create-pr',
  '--description',
  CREATE_PR_DESCRIPTION,
  '--problem',
  'Agents could create draft PRs directly.',
  '--acceptance-criteria',
  '- PR is ready for review\n- PR body follows the workflow structure',
  '--key-changes',
  '- Add structured create-pr command',
  '--architecture-impact',
  'Workflow owns PR body creation.',
  '--validation',
  '- pnpm test',
  '--notes',
  'None.',
] as const
