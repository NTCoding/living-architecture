# problem-definition

Define and approve `problem-definition.md` before any solution exploration can begin.

## Active file

Use the problem definition file passed in the runtime context:

- `problemDefinitionPath`

Before this stage is approved, read only:

- `markerPath`
- `problemDefinitionPath`
- this instruction file

Do not read old PRDs, issues, docs, source code, architecture files, or delivery plans unless the user explicitly names one as a source for the problem definition.

## Source rules

Use only:

- user words from the current planning conversation
- user-named sources
- content already approved inside `problemDefinitionPath`

Do not invent:

- problem categories
- affected users
- impacts
- opportunities
- examples
- solution ideas
- repository-specific context

Do not improve the user's idea by adding facts. Only clarify, challenge, and structure what the user provides.

## Problem definition standard

The approved problem definition must be a concise description of one problem or opportunity that needs to be explored and solved.

It must include:

1. background or current state
2. people affected
3. where the problem occurs
4. when the problem occurs
5. user impact
6. project or organization impact

It must not include:

- a solution
- implementation details
- architecture decisions
- delivery milestones
- a list of unrelated problems

## Required conversational interview

Collect the 5Ws in the current conversation. Do not end an answer by telling the user to run this command again.

After the user answers a 5W field:

1. apply the challenge checks
2. ask the next missing 5W field in the same conversation
3. continue until all 5W fields are answered or a challenge check needs correction

The user may answer using their own words. The agent must not require exact wording beyond the requested field objective.

The 5W fields below are internal objectives, not user-facing scripts. Do not read them to the user. Do not announce the field name, stage name, section name, or artefact mechanics. Use the planning interview personality from `continue-planning.md` to let the user share context in their own way, then collect missing objectives through natural clarifying questions.

### W1 — Who

Internal objective: identify the people affected in the user's plain terms.

Collection guidance:

- Listen for people, teams, roles, customers, users, maintainers, reviewers, or operators in the user's story.
- If the affected people are not clear after the user has shared context, invite the user to say more about the people around the situation.
- If the user's story mentions support, review, cleanup, or workaround effort but does not name who carries that effort, invite the user to say more about that part of the story.
- Do not instruct the user to include direct users or internal teams. Ask whether those groups exist.
- Accept a broad group name when the user confirms that it is the affected group.
- Ask about subgroups only when the problem definition cannot identify affected people without them.

### W2 — What

Internal objective: identify the underlying problem or opportunity without solution detail.

Questioning constraints:

- Ask what is not working, what is harder than it needs to be, or what opportunity is being missed.
- If the answer is a solution, ask what problem that solution is meant to solve.
- Keep the question tied to the user's last answer.

### W3 — Where

Internal objective: identify where the problem occurs.

Questioning constraints:

- Ask where the user sees the problem happen.
- If needed, ask whether it happens in a process, artefact, product area, team process, user journey, or handoff.
- Do not offer categories unless the user needs examples to answer.

### W4 — When

Internal objective: identify when the problem occurs.

Questioning constraints:

- Ask what moment, trigger, repeated action, or handoff makes the problem visible.
- Keep the question tied to the place identified in W3 when available.
- Do not offer categories unless the user needs examples to answer.

### W5 — Why

Internal objective: identify why the problem matters to affected people and to the project or organization.

Questioning constraints:

- Ask what pain or cost the problem creates.
- Ask separately about project or organization impact if the user only explains individual user pain.
- Do not infer adoption, retention, revenue, support load, or delivery risk unless the user names it.

## Challenge checks

After each answer, apply these checks before moving to the next 5W field:

1. If the answer contains a solution, ask the user to restate the answer without the solution.
2. If the answer contains multiple unrelated problems, ask the user to pick one problem for this planning topic.
3. If the answer has more than one possible meaning, ask a clarifying question about the same field.
4. If the answer contradicts an earlier answer, ask the user to choose which answer is correct.
5. If the answer reveals a risk or missed opportunity, ask whether that belongs in this problem definition or should be captured later during solution exploration.

Use a conversational follow-up for challenge checks. Do not use labels like `What needs tightening` or `Follow-up`. Do not judge the user's answer or state that it is too broad, too vague, doing too much work, weak, unclear, or wrong. Ask a neutral clarifying question instead.

Bad:

```text
What needs tightening:
<specific issue with the user's answer>

Follow-up:
<specific correction needed for this same field>
```

Good:

```text
When you say “<user answer>”, who does that include in practice?

If there is no internal team affected, say that too.
```

## Source handoff

If the user names a source instead of answering a 5W field, read only that source and extract only the named 5W field.

Then show the extracted field for approval:

```text
Extracted from source:
<extracted wording>

Does this capture the field correctly, or should it be tightened?
```

## Compose and approve

After all 5W fields are answered and challenge checks pass, compose a concise problem definition using only the approved answers.

Do not add facts. Do not add solutions. Do not add repository context.

Use this output:

```text
Approved inputs:
- Who: <approved who>
- What: <approved what>
- Where: <approved where>
- When: <approved when>
- Why: <approved why>

Proposed problem statement:
<2-4 sentence problem statement using only the approved inputs>

Quality check:
- One focused problem or opportunity: <pass/fail>
- People affected included: <pass/fail>
- Current state/background included: <pass/fail>
- Where and when included: <pass/fail>
- User impact included: <pass/fail>
- Project or organization impact included: <pass/fail>
- No solution detail: <pass/fail>

Does this problem definition work as written, or should it be tightened before it is approved?
```

If approved, update `problem-definition.md` with this structure:

```markdown
# Problem Definition: <title>

**Status:** Approved

---

## Approved inputs

**Section approval:** Approved

- Who: <approved who>
- What: <approved what>
- Where: <approved where>
- When: <approved when>
- Why: <approved why>

## Problem statement

**Section approval:** Approved

<approved problem statement>
```

Then the current planning command must produce:

```text
ADVANCE: solution-exploration
```

## Completion rule

This stage is complete only when all of these are true:

1. `problem-definition.md` exists
2. its header contains `**Status:** Approved`
3. approved inputs include Who, What, Where, When, and Why
4. the problem statement is approved
5. the problem statement contains no solution detail, implementation detail, architecture decision, or delivery milestone
6. no `[NEEDS CLARIFICATION]` markers remain

If complete, produce:

```text
ADVANCE: solution-exploration
```

Otherwise produce a conversational interview question, follow-up, or approval request and internally treat the stage as blocked.
