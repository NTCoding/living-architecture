# task-creation

Create GitHub issues directly from the approved PRD, approved architecture document, approved dogfooding artefact, and approved delivery plan.

## Inputs

Use:

- `problemDefinitionPath`
- `prdPath`
- `architecturePath`
- `dogfoodingPath`
- `deliveryPath`
- `githubMilestone`

Also use these sources when populating implementation guidance:

- `.riviere/role-enforcement.config.ts`
- `.riviere/roles.ts`
- `.riviere/canonical-role-configurations.md`
- `docs/conventions/software-design.md`
- `docs/conventions/testing.md`
- relevant architecture memories under `projectMemoryArchitectureMemoriesPath`, following the project-memory architecture instructions before using them

Use this as the source-of-truth glossary:

- `docs/architecture/domain-terminology/contextive/definitions.glossary.yml`

## Required starting condition

The PRD, architecture document, dogfooding artefact, and delivery plan must all contain:

```text
**Status:** Approved
```

If any artefact is not approved, block task creation.

## Step 1: select deliverables

Read the approved delivery plan and identify the milestone deliverables that are ready for issue creation.

Create one GitHub issue per selected deliverable unless the approved delivery plan explicitly groups several deliverables into one issue.

The PRD provides product WHAT and WHY.
The architecture document provides technical HOW constraints and task consequences.
The dogfooding artefact provides fully specced dogfooding deliverables and final dogfooding artefacts.
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
4. `**Dogfooding:** <file path and dogfooding deliverable refs, required for dogfooding tickets>`
5. `**Delivery plan:** <file path and deliverable refs>`

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
2. `## Glossary` at the end of the issue body

## Step 3: populate the sections with these exact rules

### Problem

Populate from:

- the approved problem definition
- the selected delivery deliverable
- the approved PRD sections referenced by that deliverable
- the approved dogfooding artefact when the deliverable is a dogfooding deliverable

This section must:

- ground every claim in the relevant approved PRD or problem-definition text
- explain the specific problem slice this ticket covers
- explain the current workflow or failure mode using concrete details from the PRD or problem definition
- explain the impact using numbers, examples, affected users, or named consequences from the PRD or problem definition
- explain how this specific problem fits into the wider problem described by the approved problem definition and PRD
- describe the source-backed cost to affected users or the missed opportunity if the problem remains unresolved

Describe what users are trying to do, what makes that difficult or unreliable today, and the resulting consequence. Focus on the problem, not the proposed solution, project plan, delivery sequence, dependencies, or later tickets.

Do not define the problem as the absence of the proposed solution, deliverable, artefact, component, or implementation. For example, "users have no complete, executable reference" describes a missing solution rather than the underlying user problem.

For a learning or adoption ticket, do not say that users lack a demo, example, guide, configuration, or documentation. Those are possible solutions. State what people cannot learn, understand, do, or adopt in their own work.

Use concrete, plain-language nouns and actions. Do not use umbrella terms or project jargon when the approved sources provide more specific language. For example, replace "architecture facts" with the actual information and sources involved: components, operations, events, and relationships obtained from source code, EventCatalog, AsyncAPI, and AI-assisted discovery.

The problem must be understandable without ticket IDs, deliverable IDs, milestone names, or knowledge of the delivery plan. Never justify the problem by saying that another ticket depends on this ticket, that the ticket appears in an approved delivery sequence, or that delaying it would affect later implementation. Dependency information belongs only in `## Dependencies`.

Bad:

```text
Product-level tests alone do not prove that a real multi-domain customer can use the product. This slice matters because D0.3 is an explicit dependency in the approved delivery sequence and an incomplete boundary would push design decisions into later implementation tickets.
```

This is project verification and delivery-sequence rationale, not the difficulty or consequence experienced by users.

Good:

```text
Users trying to create one accurate architecture graph from multiple codebases, EventCatalog, AsyncAPI, and AI-assisted findings must determine for themselves how to combine those inputs, in what order, and whether each step produced the correct result. This makes Rivière difficult to learn, adapt, and trust. Users who cannot confidently apply it to their own systems are less likely to adopt it.
```

Do not use vague claims like "slow", "inconsistent", "unreliable", or "hard to repeat" unless the approved PRD/problem definition explains what that means. If the approved artefacts do not contain enough concrete problem detail and user or product consequence to write this section, block task creation rather than padding with generic wording or inventing an impact.

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

Write the solution in this order:

1. Start with the high-level purpose of the change.
2. Add the relevant capability detail and clarification.
3. Explain why the resulting capability matters to the user or customer.

High-level purpose does not mean abstract wording. The first sentence must name the product capability, the action the user takes, and the result the user needs. Never use an undefined reference such as “the Workflow”, “the demo”, “the customer journey”, “the result”, “all capabilities”, “everything”, or “works together”. At the point of reference, name the file, stages, sources, commands, outputs, or decision involved, or link to the exact source that defines it. For a Workflow deliverable, an agent must write `riviere-workflow.yaml` with its named stages, not “the Workflow”.

For a dogfooding ticket, the first sentence may name the update to the named demo repository. It must then name the product capabilities, user actions, and outputs that the repository exercises. For example:

```text
Update ecommerce-demo-app to help people new to Riviere learn how TypeScript code extraction, EventCatalog import, AsyncAPI import, additive AI extraction, additive AI enrichment, and schema validation work. The README shows people how to run riviere-workflow.yaml and inspect its graph and log, so they can apply the same setup to their own application.
```

The solution must never be only a to-do list or an artefact inventory, such as adding a root Workflow file, stage configs, fixtures, tooling, and README documentation. Those details belong in `## Agreed target architecture and design` after the purpose, capability, and user value are clear.

Do not describe detailed technical architecture, code, config, or runtime flow here. That belongs in `## Agreed target architecture and design`.

Do not list acceptance criteria here. Those belong in `## What "done" looks like`.

### Agreed target architecture and design

Populate from:

- the approved architecture document
- the approved dogfooding artefact when the ticket implements dogfooding artefacts
- the selected delivery deliverable
- relevant approved architecture memories when they apply

The purpose of this section is to ensure that agreed-upon target architecture and design is implemented as described, or challenged if new insights emerge that make it impractical or sub-optimal.

This section must tell the implementer to read `ARCH.md` for the full approved architecture context and scope. The issue must not be treated as a replacement for `ARCH.md`.

This section must use these subheadings in this order:

1. `### Full architecture context`
2. `### Target components, boundaries, and responsibilities`
3. `### Code/config/flow from ARCH.md`
4. `### Role and location decisions`
5. `### Current-to-target replacement` for refactoring/replacement issues only
6. `### Structural concerns and forbidden alternatives` when relevant
7. `### Design challenge instruction`

#### Full architecture context

Tell the implementer to read `ARCH.md` for the full approved architecture context and scope. The issue must not be treated as a replacement for `ARCH.md`.

#### Target components, boundaries, and responsibilities

Include all of the target architecture and design decisions that should be implemented in this ticket. In addition, include related parts of the design that help to guide or shape the implementation of this ticket, such as previously implemented parts, parts that will be implemented next, or fundamental model changes that are driving this change.

Name the concrete components, boundaries, services, commands, repositories, config files, workflow stages, or domain concepts involved. Do not use vague references such as "the new model", "the approved approach", or "the workflow architecture" without naming the actual element.

#### Code/config/flow from ARCH.md

Copy across all code/config/flow samples from `ARCH.md` that are necessary to ensure the target architecture is implemented as defined. If you are unsure, it is better to include more.

Do not replace an available `ARCH.md` code/config/flow sample with a newly written prose description or a simplified invented flow. If `ARCH.md` contains a concrete TypeScript, YAML, JSON, shell, or `text` block for the relevant target design, copy the relevant block into the issue. If multiple `ARCH.md` blocks are relevant to the ticket, include all of them or a clearly identified excerpt from each one.

This subsection must contain at least one fenced code/config/flow block copied from `ARCH.md`, unless the approved architecture genuinely contains no code/config/flow sample for this ticket. If the approved architecture contains no such sample, block task creation unless the architecture clearly contains enough design detail for the ticket without one.

#### Role and location decisions

Include role and location decisions from the approved architecture and `.riviere` configuration that affect this ticket.

When the ticket touches role-enforced TypeScript code, include a table with:

| Proposed Element | Kind | Role | Sublocation | Confidence | Notes |
|------------------|------|------|-------------|------------|-------|

The table must name concrete proposed elements from the approved architecture. Do not replace role/location decisions with prose.

Use `.riviere/role-enforcement.config.ts`, `.riviere/roles.ts`, and `.riviere/canonical-role-configurations.md` as role-enforcement source material. If a proposed element needs a new role or aggregate approval that is not already approved, the issue must say that user approval is required before implementation adds it.

#### Current-to-target replacement

For refactoring/replacement issues, this subsection must include:

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

#### Structural concerns and forbidden alternatives

Include structural concerns from the approved architecture and delivery plan. Name forbidden alternatives and the approved replacement or approved path. Do not only say what not to invent; also say what approved design should be used instead.

If no structural concerns are identified for the ticket, omit this subsection rather than adding filler.

#### Design challenge instruction

Include this implementer instruction exactly:

> If implementation reveals the agreed design is impractical, incomplete, or sub-optimal, stop and push back. Do not silently implement a different design.

If the necessary architecture/design material or code samples cannot be populated from approved artefacts, block task creation. Do not invent the missing technical design in the issue.

For dogfooding tickets, `## Agreed target architecture and design` must include the exact dogfooding deliverable final content from `dogfoodingPath` section `What new dogfooding to add`. Do not replace a complete workflow/config/README/CI/script/generated-output block with prose.

### What "done" looks like

Populate from the selected delivery deliverable's acceptance criteria, linked PRD success conditions, and the agreed target architecture/design for this ticket.

For dogfooding tickets, also populate from the linked dogfooding deliverable's stated customer action, customer-visible result, existing dogfooding fit, final content, and acceptance criteria in `dogfoodingPath`.

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
- the approved dogfooding artefact when the ticket implements dogfooding artefacts
- `.riviere/role-enforcement.config.ts`
- `.riviere/roles.ts`
- `.riviere/canonical-role-configurations.md`
- `docs/conventions/software-design.md`
- `docs/conventions/testing.md`
- relevant architecture memories under `projectMemoryArchitectureMemoriesPath`, following the project-memory architecture instructions before using them

This section tells the implementer where the change belongs and which repository rules/conventions are especially relevant to this ticket.

This section must use these subheadings in this order:

1. `### Change areas`
2. `### Relevant repository rules`
3. `### Relevant architecture memories`
4. `### Lint, role-check, and test expectations`

#### Change areas

Include:

- the relevant `/apps`, `/packages`, `/tools`, config, docs, or test areas involved
- the package/feature boundaries the implementer should stay inside

#### Relevant repository rules

Include:

- relevant rules from `docs/conventions/software-design.md`, with source file references and rule IDs/names
- relevant rules from `docs/conventions/testing.md`, with source file references and rule IDs/names

Do not include every repository rule. Include the rules that are relevant to this ticket.

#### Relevant architecture memories

Include:

- relevant architecture memories from `project-memory/architecture/`, with source file references when they apply
- any other approved project-memory or convention notes that prevent common mistakes for this kind of work

If no architecture memory applies, say that no relevant architecture memory was identified after checking the relevant memory sources.

#### Lint, role-check, and test expectations

Include reminders that are relevant to the ticket from:

- `.riviere/role-enforcement.config.ts`
- `.riviere/roles.ts`
- `.riviere/canonical-role-configurations.md`
- `docs/conventions/software-design.md`
- `docs/conventions/testing.md`

When role-enforced TypeScript is touched, tell the implementer to expect lint/role-check feedback and to use it to improve the design rather than working around it. Include the relevant package-level lint or role-check command only when an exact command is known from approved artefacts or repository convention.

Do not use this section to define the target architecture/design, list acceptance criteria, or invent product behaviour.

### Dependencies

Populate from:

- explicit dependencies in the selected delivery deliverable
- blocking GitHub issues already known
- explicit dependency order in the approved delivery plan

If there are no dependencies, omit this section.

### How to verify

Populate from explicit verification commands and pass conditions already named in the selected delivery deliverable, approved architecture document, or repository conventions.

For dogfooding tickets, also include the customer action and exact customer-visible result from `dogfoodingPath`.

The commands must be written exactly.

This section must map verification steps to the Product, Design, and Quality criteria in `## What "done" looks like`.

For each command or manual check, include the expected passing result. Do not write vague phrases like "run relevant tests", "verify it works", or "check behaviour".

If no exact command is known but a manual verification condition is named, include the manual condition.

### Things this ticket must not do

Populate from:

- PRD non-goals
- solution-exploration no-gos referenced by the PRD
- explicit exclusions attached to the selected delivery deliverable
- explicit exclusions from the linked dogfooding deliverable in `dogfoodingPath`

This section must name the concrete exclusions that stop the ticket drifting into neighbouring work. Do not use vague exclusions like "no unrelated changes" or "avoid scope creep". Name the actual behaviour, file area, design alternative, or product capability that must not be added.

### Glossary

Populate from the source-of-truth glossary at `docs/architecture/domain-terminology/contextive/definitions.glossary.yml`.

This section must:

- reference `docs/architecture/domain-terminology/contextive/definitions.glossary.yml` as the source glossary
- include only key domain or architecture terms used in the issue body
- use the exact term name and definition from the source glossary

Do not invent inline glossary definitions inside the issue.

If the issue needs a domain or architecture term that is not already in the source glossary, add the term to `docs/architecture/domain-terminology/contextive/definitions.glossary.yml` first using source-backed wording from approved planning artefacts. If the definition cannot be populated from approved artefacts, block task creation rather than inventing it.

## Step 4: ensure GitHub milestone and label exist

Before creating issues, ensure both of these exist in GitHub:

- milestone title: `<githubMilestone>`
- label name: `prd:<githubMilestone>`

Use `gh repo view` and `gh api` to check whether the milestone exists. If it does not exist, create it.

Example command shape:

```bash
gh repo view --json owner,name
gh api "repos/<owner>/<repo>/milestones?state=all"
gh api -X POST "repos/<owner>/<repo>/milestones" -f title="<githubMilestone>"
```

Use `gh label list` to check whether the exact label exists. If it does not exist, create it.

Example command shape:

```bash
gh label list --search "prd:<githubMilestone>" --json name --jq '.[] | select(.name == "prd:<githubMilestone>") | .name'
gh label create "prd:<githubMilestone>" --description "Tasks for <githubMilestone>" --color "5319e7"
```

If GitHub authentication, repository resolution, milestone creation, or label creation fails, block task creation with the specific failure.

## Step 5: create each issue on GitHub

For each selected deliverable, create the issue with:

- title
- full issue body
- milestone = `<githubMilestone>`
- label = `prd:<githubMilestone>`

Use:

```bash
./scripts/create-task.sh <milestone> <title> <body>
```

## Step 6: blocking rule

Block task creation if any of these are true:

1. the approved problem definition or PRD does not contain enough concrete problem material to populate `## Problem`
2. the approved PRD does not contain enough concrete product material to populate `## Solution` and `### Product`
3. the approved architecture document does not contain explicit target architecture/design material that can be carried into `## Agreed target architecture and design`
4. the issue does not tell the implementer to read `ARCH.md` for the full approved architecture context and scope
5. code/config/flow samples from `ARCH.md` are necessary to ensure the target architecture is implemented as defined, but the issue omits them or replaces them with prose/newly invented simplified flow
6. the approved delivery plan does not contain concrete deliverables, acceptance criteria, source refs, and verification notes where known
7. the selected deliverable depends on unresolved product, architecture, or delivery blockers
8. the selected deliverable asks the implementer to make a major design decision that is not an explicit acceptance criterion
9. `## What "done" looks like` does not include `### Product`, `### Design`, and `### Quality`
10. `### Design` uses vague references such as "the approved shape", "the new model", or "per the architecture" without naming the actual design
11. `## Agreed target architecture and design` omits any required subsection for that ticket: `### Full architecture context`, `### Target components, boundaries, and responsibilities`, `### Code/config/flow from ARCH.md`, `### Role and location decisions`, `### Current-to-target replacement` when refactoring/replacement applies, `### Structural concerns and forbidden alternatives` when relevant, or `### Design challenge instruction`
12. a ticket touching role-enforced TypeScript code does not include a concrete role/location table in `### Role and location decisions`
13. `## Implementation guidelines` omits any required subsection: `### Change areas`, `### Relevant repository rules`, `### Relevant architecture memories`, or `### Lint, role-check, and test expectations`
14. `## Implementation guidelines` includes repository rules without source file references
15. `## Implementation guidelines` omits relevant convention or architecture-memory guidance needed to avoid known mistakes for this kind of work
16. `## How to verify` contains vague verification such as "run relevant tests", "verify it works", or "check behaviour"
17. `## Glossary` includes a term that is not present in `docs/architecture/domain-terminology/contextive/definitions.glossary.yml`
18. a needed domain or architecture term is absent from the source glossary and cannot be added from approved artefacts
19. a refactoring/replacement issue does not show the current flow and target replacement flow in `## Agreed target architecture and design`
20. a refactoring/replacement issue removes an existing state-loading or persistence path without naming the approved replacement loading boundary, role, call, inputs, output, and data origins
21. a refactoring/replacement issue title says `Remove X` when the real work is replacing `X` with `Y`
22. an old state-loading call is being replaced but the issue does not show the exact approved replacement line/call
23. a dogfooding ticket does not include the exact dogfooding deliverable final content from `dogfoodingPath`
24. a dogfooding ticket replaces the dogfooding artefact's workflow/config/README/CI/script/generated-output block with prose
25. a dogfooding ticket omits the linked dogfooding deliverable's customer action, customer-visible result, existing dogfooding fit, final content, or acceptance criteria
26. a dogfooding ticket weakens any acceptance criterion, dependency, exclusion, customer action, customer-visible result, or final artefact from `dogfoodingPath`
27. `## Problem` justifies the ticket through dependencies, delivery sequencing, or effects on later tickets
28. `## Problem` defines the problem as the absence of the proposed solution, deliverable, artefact, component, or implementation
29. `## Problem` uses vague umbrella terms or project jargon where concrete source-backed language is available
30. `## Problem` does not state a source-backed user or product consequence
31. `## Problem` does not explain the concrete user task, difficulty, or failure mode covered by this ticket
32. `## Problem` does not explain how the ticket's problem fits into the wider approved problem context
33. `## Solution` does not begin with the high-level purpose, add the relevant capability detail and clarification, and explain why the result matters to the user or customer
34. a dogfooding ticket presents source files, configurations, fixtures, tooling, or README changes as its solution instead of naming the user action, product capabilities, and observable result it demonstrates
35. a dogfooding ticket claims to demonstrate a capability that the product cannot yet run through the demo
36. `## Solution` uses an undefined reference such as “the Workflow”, “the demo”, “the customer journey”, “the result”, “all capabilities”, “everything”, or “works together” instead of naming the file, stages, sources, commands, outputs, decision, or exact source reference at the point of reference

If blocked, the current planning command must produce:

```text
BLOCK
- <task creation blocker>
- <task creation blocker>
```

## Step 7: completion rule

This stage is complete only when all intended GitHub issues have been created successfully and all issue numbers are known.

If complete, the current planning command must produce:

```text
COMPLETE
- <created issue number>
- <created issue number>
```
