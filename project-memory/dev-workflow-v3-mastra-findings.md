# Slice 0 spike findings

Throwaway code on `dev-workflow-v3-spike`. It answers the four Mastra behaviours
`plan.md` depends on. Nothing here is meant to be merged.

| Check | Script | Result |
| --- | --- | --- |
| 1. A step runs another workflow, and `.dountil` loops over it | `check-1-nested-workflow.ts` | Pass, with one constraint the plan does not account for |
| 1b. A looped nested step whose input and output shapes differ | `check-1b-loop-shapes.ts` | Fails, as described below |
| 2. `autoResumeSuspendedTools` resumes a suspended tool | `check-2-auto-resume.ts` | Pass, with one surprise about `listSuspendedRuns()` |
| 3. A file based agent loads from `src/mastra/agents/{agent}/` | `check-3-file-agent.ts` | Loads only through `mastra build` or `mastra dev` |
| 4. A workspace hook refuses `EXECUTE_COMMAND` | `check-4-workspace-hook.ts` | Pass |

Versions used, all old enough for the repository's seven day release rule:

```text
@mastra/core    1.75.0
@mastra/memory  1.36.0
@mastra/libsql  1.25.1
mastra (CLI)    1.33.0
ai              6.0.303
```

No API key was found in the environment, so checks 2 and 4 drive a mock model
(`mock-model.ts`). Those checks prove Mastra's suspension and hook plumbing, not
the quality of an answer from a provider. Checks 1 and 3 need no model.

## Check 1: a step runs another workflow, and `.dountil` loops over it

The plan's shape works. A step calls `mastra.getWorkflow(id).createRun({ runId })`
and `run.start({ inputData })`, then returns `result.result`. `.dountil` runs that
step three times and the parent finishes.

Two things the plan does not say, and needs to:

**The workflow must be registered under the same key as its `id`.** Registering
`{ parent, inner }` while the workflows have ids `start-implementation` and
`review-cycle` makes `mastra.getWorkflow('review-cycle')` fail with
`MASTRA_GET_WORKFLOW_BY_ID_NOT_FOUND`. The lookup uses the registration key.

**A looped step's input must match the previous step's output, and its own output
is fed back in as the next input.** `check-1b-loop-shapes.ts` shows the failure:

```text
Step input validation failed:
- runId: Invalid input: expected string, received undefined
```

The plan's `review-cycle` step takes `ReviewCycleInput` and returns
`ReviewCycleResult`, so the second iteration fails. Either the looped step keeps
one shape in and out, for example `{ runId, cycle }`, or a small mapping step
sits before the loop.

`check-1c-loop-wider-output.ts` and `check-1d-loop-carried-state.ts` try the other
shapes.

**A wider output than the input works.** A looped step may return more than it
takes, because the input schema strips what it does not declare. The loop then
validates, but each iteration replaces the data, so nothing accumulates.

**Carrying the cycle state works, and it accumulates.** When the shape holds the
cycle number and the reviewers that already approved, the state travels through
the loop and each cycle can be rebuilt from the step input. Two details matter.
Every step the state passes through must declare it in its schema, or the schema
strips it. And the step before the loop must emit the same shape to seed the first
iteration.

That last option matches the decision in section 10 that `ReviewCycle` is rebuilt
from the step input each cycle.

## Check 2: `autoResumeSuspendedTools` resumes a suspended tool

The tool suspends with `suspend(payload)`, the agent reports
`finishReason: 'suspended'`, and `listSuspendedRuns()` finds the run by thread and
resource. The next chat message resumes the tool and the agent carries on.

How the resume actually happens matters for slice 4. Mastra appends an
instruction to the system message and the **model** decides to call the same tool
again, carrying `resumeData` and `suspendedToolCallId` in the tool arguments. The
model has to follow that instruction. A model that returns prose instead will not
resume anything.

**Surprise: `listSuspendedRuns()` still returns the run after the resume.** It
reports `status: 'suspended'` with `ask-user` still in `toolCalls`. So
`pnpm factory status`, which lists runs waiting for a person, cannot be built from
`listSuspendedRuns()` alone. It needs to cross check the run or the thread.

**Agent run ids are UUIDs.** The `issue-455` id belongs to the workflow run. Agent
runs get their own id, even when the memory thread is `issue-455`. That is fine,
but the plan should not imply the agent run id is the issue number.

## Check 3: a file based agent at `src/mastra/agents/{agent}/`

`config.ts` with `agentConfig()` and a sibling `instructions.md` is correct. But a
plain import of the Mastra instance discovers **nothing**:

```text
agents found by importing the Mastra instance: []
```

That matches the installed docs, which say discovery only runs through `mastra dev`
or `mastra build`. `mastra build` in `spike/app` did discover the agent and emitted
`.mastra/output/index.mjs`, a server, with the agent assembled from the two files.

So the plan's CLI cannot both start a run in its own process and rely on file
based discovery. There are two honest options, and the plan should pick one:

1. `shell/main.ts` loads each agent folder itself, reading `config.ts` and
   `instructions.md`. This works today. `check-3-file-agent.ts` part B does
   exactly that.
2. The workflow runs behind `mastra build` output, and the CLI talks to it over
   the Mastra client.

**Role check is unproven.** Role enforcement passes on this branch, but only
because `spike/` is not a configured path. The three roles the plan needs
(`agent-configuration`, `workflow-definition`, `workspace-configuration`) do not
exist yet, so nothing about the `/mastra` layout can pass role check until slice 3
adds them. The plan's Progress item overstates what this spike could settle.

## Check 4: a workspace hook refuses `EXECUTE_COMMAND`

Works as the plan hopes. The hook lives at `Workspace.tools.hooks.beforeToolCall`,
the tool name is `WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND`, and returning
`{ proceed: false, output }` gives the agent the refusal as the tool result. The
command never ran.

## Two things worth knowing for later

`LocalSandbox` can run with native isolation on a Mac, which is closer to the
container the plan says is required before anyone outside the team uses this:

```ts
new LocalSandbox({ workingDirectory, isolation: 'seatbelt', nativeSandbox: { allowNetwork: false } })
```

`mastra build` warned `Invalid Mastra config` for a `new Mastra({})` instance with
no options, then built anyway. Whatever `shell/main.ts` ends up looking like, it
should pass real options rather than an empty object.
