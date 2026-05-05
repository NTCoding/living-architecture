# task-creation

Create GitHub issues directly from the approved PRD, approved architecture document, and approved delivery plan.

## Inputs

Use:

- `problemDefinitionPath`
- `prdPath`
- `architecturePath`
- `deliveryPath`
- `githubMilestone`

Also use these sources when populating implementation guidance:

- `docs/conventions/software-design.md`
- `docs/conventions/testing.md`
- relevant architecture memories under `projectMemoryArchitectureMemoriesPath`, following the project-memory architecture instructions before using them

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

1. **Current flow to replace** — concrete existing class/function/file flow in `## Agreed target architecture and design`, with code/config/flow samples when source material exists.
2. **Target replacement flow** — concrete approved replacement class/function/file flow in `## Agreed target architecture and design`, with all necessary code/config/flow samples from the approved architecture.
3. **State loading answer** — if application state is loaded or materialised, the issue must name the approved loading boundary, role, method/function call, inputs, output, and where each output field comes from.
4. **Replacement matrix** — every old public mode/path/behaviour maps to its approved replacement.
5. **Done criteria for both sides** — in `## What "done" looks like`, the new state exists and works, the old state is gone, and existing behaviours remain equivalent where required.
6. **Design adherence guardrail** — if implementation reveals the approved design is wrong or incomplete, stop and discuss with the user; do not implement a different design without approval.

## Step 2: build each issue body in this order

Always include these header lines first:

1. `**Milestone:** <Delivery plan title> — M<x> (D<x.x>)`
2. `**PRD:** <file path and section refs>`
3. `**Architecture:** <file path and section refs>`
4. `**Delivery plan:** <file path and deliverable refs>`

Then include these mandatory sections in this exact relative order:

1. `## Problem`
2. `## Solution`
3. `## Agreed target architecture and design`
4. `## What "done" looks like`
5. `## Implementation guidelines`
6. `## How to verify`
7. `## Things this ticket must not do`

Include these optional sections only when there is concrete source material for them. If included, preserve this relative order around the mandatory sections:

1. `## Dependencies` after `## Implementation guidelines`
2. `## Glossary` at the end of the main issue body, before the architectural annex

## Step 3: populate the sections with these exact rules

### Problem

Populate from:

- the approved problem definition
- the selected delivery deliverable
- the approved PRD sections referenced by that deliverable

This section must:

- quote the relevant PRD/problem-statement text verbatim
- explain the specific problem slice this ticket covers
- explain the current workflow or failure mode using concrete details from the PRD or problem definition
- explain the impact using numbers, examples, affected users, or named consequences from the PRD or problem definition
- explain why this slice matters in the wider delivery sequence

Do not use vague claims like "slow", "inconsistent", "unreliable", or "hard to repeat" unless the approved PRD/problem definition explains what that means. If the approved artefacts do not contain enough concrete problem detail to write this section, block task creation rather than padding with generic wording.

Do not describe the implementation solution here.

### Solution

Populate from:

- the selected delivery deliverable
- the approved PRD sections referenced by that deliverable

This section must describe the approved product or behavioural solution slice for this ticket.

This section must:

- explain what capability, behaviour, workflow step, or user/system outcome this ticket contributes
- explain how this ticket fits with the surrounding deliverables or wider approved solution
- explain the boundary between this ticket and neighbouring work where that boundary matters
- stay source-backed by the approved PRD, solution exploration where referenced by the PRD, and delivery plan

Do not describe detailed technical architecture, code, config, or runtime flow here. That belongs in `## Agreed target architecture and design`.

Do not list acceptance criteria here. Those belong in `## What "done" looks like`.

### Agreed target architecture and design

Populate from:

- the approved architecture document
- the selected delivery deliverable
- relevant approved architecture memories when they apply

The purpose of this section is to ensure that agreed-upon target architecture and design is implemented as described, or challenged if new insights emerge that make it impractical or sub-optimal.

This section must tell the implementer to read `ARCH.md` for the full approved architecture context and scope. The issue must not be treated as a replacement for `ARCH.md`.

This section should include all of the target architecture and design decisions that should be implemented in this ticket. In addition, it should include related parts of the design that help to guide or shape the implementation of this ticket, such as previously implemented parts, parts that will be implemented next, or fundamental model changes that are driving this change.

Copy across all code samples from `ARCH.md` that are necessary to ensure the target architecture is implemented as defined. If you are unsure, it is better to include more.

For refactoring/replacement issues, this section must include:

- the current flow to replace, naming concrete existing classes/functions/files
- the target replacement flow, naming concrete approved replacement classes/functions/files
- a replacement matrix mapping every old public mode/path/behaviour to its approved replacement
- the state-loading answer when application state is loaded or materialised

The state-loading answer must name:

- the approved loading boundary
- the approved role of that boundary
- the method/function call the implementer should use or create
- the exact replacement line/call when an old loading call is being replaced
- the inputs to that call
- the output from that call
- where each output field comes from

Include this implementer instruction:

> If implementation reveals the agreed design is impractical, incomplete, or sub-optimal, stop and push back. Do not silently implement a different design.

If the necessary architecture/design material or code samples cannot be populated from approved artefacts, block task creation. Do not invent the missing technical design in the issue.

### What "done" looks like

Populate from the selected delivery deliverable's acceptance criteria, linked PRD success conditions, and the agreed target architecture/design for this ticket.

This section must contain these subsections in this order:

1. `### Product`
2. `### Design`
3. `### Quality`

#### Product

List observable product/system behaviour that proves the ticket's problem slice is solved. Include happy paths and source-backed unhappy paths.

#### Design

List approved architecture/design constraints that must be true in the implementation: target flows, classes, calls, config shape, role placement, ownership, replacement flows, removed old paths, forbidden alternatives, and behaviour that must remain equivalent.

Cross-references are allowed, but they must be specific enough to identify the exact design being referenced. Do not use vague references like "the approved shape", "the new model", or "per the architecture".

If the referenced design is small, include the concrete details directly. If the referenced design is large, name it precisely and include enough identifying detail so the implementer and reviewer know exactly what is meant.

#### Quality

List source-backed non-functional requirements and quality constraints that apply to this ticket.

Use this for performance, scalability, accessibility, security, privacy, observability, compatibility, data integrity, reliability, maintainability, and testability.

Do not invent generic quality requirements. If the PRD, architecture, or delivery plan does not name a ticket-specific quality constraint, state that no ticket-specific quality criteria were identified beyond the repository standards in `## Implementation guidelines`.

Cross-references are allowed, but they must be specific. Do not write vague bullets like "is reliable", "is maintainable", "has good test coverage", or "performs well".

Every bullet must be observable and checkable at ticket close.

For refactoring/replacement issues, acceptance criteria must include both replacement outcomes and removal outcomes. Do not list only what disappears. Acceptance criteria must explicitly state:

- the approved new path exists and works
- the old path no longer exists, when removal is part of the approved plan
- each old public mode/path/behaviour still works or is explicitly not part of this ticket
- any major design decision that would otherwise be left to implementation

Do not write summary phrases such as:

- supports X
- handles Y
- per the PRD
- as specified

### Implementation guidelines

Populate from:

- the selected delivery deliverable
- the approved architecture document
- `docs/conventions/software-design.md`
- `docs/conventions/testing.md`
- relevant architecture memories under `projectMemoryArchitectureMemoriesPath`, following the project-memory architecture instructions before using them

This section tells the implementer where the change belongs and which repository rules/conventions are especially relevant to this ticket.

This section must include:

- the relevant `/apps`, `/packages`, `/tools`, config, docs, or test areas involved
- the package/feature boundaries the implementer should stay inside
- relevant rules from `docs/conventions/software-design.md`, with source file references and rule IDs/names
- relevant rules from `docs/conventions/testing.md`, with source file references and rule IDs/names
- relevant architecture memories from `project-memory/architecture/`, with source file references when they apply
- any other approved project-memory or convention notes that prevent common mistakes for this kind of work

Do not include every repository rule. Include the rules that are relevant to this ticket.

Do not use this section to define the target architecture/design, list acceptance criteria, duplicate the architectural annex, or invent product behaviour.

### Dependencies

Populate from:

- explicit dependencies in the selected delivery deliverable
- blocking GitHub issues already known
- explicit dependency order in the approved delivery plan

If there are no dependencies, omit this section.

### How to verify

Populate from explicit verification commands and pass conditions already named in the selected delivery deliverable, approved architecture document, or repository conventions.

The commands must be written exactly.

This section must map verification steps to the Product, Design, and Quality criteria in `## What "done" looks like`.

For each command or manual check, include the expected passing result. Do not write vague phrases like "run relevant tests", "verify it works", or "check behaviour".

If no exact command is known but a manual verification condition is named, include the manual condition.

### Things this ticket must not do

Populate from:

- PRD non-goals
- solution-exploration no-gos referenced by the PRD
- explicit exclusions attached to the selected delivery deliverable

This section must name the concrete exclusions that stop the ticket drifting into neighbouring work. Do not use vague exclusions like "no unrelated changes" or "avoid scope creep". Name the actual behaviour, file area, design alternative, or product capability that must not be added.

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

1. the approved problem definition or PRD does not contain enough concrete problem material to populate `## Problem`
2. the approved PRD does not contain enough concrete product material to populate `## Solution` and `### Product`
3. the approved architecture document does not contain explicit target architecture/design material that can be carried into `## Agreed target architecture and design`
4. the issue does not tell the implementer to read `ARCH.md` for the full approved architecture context and scope
5. code samples from `ARCH.md` are necessary to ensure the target architecture is implemented as defined, but the issue omits them
6. the approved delivery plan does not contain concrete deliverables, acceptance criteria, source refs, and verification notes where known
7. the selected deliverable depends on unresolved product, architecture, or delivery blockers
8. the selected deliverable asks the implementer to make a major design decision that is not an explicit acceptance criterion
9. `## What "done" looks like` does not include `### Product`, `### Design`, and `### Quality`
10. `### Design` uses vague references such as "the approved shape", "the new model", or "per the architecture" without naming the actual design
11. `## Implementation guidelines` includes repository rules without source file references
12. `## Implementation guidelines` omits relevant convention or architecture-memory guidance needed to avoid known mistakes for this kind of work
13. `## How to verify` contains vague verification such as "run relevant tests", "verify it works", or "check behaviour"
14. a refactoring/replacement issue does not show the current flow and target replacement flow in `## Agreed target architecture and design`
15. a refactoring/replacement issue removes an existing state-loading or persistence path without naming the approved replacement loading boundary, role, call, inputs, output, and data origins
16. a refactoring/replacement issue title says `Remove X` when the real work is replacing `X` with `Y`
17. an old state-loading call is being replaced but the issue does not show the exact approved replacement line/call

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
