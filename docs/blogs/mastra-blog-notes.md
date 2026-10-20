# Mastra features used by the software factory

Reference list for a blog post. Each entry is a feature, where it is used, a code sample,
and what it does or does not do. Versions: `@mastra/core` 1.75.0, `@mastra/memory` 1.36.0,
`@mastra/libsql` 1.25.1.

## Workflow graph

Where: `packages/dev-workflow-v3/use-cases/src/features/implementation/commands/build-workflow.ts`

```ts
createWorkflow({ id: 'start-implementation', inputSchema, outputSchema })
  .then(loadIssue)
  .then(prepareBranch)
  .then(draftPlan)
  .then(requestPlanApproval)
  .then(implement)
  .dountil(reviewCycleStep, async ({ inputData }) => inputData.approved)
  .then(markReadyForHuman)
  .commit()
```

- The graph replaces an event-sourced state machine.
- Every step declares `inputSchema` and `outputSchema`; a wrong shape fails at that step.
- A looped step must keep the same input and output shape, because its output is fed back
  in as its next input.

## Plan as an issue comment, with a wait for the reply

Where: `build-workflow.ts`, steps `publish-plan` and `wait-for-plan-clarification`

```ts
const posted = await input.commentOnIssue({ issueNumber, body: planComment(state) })
const { reply } = await input.waitForIssueReply({ issueNumber, after: posted.createdAt })
```

- The planner returns `markdown`, `needsInput` and `question`.
- The plan is always posted. The run only waits when `needsInput` is true.
- The wait polls the issue for the first comment created after the plan comment, for up
  to an hour, then fails with the plan still on the issue.
- The reply is carried into the implementation prompt.
- There is no approval suspension and no `resume --approved`.

## Step suspension

Where: `build-workflow.ts`, step `request-plan-approval`

```ts
createStep({
  id: 'request-plan-approval',
  inputSchema: runStateSchema,
  outputSchema: runStateSchema,
  suspendSchema: planApprovalSchema,
  resumeSchema: planApprovalSchema,
  execute: async ({ inputData, resumeData, suspend }) => {
    if (resumeData === undefined) return await suspend({ approved: false, notes: inputData.planMarkdown })
    if (!resumeData.approved) throw new RunFailed('The plan was rejected.')
    return { ...inputData, planApproved: true }
  },
})
```

- `suspend(payload)` stops the run and writes a snapshot to storage.
- `run.resume({ step, resumeData })` continues from that step, in a later process.
- A rejected plan is a thrown error, not a resumed state.

## Nested workflows

Where: `build-workflow.ts`, step `review-cycle`

```ts
const nested = mastra.getWorkflow('review-cycle')
const run = await nested.createRun({ runId: `${inputData.runId}-review-${inputData.cycleNumber}` })
const result = await run.start({ inputData })
if (result.status !== 'success') throw new ReviewCycleFailed(inputData.cycleNumber, result.status)
return result.result
```

- A step can run another workflow and loop over it with `.dountil`.
- The workflow is found by its registration key. The key must equal the workflow `id`, or
  `getWorkflow` throws `MASTRA_GET_WORKFLOW_BY_ID_NOT_FOUND`.

## Agent configuration

Where: `tools/dev-workflow-v3/src/infra/external-clients/mastra/create-agent.ts`

```ts
new Agent({
  id: request.id,
  name: request.id,
  instructions: request.instructions,
  model: request.model,
  tools: dependencies.tools,
  memory: dependencies.memory,
  workspace: createWorkspace(request.workspacePath),
})
```

- One agent per model call, built by a factory. The app has no agent modules.
- File-based agents (`agents/{name}/config.ts` + `instructions.md`) are only discovered by
  `mastra dev` or `mastra build`. Importing the Mastra instance finds none of them.

## Model identifiers

Where: CLI `--model`

```text
deepseek/deepseek-v4.1-flash
```

- `provider/model`, resolved by Mastra's model router. No SDK or credential code.
- The provider key comes from the environment. `DEEPSEEK_API_KEY` in this repo.

## Thinking effort

Where: CLI `--thinking`, default `low`

```bash
pnpm factory start-implementation 500 --model deepseek/deepseek-v4.1-flash --thinking low
```

```ts
providerOptions: { deepseek: { reasoningEffort: 'low' } }
```

- `off` sends `{ deepseek: { thinking: { type: 'disabled' } } }`.
- `low`, `medium` and `high` map to DeepSeek's `reasoning_effort`.
- The level travels in the run state, so a resumed run keeps the level it started with.

## Review replies rendered from data

Where: `build-workflow.ts`, step `publish-review-replies`

```ts
const resolutionSchema = z.object({
  commentId: z.number().int().positive(),
  outcome: z.enum(['addressed', 'partly-addressed', 'not-addressed']),
  reason: z.string().nullable(),
})
```

```text
[dev-workflow-v3] Addressed in 4d83240f.

Files: src/order.ts, src/order.spec.ts
```

- The agent returns the comment id, the outcome and a reason. It never writes the reply.
- The sha comes from the commit check, the files from `git diff --name-only <before>..HEAD`.
- The comment ids come from the response to the comment creation call, not from the model.
- The same rule as everywhere else: the agent returns data, a deterministic step writes.

## Structured output

Where: `build-workflow.ts`, every model call

```ts
const response = await agent.generate(prompt, {
  structuredOutput: { schema: verdictSchema },
})
const verdict = verdictSchema.safeParse(response.object)
if (!verdict.success) throw new RunFailed(noStructuredOutput('The reviewer', response))
```

- The schema is the boundary. Prose, a missing field or a wrong type fails the step.
- Always log `finishReason`: `stop`, `tool-calls`, `suspended`, `aborted`, `length`.

## Turn limit and time limit

Where: `tools/dev-workflow-v3/src/infra/external-clients/mastra/generate-with-agent.ts`

```ts
const abort = new AbortController()
const timer = setTimeout(() => abort.abort(), request.timeBudgetMs)
try {
  const response = await agent.generate(prompt, {
    maxSteps: request.maxSteps,
    abortSignal: abort.signal,
  })
} finally {
  clearTimeout(timer)
}
```

```ts
// one implementation
maxSteps: 1000
timeBudgetMs: 60 * 60 * 1000
```

- `maxSteps` bounds one `generate` call by turns. It stops a fast loop.
- `abortSignal` bounds the same call by wall clock. It is the limit a person can reason
  about.
- The timer is per `generate` call. Time spent suspended between steps is not counted.
- An abort surfaces as `finishReason: 'aborted'` when the error is caught by the caller.

## Tools that suspend

Where: `tools/dev-workflow-v3/src/infra/external-clients/mastra/ask-user-tool.ts`

```ts
createTool({
  id: 'ask-user',
  inputSchema: z.object({ question: z.string(), evidence: z.string().nullable() }),
  outputSchema: z.object({ answer: z.string() }),
  suspendSchema: z.object({ question: z.string(), evidence: z.string().nullable() }),
  resumeSchema: z.object({ answer: z.string() }),
  execute: async ({ question, evidence }, context) => {
    const { resumeData, suspend } = context?.agent ?? {}
    if (resumeData === undefined) return await suspend({ question, evidence })
    return { answer: resumeData.answer }
  },
})
```

- `autoResumeSuspendedTools: true` plus memory lets the next message resume the tool.
- After a resume, `listSuspendedRuns()` still reports the run as suspended, with the tool
  call still listed. Do not build a status command from it alone.

## Workspace

Where: `tools/dev-workflow-v3/src/infra/external-clients/mastra/create-workspace.ts`

```ts
new Workspace({
  filesystem: new LocalFilesystem({ basePath: worktreePath }),
  sandbox: new LocalSandbox({ workingDirectory: worktreePath }),
  tools: {
    hooks: {
      beforeToolCall: ({ toolName, input }) => {
        if (toolName !== WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND) return undefined
        if (isAgentCommandAllowed(commandOf(input))) return undefined
        return { proceed: false, output: 'Refused: the workflow pushes the branch, not you.' }
      },
    },
  },
})

function isAgentCommandAllowed(command: string): boolean {
  return (
    !command.includes('git push') &&
    !command.includes('gh pr') &&
    !command.includes('gh api') &&
    !command.includes('--no-verify')
  )
}
```

- `proceed: false` plus `output` becomes the tool result the model reads.
- The deny list is written in the workspace the step builds, so the step owns its
  permissions.
- Tools the agent uses: `mastra_workspace_list_files`, `mastra_workspace_execute_command`,
  `mastra_workspace_read_file`, `mastra_workspace_write_file`, `mastra_workspace_mkdir`.
- The workspace is a host directory. There is no container.

## Agent commits its own work

Where: `build-workflow.ts`, `implementUntilCommitted`

```ts
const committed = await input.checkWorkCommitted({ worktreePath })
if (answer.allWorkComplete && answer.allWorkCommitted && committed.clean && committed.hasCommit) {
  return { kind: 'committed', summary: answer.summary, sha: committed.sha }
}
progress.prompt = nudgePrompt(answer, committed)
```

- The implementer runs `git commit` itself. The pre-commit hook runs the repository checks
  and returns its output to the agent as a tool result.
- The agent's structured output carries `allWorkComplete` and `allWorkCommitted`.
- A deterministic check reads `git status --porcelain` and `git rev-list --count base..HEAD`
  between rounds.
- Three rounds, one hour total. A dirty worktree after three rounds fails the step.

## Memory and threads

Where: `build-workflow.ts`, `generate` request

```ts
memory: { thread: `issue-${issueNumber}`, resource: 'factory' }
```

- Threads survive across steps and processes.
- `mastra_messages` holds the user prompt and the assistant message with its tool calls and
  tool results. This is the most useful debugging artefact.
- Tool results are truncated in the message, e.g. `[showing last 200 of 269 lines]`.

## Storage and run history

Where: `tools/dev-workflow-v3/src/infra/external-clients/mastra/create-mastra.ts`

```ts
const storage = new LibSQLStore({ id: 'factory', url: 'file:.factory/mastra.db' })
const mastra = new Mastra({ workflows, storage })
```

- Snapshots, threads and messages all live in one local SQLite file.
- `listWorkflowRuns()` and `getWorkflowRunById(runId)` give run status and every step's
  input, output and suspend payload.
- Run ids are chosen by the caller: `issue-500`, then `issue-500-2` on a retry.

## Event stream

Where: `run.observeStream()`

```ts
const reader = run.observeStream().getReader()
```

- Returns a `ReadableStream` of typed events: `workflow-step-start`,
  `workflow-step-finish`, `workflow-step-suspended`, `workflow-finish` and others.
- `run.watch(cb)` does the same job and is marked `@internal`.
- In our probe against a two step workflow, the stream emitted no events, so the CLI polls
  `getWorkflowRunById` every three seconds instead.

## CLI output

Where: `tools/dev-workflow-v3/src/shell/main.ts`

```text
  ✓ load-issue             2s
  ✓ draft-plan             48s
  … implement              29m 12s
  ✓ implement              41m 03s
  ✗ push-branch            1s
```

- The presentation is ours. Mastra has no terminal output.
- One line per finished step, with elapsed time. A heartbeat every minute while a step is
  long.
- Command output is never printed in full. The last 40 lines go in the error, the whole log
  goes to `.factory/logs/<timestamp>-<command>.log`.

## Studio

Where: `mastra dev`, pointed at the same storage

- Shows the workflow graph and the trace of every step and prompt.
- Used for reading runs, not for starting or approving them.
