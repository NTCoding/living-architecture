# solution-exploration

Explore and approve the product direction before drafting `PRD.md`.

This stage is where product discovery happens after the problem is defined. It is not architecture drafting and it is not delivery planning.

## Active file

Use the solution exploration file passed in the runtime context:

- `solutionExplorationPath`

Use the approved problem definition passed in the runtime context:

- `problemDefinitionPath`

Do not write PRD content.
Do not write architecture decisions.
Do not create delivery milestones.

## Required starting condition

`problem-definition.md` must contain:

```text
**Status:** Approved
```

If not, `/dev-workflow-v2:continue-planning` must produce:

```text
BLOCK
- Problem definition is not approved
```

## Core principle

A PRD records the product decision once discovery has produced one. It is not the place where the product is discovered.

This stage must explore possible solutions, research existing alternatives, examine risks, and gain user approval for the selected product concept before PRD drafting begins.

## Sources

Use only:

- approved `problem-definition.md`
- user words from the current planning conversation
- user-approved sources
- user-approved research directions
- web or repository findings that are shown to the user and accepted as relevant

Project memory may be updated for deferred future work, but it must not be used to invent product scope, requirements, research findings, or reasons.

Do not invent:

- market facts
- competitor capabilities
- open-source project capabilities
- technical feasibility claims
- user behaviour
- business constraints

You may propose candidate approaches as hypotheses, but they must be clearly framed as options to discuss, not facts.

## Required exploration areas

The approved `solution-exploration.md` must cover all of these:

1. approved problem anchor
2. research scope and approved sources
3. existing / market / comparable solution research
4. open-source or framework research where relevant
5. candidate solution approaches
6. trade-offs between the options
7. selected product concept
8. happy path
9. unhappy paths
10. explicit no-gos / excluded scenarios
11. risky assumptions
12. Cagan four-risk review:
    - value risk
    - usability risk
    - feasibility risk
    - business viability risk
13. remaining open discovery questions, if any

External research is expected. Do not skip existing-solution research unless the user explicitly approves that it is not relevant for this planning topic and the reason is recorded.

For no-gos and excluded scenarios, distinguish explicit exclusions from work that is probably or definitely needed later. Apply the project-memory deferred-work triage rules before approving the selected concept.

## Cagan four-risk model

Use Marty Cagan's four big risks as a required discovery gate before PRD drafting:

1. **Value risk** — whether users will choose to use it.
2. **Usability risk** — whether users can figure out how to use it.
3. **Feasibility risk** — whether engineers can build what is needed with the time, skills, and technology available.
4. **Business viability risk** — whether the solution works for the wider project, business, legal, operational, or strategic constraints.

Source: <https://www.svpg.com/four-big-risks/>

Feasibility must be explored here at product-discovery depth. Full architecture decisions still belong in `ARCH.md`.

## Conversation flow

The prompts below are internal objectives, not user-facing scripts. Ask naturally. Avoid prompt IDs and stage mechanics.

### Objective 1 — Anchor the problem

Summarise the approved problem in plain language and ask the user whether this is the right anchor for solution exploration.

Use only the approved problem definition. Do not add new facts.

If the user changes the problem materially, stop and ask whether the approved problem definition should be revised. If the user approves revising the problem definition, `/dev-workflow-v2:continue-planning` must produce:

```text
RETURN: problem-definition
```

### Objective 2 — Approve research scope

Invite the user to shape the research direction before researching.

Avoid a blank canvas by offering useful categories such as:

- comparable commercial products
- comparable open-source tools
- established product patterns or frameworks
- internal prior work, but only if the user approves it as context
- "no external research is relevant", only if the user explicitly approves and gives a reason

Ask which categories are relevant and whether there are named sources, products, frameworks, or constraints to include.

Do not conduct broad repository mining unless the user approves internal sources.

### Objective 3 — Research existing solutions

Research the approved scope.

For each source, capture:

- source name and URL or file path
- what it does
- what looks relevant to the approved problem
- what does not fit
- risks or assumptions revealed

Then ask the user whether the research findings are accepted, need correction, or need more research.

Do not treat research findings as approved until the user accepts them.

### Objective 4 — Generate candidate approaches

Generate multiple candidate product approaches from the approved problem and accepted research.

Require at least two candidate approaches unless the user explicitly approves that only one viable approach exists.

Each option must include:

- plain-language concept
- who it helps
- what changes for the user
- what it borrows or avoids from existing solutions
- likely trade-off
- obvious risk

Do not choose for the user. You may recommend an option, but the user owns the decision.

### Objective 5 — Explore paths and exclusions

For the likely or selected approach, explore:

- happy path
- unhappy paths
- edge cases at product level
- no-gos / excluded scenarios
- assumptions that would make the approach fail

Keep this at product and user-experience level. Do not decide architecture or implementation.

For each no-go or excluded scenario, ask enough to distinguish whether it is explicitly not needed, probably needed later, definitely needed later, or uncertain. If it is probably or definitely needed later, capture it under `project-memory/ideas/` and keep only concise exclusion context in `solution-exploration.md`.

### Objective 6 — Review the four risks

Review the selected approach against all four Cagan risks.

For each risk, capture:

- current confidence: High / Medium / Low
- evidence or reason
- open concern
- mitigation or next step

If feasibility is low or unresolved, do not advance to PRD drafting. Either refine the concept or capture the feasibility work required before PRD drafting.

### Objective 7 — Approve selected concept

Compose the selected concept and the discovery rationale.

Ask whether the user approves this as the product direction to record in a PRD.

If approved, write `solution-exploration.md` and advance to `prd-drafting`.

## Required document structure

When the user approves the selected concept, write or update `solution-exploration.md` with this structure:

```markdown
# Solution Exploration: <title>

**Status:** Approved

---

## 1. Problem anchor

<approved problem summary>

## 2. Research scope and sources

<approved research scope>

| Source | Type | Why included | Accepted finding |
| --- | --- | --- | --- |
| `<source>` | `<market/open-source/framework/internal/other>` | `<reason>` | `<finding>` |

## 3. Existing solution research

<accepted research findings, including market/comparable/open-source findings or approved reason research was not relevant>

## 4. Candidate approaches

### Option A: <name>

- Concept: <plain-language concept>
- User change: <what changes for the user>
- Relevant research: <source/finding>
- Trade-off: <trade-off>
- Risk: <risk>

### Option B: <name>

<same structure>

## 5. Selected product concept

**Concept approval:** Approved

<approved selected concept>

## 6. Product paths

### Happy path

<happy path>

### Unhappy paths

- <condition> -> <expected product behaviour>

## 7. No-gos and exclusions

- <excluded scenario and reason; if probably or definitely needed later, link to `project-memory/ideas/<idea-slug>/`>

## 8. Risk review

| Risk | Confidence | Evidence / reason | Open concern | Mitigation / next step |
| --- | --- | --- | --- | --- |
| Value | High/Medium/Low | <evidence> | <concern> | <mitigation> |
| Usability | High/Medium/Low | <evidence> | <concern> | <mitigation> |
| Feasibility | High/Medium/Low | <evidence> | <concern> | <mitigation> |
| Business viability | High/Medium/Low | <evidence> | <concern> | <mitigation> |

## 9. Risky assumptions

- <assumption and why it matters>

## 10. Rejected options

- <option and reason rejected>

## 11. Open discovery questions

<questions, or "No open discovery questions.">
```

## Approval output

Before writing the approved file, show the user:

```text
Proposed selected concept:
<selected concept>

Why this concept fits the problem:
<short rationale tied to approved problem and accepted research>

Four-risk check:
- Value: <confidence and concern>
- Usability: <confidence and concern>
- Feasibility: <confidence and concern>
- Business viability: <confidence and concern>

No-gos:
- <excluded item>

Does this product direction work as the basis for the PRD, or should we keep exploring?
```

## Completion rule

This stage is complete only when all of these are true:

1. `solution-exploration.md` exists
2. it contains `**Status:** Approved`
3. it includes the approved problem anchor
4. it includes accepted existing-solution research or an explicitly approved reason external research was not relevant
5. it includes at least two candidate approaches, unless the user approved that only one viable approach exists
6. it includes `**Concept approval:** Approved`
7. it includes happy path, unhappy paths, no-gos, risky assumptions, and rejected options
8. its risk review covers value, usability, feasibility, and business viability
9. feasibility is not unresolved in a way that blocks PRD drafting
10. no `[NEEDS CLARIFICATION]` markers remain
11. no-gos and exclusions have been triaged so probably or definitely needed future work is captured in project memory

If complete, produce:

```text
ADVANCE: prd-drafting
```

Otherwise produce a conversational question, research summary approval request, concept approval request, or refinement prompt and internally treat the stage as blocked.
