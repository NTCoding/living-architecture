# task-creation

Create GitHub issues directly from the approved PRD, approved architecture document, and approved delivery plan.

## Inputs

Use:

- `prdPath`
- `architecturePath`
- `deliveryPath`
- `githubMilestone`

## Required starting condition

The PRD, architecture document, and delivery plan must all contain:

```text
**Status:** Approved
```

If any artefact is not approved, block task creation.

## Step 1: select deliverables

Read the approved delivery plan and identify the milestone deliverables that are ready for issue creation.

Create one GitHub issue per selected deliverable unless the approved delivery plan explicitly groups several deliverables into one issue.

The PRD provides product WHAT and WHY.
The architecture document provides technical HOW constraints and task consequences.
The delivery plan provides milestone and deliverable slicing.

## Refactoring and replacement hard-fail gate

When a task changes an existing implementation path, retires a concept, removes a component, migrates responsibilities, or replaces one model with another, it is a refactoring/replacement issue.

For refactoring/replacement issues, task creation must hard-fail if the issue would ask the implementer to make a major design decision that is not explicitly answered by the approved architecture and captured as acceptance criteria.

Major design decisions are not ad-hoc implementation work. If the approved PRD, architecture, or delivery plan does not answer the decision, block task creation and return to the relevant planning stage. Do not turn the missing design into implicit implementation work.

Hard-fail examples:

- The old path is removed but the replacement path is not named.
- A task asks for application state to be used but does not say how that state is loaded.
- A task asks to replace a repository, loader, aggregate, or persistence boundary without naming the approved replacement boundary and role.
- A task includes `const value = someNewThing(...)` but does not say where the constructor inputs come from.
- A task replaces `const oldState = oldRepository.load(...)` but does not show the exact approved replacement load call.
- A task relies on a new callable, component, role, repository, service, loader, materialiser, or persistence concept that is not explicitly approved.

Refactoring/replacement issue titles must name the actual change:

- Use `Replace X with Y` when something old is being replaced.
- Use `Remove X` only when the task is pure deletion and no replacement is needed.
- Do not use `Remove X` when existing behaviour must continue through a new path.
- `Y` must be a concrete approved replacement, not vague wording such as "new model", "stage materialisation", "service path", or "approved approach" unless the approved artefacts explicitly define the concrete code element and flow behind that phrase.

Refactoring/replacement issues must include:

1. **Current flow to replace** — concrete existing class/function/file flow, with code sample when source material exists.
2. **Expected end-state flow** — concrete approved replacement class/function/file flow, with code sample when architecture contains or implies one.
3. **State loading answer** — if application state is loaded or materialised, the issue must name the approved loading boundary, role, method/function call, inputs, output, and where each output field comes from.
4. **Replacement matrix** — every old public mode/path/behaviour maps to its approved replacement.
5. **Done criteria for both sides** — the new state exists and works, the old state is gone, and existing behaviours remain equivalent where required.
6. **Design adherence guardrail** — if implementation reveals the approved design is wrong or incomplete, stop and discuss with the user; do not implement a different design without approval.

## Step 2: build each issue body in this order

Always include these header lines first:

1. `**Milestone:** <Delivery plan title> — M<x> (D<x.x>)`
2. `**PRD:** <file path and section refs>`
3. `**Architecture:** <file path and section refs>`
4. `**Delivery plan:** <file path and deliverable refs>`

Then include these mandatory sections in this exact relative order:

1. `## What this ticket is about`
2. `## Current and expected end state` for refactoring/replacement issues only
3. `## What "done" looks like`
4. `## Implementation guidelines`
5. `## How to verify`
6. `## Out of scope`

Include these optional sections only when there is concrete source material for them. If included, preserve this relative order around the mandatory sections:

1. `## Edge cases` after `## What "done" looks like`
2. `## Testing strategy` after `## Implementation guidelines`
3. `## Dependencies` after `## Testing strategy`, or after `## Implementation guidelines` when no testing strategy is included
4. `## Glossary` at the end of the main issue body, before the architectural annex

## Step 3: populate the sections with these exact rules

### What this ticket is about

Populate from:

- the selected delivery deliverable
- the approved PRD sections referenced by that deliverable

This section must:

- teach the subject in plain English
- explain the current behavior or gap
- explain why the work matters
- include concrete examples already present in the approved PRD or approved delivery plan

For refactoring/replacement issues, this section must say that the work replaces the old path with the approved new path. It must not describe the task as simple removal when existing behaviour must continue through a replacement path.

### Current and expected end state

Use this section for refactoring/replacement issues.

Populate from:

- the selected delivery deliverable
- the approved architecture document
- relevant code samples already present in the approved architecture document

This section must include:

- the current flow to replace, naming concrete existing classes/functions/files
- the expected end-state flow, naming concrete approved replacement classes/functions/files
- relevant code samples from approved architecture or approved planning artefacts
- an expected end-state code sample when architecture contains enough concrete information to write one
- the state-loading answer when application state is loaded or materialised

The state-loading answer must name:

- the approved loading boundary
- the approved role of that boundary
- the method/function call the implementer should use or create
- the exact replacement line/call when an old loading call is being replaced
- the inputs to that call
- the output from that call
- where each output field comes from

If this cannot be populated from approved artefacts, block task creation. Do not invent the missing code shape in the issue.

### What "done" looks like

Populate from the selected delivery deliverable's acceptance criteria and any linked PRD success conditions.

Every bullet must be observable and checkable at ticket close.

For refactoring/replacement issues, acceptance criteria must include both replacement outcomes and removal outcomes. Do not list only what disappears. Acceptance criteria must explicitly state:

- the approved new path exists and works
- the old path no longer exists, when removal is part of the approved plan
- each old public mode/path/behaviour still works or is explicitly out of scope
- any major design decision that would otherwise be left to implementation

Do not write summary phrases such as:

- supports X
- handles Y
- per the PRD
- as specified

### Edge cases

Populate only from explicit edge cases already written in:

- the approved PRD
- the approved solution exploration's product paths if referenced by the PRD
- the selected delivery deliverable

Write each one as:

- `<condition> -> <expected behavior>`

If the selected deliverable does not name any edge cases, omit this section.

### Implementation guidelines

Populate from:

- the selected delivery deliverable
- the approved architecture document

This section must contain:

- where the code lives
- public surface
- firm constraints from the PRD and approved architecture
- flexible decisions
- role enforcement guidance
- for refactoring/replacement issues, the concrete replacement sequence, not only deletion instructions

Architecture consequences stay here in the lower implementation-guidance area.
They do not move to the top of the issue.

Implementation guidelines must never ask the implementer to choose the approved design implicitly. If a design choice remains, it must either be an explicit acceptance criterion for this task or a blocker that sends the work back to planning.

### Testing strategy

Populate only from explicit testing material already present in:

- the selected delivery deliverable's explicit verification notes
- the selected delivery deliverable's explicit edge cases
- the approved PRD's explicit success criteria
- the approved architecture document's explicit task consequences

Use these subsections only when the source material requires them and provides concrete content:

- `### Unit`
- `### Integration`
- `### Edge cases`

Do not invent testing heuristics.
Do not add blank testing subsections.
If a subsection has no concrete source material, omit it.

### Dependencies

Populate from:

- explicit dependencies in the selected delivery deliverable
- blocking GitHub issues already known
- explicit dependency order in the approved delivery plan

If there are no dependencies, omit this section.

### How to verify

Populate from explicit verification commands and pass conditions already named in the selected delivery deliverable or approved architecture document.

The commands must be written exactly.

If no command is known but a manual verification condition is named, include the manual condition.

### Out of scope

Populate from:

- PRD non-goals
- solution-exploration no-gos referenced by the PRD
- explicit exclusions attached to the selected delivery deliverable

### Glossary

Populate from capitalized domain terms used in the issue body.
Define them inline if needed.

## Step 4: append the architectural annex

After the main issue body, append this exact annex structure:

```markdown
## Architectural Annex

> Directional only — the plan will evolve during TDD. Re-consult `.riviere/role-enforcement.config.ts` as the code takes shape. Role enforcement is verified by oxlint at lint time; this annex surfaces architectural decisions upfront so they do not ambush the implementer mid-build.

### Affected Enforced Packages

| Package | Feature(s) | Relevant Sublocations |
|---------|------------|-----------------------|
| `packages/<name>` | `<feature>` | `src/features/<feature>/commands/`, `src/features/<feature>/domain/`, ... |

### Applicable Canonical Configuration

**Pattern:** <name from `.riviere/canonical-role-configurations.md`, or "None — new pattern">

### Proposed Roles and Locations

These roles and locations must be the agreed design from the approved architecture. If implementation reveals design issues that challenge the agreed design, the implementer must stop and discuss with the user. Do not implement a different design without approval.

| Proposed Element | Kind | Role | Sublocation | Confidence | Notes |
|------------------|------|------|-------------|------------|-------|
| `FooUseCase` | class | `command-use-case` | `src/features/foo/commands/` | HIGH | Single public method `apply(...)`; input `FooInput` → result `FooResult`. |

### Gaps — Proposed Code With No Fitting Role

If no gaps: state "No gaps — all proposed elements fit existing roles."

### Structural Concerns

If none: state "No structural concerns identified."

For refactoring/replacement issues, explicitly include any forbidden replacement concepts and the approved replacement concept. Do not only say what not to invent; also say what approved concept is used instead. If the approved replacement concept is not known, block task creation.

### Reminders for the Implementer

- This annex is directional. The plan will evolve during TDD — role assignments may change as code takes shape.
- Re-consult `.riviere/role-enforcement.config.ts`, `.riviere/roles.ts`, and `.riviere/canonical-role-configurations.md` as proposed elements materialize.
- Any proposed new role must be approved by the user before being added to `.riviere/roles.ts`. Same for any new aggregate — must be added to `approvedInstances` with `userHasApproved: true`.
- Role enforcement is automatically verified at lint time (`pnpm nx lint <package>` or the project-wide role-check task). Treat the oxlint result as the final arbiter, not this annex.
- If a proposed element turns out to need a role that does not exist, stop and get user approval before inventing one.
- If implementation reveals the approved design is incomplete or wrong, stop and discuss with the user. Do not fill the gap by inventing an alternative design during implementation.
```

## Step 5: ensure GitHub milestone and label exist

Before creating issues, ensure both of these exist in GitHub:

- milestone title: `<githubMilestone>`
- label name: `prd:<githubMilestone>`

When running commands that need GitHub access, first run `gh auth token` to get the token value, then use it as `GITHUB_TOKEN=<token>` inline in each command.

Use `gh repo view` and `gh api` to check whether the milestone exists. If it does not exist, create it.

Example command shape:

```bash
GITHUB_TOKEN=<token> gh repo view --json owner,name
GITHUB_TOKEN=<token> gh api "repos/<owner>/<repo>/milestones?state=all"
GITHUB_TOKEN=<token> gh api -X POST "repos/<owner>/<repo>/milestones" -f title="<githubMilestone>"
```

Use `gh label list` to check whether the exact label exists. If it does not exist, create it.

Example command shape:

```bash
GITHUB_TOKEN=<token> gh label list --search "prd:<githubMilestone>" --json name --jq '.[] | select(.name == "prd:<githubMilestone>") | .name'
GITHUB_TOKEN=<token> gh label create "prd:<githubMilestone>" --description "Tasks for <githubMilestone>" --color "5319e7"
```

If GitHub authentication, repository resolution, milestone creation, or label creation fails, block task creation with the specific failure.

## Step 6: create each issue on GitHub

For each selected deliverable, create the issue with:

- title
- full issue body
- milestone = `<githubMilestone>`
- label = `prd:<githubMilestone>`

Use:

```bash
GITHUB_TOKEN=<token> ./scripts/create-task.sh <milestone> <title> <body>
```

## Step 7: blocking rule

Block task creation if any of these are true:

1. the approved PRD does not contain enough concrete product material to populate the required sections above
2. the approved architecture document does not contain explicit task consequences that can be carried into the generated issue
3. the approved delivery plan does not contain concrete deliverables, acceptance criteria, source refs, and verification notes where known
4. the selected deliverable depends on unresolved product, architecture, or delivery blockers
5. the selected deliverable asks the implementer to make a major design decision that is not an explicit acceptance criterion
6. a refactoring/replacement issue does not show the current flow and expected end-state flow
7. a refactoring/replacement issue removes an existing state-loading or persistence path without naming the approved replacement loading boundary, role, call, inputs, output, and data origins
8. a refactoring/replacement issue title says `Remove X` when the real work is replacing `X` with `Y`
9. relevant code samples exist in the approved architecture but the issue omits the expected end-state code sample
10. an old state-loading call is being replaced but the issue does not show the exact approved replacement line/call

If blocked, the current planning command must produce:

```text
BLOCK
- <task creation blocker>
- <task creation blocker>
```

## Step 8: completion rule

This stage is complete only when all intended GitHub issues have been created successfully and all issue numbers are known.

If complete, the current planning command must produce:

```text
COMPLETE
- <created issue number>
- <created issue number>
```
