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

## Step 2: build each issue body in this order

Always include these header lines first:

1. `**Milestone:** <Delivery plan title> — M<x> (D<x.x>)`
2. `**PRD:** <file path and section refs>`
3. `**Architecture:** <file path and section refs>`
4. `**Delivery plan:** <file path and deliverable refs>`

Then include these mandatory sections in this exact relative order:

1. `## What this ticket is about`
2. `## What "done" looks like`
3. `## Implementation guidelines`
4. `## How to verify`
5. `## Out of scope`

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

### What "done" looks like

Populate from the selected delivery deliverable's acceptance criteria and any linked PRD success conditions.

Every bullet must be observable and checkable at ticket close.

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

Architecture consequences stay here in the lower implementation-guidance area.
They do not move to the top of the issue.

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

| Proposed Element | Kind | Role | Sublocation | Confidence | Notes |
|------------------|------|------|-------------|------------|-------|
| `FooUseCase` | class | `command-use-case` | `src/features/foo/commands/` | HIGH | Single public method `apply(...)`; input `FooInput` → result `FooResult`. |

### Gaps — Proposed Code With No Fitting Role

If no gaps: state "No gaps — all proposed elements fit existing roles."

### Structural Concerns

If none: state "No structural concerns identified."

### Reminders for the Implementer

- This annex is directional. The plan will evolve during TDD — role assignments may change as code takes shape.
- Re-consult `.riviere/role-enforcement.config.ts`, `.riviere/roles.ts`, and `.riviere/canonical-role-configurations.md` as proposed elements materialize.
- Any proposed new role must be approved by the user before being added to `.riviere/roles.ts`. Same for any new aggregate — must be added to `approvedInstances` with `userHasApproved: true`.
- Role enforcement is automatically verified at lint time (`pnpm nx lint <package>` or the project-wide role-check task). Treat the oxlint result as the final arbiter, not this annex.
- If a proposed element turns out to need a role that does not exist, stop and get user approval before inventing one.
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
