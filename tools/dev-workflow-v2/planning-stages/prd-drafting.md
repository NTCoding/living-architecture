# prd-drafting

Compile and approve `PRD.md` as a product decision record from approved discovery artefacts.

The PRD is not the place where product discovery happens. It records the product decision once `problem-definition.md` and `solution-exploration.md` are approved.

## Active files

Use the files passed in the runtime context:

- `problemDefinitionPath`
- `solutionExplorationPath`
- `prdPath`

Do not write architecture content.
Do not write delivery milestones.
Do not switch into implementation.

## Required starting conditions

`problem-definition.md` must contain:

```text
**Status:** Approved
```

`solution-exploration.md` must contain:

```text
**Status:** Approved
```

and:

```text
**Concept approval:** Approved
```

If any condition is missing, `/dev-workflow-v2:continue-planning` must produce:

```text
BLOCK
- Problem definition is not approved
- Solution exploration is not approved
- Selected product concept is not approved
```

Only include the blocking items that apply.

## Source rules

Use only:

- approved `problem-definition.md`
- approved `solution-exploration.md`
- user-approved clarifications made during PRD drafting

Project memory may be updated or linked only for deferred future work confirmed during PRD drafting. Do not use project memory to introduce new current-PRD scope.

Do not invent:

- new requirements
- new users
- new success criteria
- new non-goals
- new research findings
- architecture decisions
- delivery milestones

If the PRD needs information that is not present in approved discovery artefacts, ask the user whether to:

1. add a clarification to the PRD from the current conversation, or
2. return to `solution-exploration` because discovery is incomplete.

## PRD standard

The PRD must capture WHAT and WHY, not HOW.

It must be concise, traceable, and stable enough for architecture drafting.

The PRD must include:

1. problem summary
2. selected product concept
3. users and use cases
4. product requirements
5. non-goals
6. success criteria
7. open product questions, if any
8. architecture questions, but not architecture decisions
9. source traceability back to approved discovery artefacts
10. links to project-memory idea folders for non-goals that are probably or definitely needed later

The PRD must not include:

- market research notes that belong in `solution-exploration.md`
- architecture decisions
- component designs
- implementation instructions
- delivery milestones
- parallelisation
- GitHub issue breakdown
- task verification strategy

## Drafting process

Read approved `problem-definition.md` and `solution-exploration.md`.

Draft the PRD in the required structure below.

If the existing `PRD.md` is an older discovery-style PRD, do not silently preserve its old section approvals as product decisions. Use it only if the user explicitly approves old content as input, or if that content has already been migrated into approved discovery artefacts.

## Required PRD structure

Write or update `PRD.md` with this structure:

```markdown
# PRD: <title>

**Status:** Draft

**PRD approval:** Pending

---

## 1. Problem Summary

<concise summary from approved problem-definition.md>

## 2. Product Decision

<selected product concept from approved solution-exploration.md>

## 3. Users and Use Cases

- <user / role>: <use case>

## 4. Product Requirements

- <observable product requirement>

## 5. Non-Goals

- <excluded scenario or capability from approved solution exploration; if probably or definitely needed later, link to `project-memory/ideas/<idea-slug>/`>

## 6. Success Criteria

- <observable success criterion>

## 7. Open Product Questions

<questions, or "No open product questions.">

## 8. Architecture Questions

- <question architecture must answer before delivery planning>

## 9. Source Traceability

- Problem definition: `problem-definition.md`
- Solution exploration: `solution-exploration.md`
- Key source sections:
  - <section refs>
```

If no architecture questions exist, write:

```text
No architecture questions identified beyond normal architecture drafting.
```

## Approval output

After drafting, show the user a concise PRD review:

```text
I’ve drafted the PRD as a product decision record, using only the approved problem definition and solution exploration.

Key product decision:
<selected concept>

Requirements:
- <short requirement summary>

Non-goals:
- <short non-goal summary>

Deferred future work:
- <project-memory idea link or none>

Architecture questions:
- <question or none>

Does this PRD accurately record the product decision, or should we tighten it before approval?
```

If the user approves the PRD, update only the PRD header/approval marker to:

```markdown
**Status:** Awaiting Architecture Review

**PRD approval:** Approved
```

Then `/dev-workflow-v2:continue-planning` must produce:

```text
ADVANCE: prd-approval
```

## Completion rule

This stage is complete only when all of these are true:

1. `PRD.md` exists
2. `problem-definition.md` is approved
3. `solution-exploration.md` is approved
4. `PRD.md` contains `**Status:** Awaiting Architecture Review`
5. `PRD.md` contains `**PRD approval:** Approved`
6. the PRD includes all required sections
7. the PRD contains no architecture decisions
8. the PRD contains no delivery milestones, parallelisation, or task breakdown
9. the PRD has source traceability to both approved discovery artefacts
10. no `[NEEDS CLARIFICATION]` markers remain
11. non-goals that are probably or definitely needed later link to their project-memory idea folders

If complete, produce:

```text
ADVANCE: prd-approval
```

Otherwise produce a conversational approval request or refinement question and internally treat the stage as blocked.
