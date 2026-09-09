export const STATE_STEPS: Readonly<Record<string, readonly (readonly string[])[]>> = {
  REVIEWING: [
    ['record-issue', '1'],
    ['record-branch', 'feat/test'],
    ['transition', 'SUBMITTING_PR'],
    ['transition', 'REVIEWING'],
  ],
  SUBMITTING_PR: [
    ['record-issue', '1'],
    ['record-branch', 'feat/test'],
    ['transition', 'SUBMITTING_PR'],
  ],
  ADDRESSING_FEEDBACK: [
    ['record-issue', '1'],
    ['record-branch', 'feat/test'],
    ['transition', 'SUBMITTING_PR'],
    ['transition', 'REVIEWING'],
  ],
}
