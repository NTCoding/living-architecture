# IMPLEMENTING State

You are implementing the task. Write code, commit often.

## TODO

- [ ] Read the task requirements (GitHub issue body, referenced PRD sections, architecture docs)
- [ ] Create a plan and get user approval before writing code
- [ ] If no GitHub issue is recorded yet: `/dev-workflow-v2:workflow record-issue <ISSUE_NUMBER>`
- [ ] If no feature branch is recorded yet: `/dev-workflow-v2:workflow record-branch "<branch-name>"`
- [ ] Before planning or coding, read `docs/conventions/software-design.md`, `docs/conventions/standard-patterns.md`, `docs/conventions/anti-patterns.md`, `docs/conventions/testing.md`, `docs/architecture/adr/ADR-002-allowed-folder-structures.md`, `.riviere/role-enforcement.config.ts`, `.riviere/role-selection-guide.md`, and every relevant role definition.
- [ ] In the implementation plan, justify every new or changed `domain-service`: first explain why the behaviour is not owned by an aggregate, then why it is not owned by a value object.
- [ ] Implement the task following project conventions.
- [ ] Write tests — 100% coverage is mandatory
- [ ] Commit your changes (working tree must be clean before transitioning)
- [ ] Transition to SUBMITTING_PR: `/dev-workflow-v2:workflow transition SUBMITTING_PR`

## Pre-review self-check (mandatory)

Before transitioning to `SUBMITTING_PR`, audit your own diff against the rules the reviewers enforce. This is a self-check, not a second review.

- Re-read `docs/conventions/software-design.md`, `docs/conventions/standard-patterns.md`, `docs/conventions/anti-patterns.md`, `docs/conventions/testing.md`, and `docs/conventions/review-feedback-checks.md`.
- Walk the diff and confirm every changed declaration obeys the applicable `SD-*`, `AP-*`, `TS-*`, and `RFC-*` rules. Fix any violation before transitioning.
- Check names against `SD-005`: no `data`, `utils`, `helpers`, `common`, `shared`, `manager`, `handler`, or `processor` where a domain word exists.
- Check for duplicated code (`SD-023`), illegal states (`SD-003`), and forbidden fallbacks (`SD-001`).
- Run the repository checks for the projects you changed, for example `pnpm nx run-many -t lint typecheck test -p <project>`, and `pnpm nx run @living-architecture/source:role-check` where roles apply.
- Confirm the working tree is clean and every change is committed.

Do not transition to `SUBMITTING_PR` while any known rule violation remains in the diff. If a rule cannot be satisfied, transition to `BLOCKED` and explain why.

## Constraints

- You must have commits beyond the default branch before transitioning — the guard enforces this
- Working tree must be clean (all changes committed) before transitioning — the guard enforces this
- A GitHub issue must be recorded before transitioning — the guard enforces this
- All review flags (architectureReviewPassed, codeReviewPassed, bugScannerPassed, ciPassed, feedbackClean, feedbackAddressed) reset on entry to this state
- `git push` and `gh pr` are blocked in this state — use the workflow commands
- If you are blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
