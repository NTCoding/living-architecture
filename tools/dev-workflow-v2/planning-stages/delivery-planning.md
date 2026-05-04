# delivery-planning

Create and approve `delivery.md` after the PRD and architecture are approved.

This stage turns the approved product decision and approved architecture into value-based delivery slices. It is the first place where milestones belong.

## Active file

Use the delivery plan file passed in the runtime context:

- `deliveryPath`

Use the approved PRD and approved architecture passed in the runtime context:

- `prdPath`
- `architecturePath`

Do not change product requirements in this stage.
Do not make new architecture decisions in this stage.
Do not create GitHub issues in this stage.

## Required starting condition

The PRD must contain:

```text
**Status:** Approved
```

The architecture document must contain:

```text
**Status:** Approved
```

If either condition is missing, the current planning command must produce:

```text
BLOCK
- PRD is not approved
- Architecture is not approved
```

Only include the blocking item that applies.

## Delivery planning standard

Delivery planning must describe value delivered, not internal work performed.

Milestones and deliverables must be concrete enough for GitHub issue creation. Each deliverable should have:

- user or reviewer value
- acceptance criteria
- verification notes
- dependencies or sequencing, if any
- out-of-scope notes, if any

Do not invent implementation detail beyond what exists in the approved PRD and approved architecture.

If delivery planning reveals out-of-scope work that is probably or definitely needed later, apply the project-memory deferred-work triage rules before approving the delivery plan.

## Conversation flow

The prompts below are internal objectives, not user-facing scripts. Ask naturally. Avoid prompt IDs and stage mechanics.

### Objective 1 — Identify value milestones

Use the approved PRD and architecture to propose value checkpoints.

Ask the user whether the work is best sliced as:

- one serial delivery track
- a small number of value milestones
- independent streams that can be delivered in parallel
- another shape the user prefers

Milestones must be reviewable outcomes, not task buckets.

### Objective 2 — Define deliverables

For each milestone, define one or more deliverables.

Each deliverable must be something a user, reviewer, maintainer, or CI/task verifier can inspect.

Do not accept deliverables like "implement backend" or "wire up UI" unless they are reframed as user/reviewer-visible value.

### Objective 3 — Confirm dependencies and parallelisation

Explore ordering and independence:

- What must happen first?
- Which deliverables can be built independently?
- Which deliverables share product or architecture assumptions?
- Where would parallel work create coordination risk?

If splitting creates more risk than value, keep the plan serial.

### Objective 4 — Confirm verification

For each deliverable, capture how it can be verified.

Use only verification material from the approved PRD, approved architecture, and user-approved additions.

If commands are named, write them exactly.

Do not invent testing strategies.

### Objective 5 — Approve delivery plan

Draft `delivery.md` and ask whether the user approves it as the source for task creation.

## Required document structure

When the user approves the delivery plan, write or update `delivery.md` with this structure:

````markdown
# Delivery Plan: <title>

**Status:** Approved

---

## 1. Delivery summary

<short summary of how the approved PRD and architecture will be sliced into delivery>

## 2. Milestones and deliverables

### M1: <value checkpoint>

#### D1.1: <deliverable title>

- Value: <value delivered>
- Acceptance criteria:
  - <observable criterion>
- Verification:
  - <how to verify, command if explicitly known>
- Dependencies:
  - <dependency or "None">
- Out of scope:
  - <excluded item or "None"; if probably or definitely needed later, link to `project-memory/ideas/<idea-slug>/`>
- Source refs:
  - PRD: <section refs>
  - Architecture: <section refs>

### M2: <value checkpoint>

<same structure>

## 3. Parallelisation

```yaml
tracks:
  - name: <track name>
    deliverables:
      - <deliverable id>
    can_run_in_parallel_with:
      - <track name or none>
    coordination_risk: <risk or none>
```

## 4. Dependencies

- <dependency, blocker, or "No known dependencies.">

## 5. Task creation readiness

- Deliverables concrete enough for issue creation: Yes/No
- Acceptance criteria observable: Yes/No
- Verification notes present where known: Yes/No
- PRD and architecture source refs present: Yes/No
- Open blockers: <blockers or none>
````

## Approval output

Before writing the approved file, show the user:

```text
Proposed delivery shape:
<milestones and deliverables summary>

Parallelisation:
<serial/parallel recommendation with coordination risk>

Task creation readiness:
- Deliverables concrete enough: <yes/no>
- Acceptance criteria observable: <yes/no>
- Verification notes present where known: <yes/no>
- Open blockers: <none/list>

Does this delivery plan work as the basis for creating tasks, or should we reshape the slices?
```

## Completion rule

This stage is complete only when all of these are true:

1. `delivery.md` exists
2. it contains `**Status:** Approved`
3. it contains at least one milestone
4. each milestone contains at least one deliverable
5. each deliverable has acceptance criteria and source refs
6. the parallelisation section exists, even if work is serial
7. the dependencies section exists, even if there are no dependencies
8. task creation readiness says deliverables are concrete enough for issue creation
9. no `[NEEDS CLARIFICATION]` markers remain
10. delivery out-of-scope items that are probably or definitely needed later are captured in project memory

If complete, produce:

```text
ADVANCE: task-creation
```

Otherwise produce a conversational question, delivery-shape approval request, or refinement prompt and internally treat the stage as blocked.
