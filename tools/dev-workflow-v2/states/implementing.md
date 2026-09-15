# IMPLEMENTING State

## Required response prefix

Every response in this state must begin with `🔨 IMPLEMENTING`. It must be the first thing in the response. Do not place whitespace, Markdown, a heading, an explanation, or any other text before it. The workflow engine rejects tool use until it has received this exact state prefix.

When the engine asks for the prefix, send `🔨 IMPLEMENTING` as the complete response, then continue with the current procedure.

## Silent execution

After the user has approved the implementation plan, work silently. Do not send progress updates, implementation commentary, or summaries while completing the task.

Respond only when the user sends a new message that requires an answer, when approval is required before writing code, or when blocked. Every permitted response must still begin with `🔨 IMPLEMENTING`.

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
- [ ] Transition to REVIEWING: `/dev-workflow-v2:workflow transition REVIEWING`

## Pre-review self-check (mandatory)

Before transitioning to `REVIEWING`, audit your own diff against the rules the reviewers enforce. This is a self-check, not a second review.

- Re-read `docs/conventions/software-design.md`, `docs/conventions/standard-patterns.md`, `docs/conventions/anti-patterns.md`, `docs/conventions/testing.md`, and `docs/conventions/review-feedback-checks.md`.
- Walk the diff and confirm every changed declaration obeys the applicable `SD-*`, `AP-*`, `TS-*`, and `RFC-*` rules. Fix any violation before transitioning.
- Check names against `SD-005`: no `data`, `utils`, `helpers`, `common`, `shared`, `manager`, `handler`, or `processor` where a domain word exists.
- Check for duplicated code (`SD-023`), illegal states (`SD-003`), and forbidden fallbacks (`SD-001`).
- Run the repository checks for the projects you changed, for example `pnpm nx run-many -t lint typecheck test -p <project>`, and `pnpm nx run @living-architecture/source:role-check` where roles apply.
- Confirm the working tree is clean and every change is committed.

Do not transition to `REVIEWING` while any known rule violation remains in the diff. If a rule cannot be satisfied, transition to `BLOCKED` and explain why.

## Constraints

- You must have commits beyond the default branch before transitioning — the guard enforces this
- Working tree must be clean (all changes committed) before transitioning — the guard enforces this
- A GitHub issue must be recorded before transitioning — the guard enforces this
- All review flags (architectureReviewPassed, codeReviewPassed, bugScannerPassed, ciPassed, feedbackClean, feedbackAddressed) reset on entry to this state
- `git push` and `gh pr` are blocked in this state — use the workflow commands
- If you are blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
