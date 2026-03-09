# IMPLEMENTING State

You are implementing the task. Write code, commit often.

## TODO

- [ ] Read the task requirements (GitHub issue body, referenced PRD sections, architecture docs)
- [ ] Create a plan and get user approval before writing code
- [ ] If no GitHub issue is recorded yet: `/dev-workflow-v2:workflow record-issue <ISSUE_NUMBER>`
- [ ] If no feature branch is recorded yet: `/dev-workflow-v2:workflow record-branch "<branch-name>"`
- [ ] Implement the task following project conventions (`docs/conventions/software-design.md`, `docs/conventions/testing.md`)
- [ ] Before adding or moving any exported class or standalone function in an in-scope path, run `riviere-role-classifier` if the correct role or layer is not already obvious from nearby code
- [ ] Write tests — 100% coverage is mandatory
- [ ] Re-run deterministic role enforcement on changed in-scope files before leaving this state: `pnpm role-enforcement:check -- <changed-files>`
- [ ] Commit your changes (working tree must be clean before transitioning)
- [ ] Transition to REVIEWING: `/dev-workflow-v2:workflow transition REVIEWING`

## Constraints

- You must have commits beyond the default branch before transitioning — the guard enforces this
- Working tree must be clean (all changes committed) before transitioning — the guard enforces this
- A GitHub issue must be recorded before transitioning — the guard enforces this
- All review flags (architectureReviewPassed, codeReviewPassed, bugScannerPassed, ciPassed, feedbackClean, feedbackAddressed) reset on entry to this state
- Deterministic role-enforcement failures are fix-now issues, not optional cleanup
- `git push` and `gh pr` are blocked in this state — use the workflow commands
- If you are blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
