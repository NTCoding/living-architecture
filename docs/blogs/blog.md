# Building a software factory on Mastra: the features we used

This is the raw material for a blog post. It lists every Mastra feature the software
factory in `tools/dev-workflow-v3` uses or tried, what it does for us, and what we learned
the hard way. The factory carries a GitHub issue through planning, implementation,
verification, a pull request and a review cycle, started from one command line.

Versions used:

```text
@mastra/core    1.75.0
@mastra/memory  1.36.0
@mastra/libsql  1.25.1
```

## 1. Workflows as the state machine

**Used:** `createWorkflow`, `createStep`, `.then`, `.dountil`, `.commit`.

The workflow graph is the state machine. We deleted our own event-sourced engine because
Mastra's graph already records where a run is, what it has done and what comes next.

```ts
createWorkflow({ id: 'start-implementation', inputSchema, outputSchema })
  .then(loadIssue)
  .then(prepareBranch)
  .then(draftPlan)
  .then(requestPlanApproval)
  .then(implement)
  .dountil(reviewCycle, async ({ inputData }) => inputData.approved)
  .then(markReadyForHuman)
  .commit()
```

Two things worth a paragraph in the post.

- **A looped step keeps one shape in and out.** The step that runs the review cycle takes
  the cycle state and returns the same shape, because its own output is fed back in as its
  next input. The step before the loop seeds it.
- **A step validates its own boundary.** Every step declares an input and an output
  schema, so a step that returns the wrong shape fails at that step, not three steps
  later.

## 2. Running another workflow from a step

**Used:** `mastra.getWorkflow(id).createRun({ runId })`, `run.start({ inputData })`.

The review cycle is its own workflow, and the implementation workflow runs it as a step
inside a loop. That is how two workflows compose without either one knowing the other's
internals.

**The gotcha:** the workflow is found by the key it is registered under, so the key must
equal the workflow `id`. Register `{ parent, inner }` and `getWorkflow('review-cycle')`
fails with `MASTRA_GET_WORKFLOW_BY_ID_NOT_FOUND`.

## 3. Snapshots, suspension and resume

**Used:** `suspendSchema`, `resumeSchema`, `suspend()` inside a step, `run.resume({ step,
resumeData })`, `listWorkflowRuns`, `getWorkflowRunById`.

A human decision is a suspension. The run stops, the snapshot is written to storage, and
the process can exit. The developer answers later, possibly the next day, and the run
continues at the step that was waiting.

```ts
const requestPlanApproval = createStep({
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

This is the feature that makes a command line workflow feel safe. Kill the terminal, the
run is still there.

## 4. Agents as factories, not files

**Used:** `Agent`, the model router (`provider/model` ids), `generate()`.

Agents are TypeScript modules that name a model, instructions and a workspace, and the
shell registers them on the Mastra instance. We deliberately avoided file-based agents:
discovery only runs through `mastra dev` or `mastra build`, and a plain import of the
Mastra instance finds no agents at all. Our CLI starts a run in its own process, so file
discovery would put a server between the command and the workflow for no gain.

The model router is a quiet win for a blog post: one string, one key in the environment,
and no SDK or credential plumbing in our code.

## 5. Structured output as a contract

**Used:** `generate(prompt, { structuredOutput: { schema } })` with zod.

Every model call declares the shape it must return. A planner that returns prose, or a
reviewer that forgets the status, fails at the step boundary with a schema error and a
trace that shows the field.

```ts
const response = await agent.generate(prompt, {
  structuredOutput: { schema: verdictSchema },
})
```

**The gotcha we hit:** an agent with a workspace can choose to call a tool instead of
answering. The call then ends with `finishReason: 'tool-calls'` and no object. We saw
this twice, once on a reviewer with one step and once on an implementer that ran out of
steps. Always log `finishReason` alongside the parse error.

## 6. Tools that suspend themselves

**Used:** `createTool` with `suspendSchema` and `resumeSchema`, `context.agent.suspend`,
`context.agent.resumeData`, `autoResumeSuspendedTools`.

A blocker is a conversation, not a form. The implementer has an `ask-user` tool that
suspends with the question. With `autoResumeSuspendedTools` and memory configured, the
next message on the thread resumes the tool and the agent carries on.

```ts
const askUser = createTool({
  id: 'ask-user',
  suspendSchema: z.object({ question: z.string(), evidence: z.string().nullable() }),
  resumeSchema: z.object({ answer: z.string() }),
  execute: async ({ question, evidence }, context) => {
    const { resumeData, suspend } = context?.agent ?? {}
    if (resumeData === undefined) return await suspend({ question, evidence })
    return { answer: resumeData.answer }
  },
})
```

**The gotcha:** after a suspended tool is resumed, `listSuspendedRuns()` still returns the
run with `status: 'suspended'`. A status command cannot be built from it alone.

## 7. The workspace

**Used:** `Workspace`, `LocalFilesystem`, `LocalSandbox`, `WORKSPACE_TOOLS`,
`beforeToolCall`.

This is the best demo material in the whole post. The agent is given a workspace pointed
at a git worktree, and the hook refuses the commands the workflow owns:

```ts
new Workspace({
  filesystem: new LocalFilesystem({ basePath: worktreePath }),
  sandbox: new LocalSandbox({ workingDirectory: worktreePath }),
  tools: {
    hooks: {
      beforeToolCall: ({ toolName, input }) => {
        if (toolName !== WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND) return undefined
        if (!input.command.includes('git push')) return undefined
        return { proceed: false, output: 'The workflow pushes the branch, not you.' }
      },
    },
  },
})
```

The agent receives the refusal as a tool result and carries on. In a real run the trace
showed the agent using `mastra_workspace_list_files`, `mastra_workspace_execute_command`,
`mastra_workspace_mkdir` and `mastra_workspace_write_file` to read a repository, write a
port, an adapter and a client, and run `tsc`. It never pushed.

## 8. Memory and threads

**Used:** `Memory`, `generate({ memory: { thread, resource } })`.

Memory gives the implementer a thread it can be resumed on, and it gave us the single most
useful debugging artefact of the project: the tool calls and tool results of a run are in
`mastra_messages`. When an implementer "failed", the messages showed it had made forty
tool calls and was cut off mid-work, which is a completely different bug from what the
error message said.

## 9. Limits: turns and wall clock

**Used:** `maxSteps`, `abortSignal`.

This is the feature to lead a section with.

- `maxSteps` bounds one `generate` call by turns. It is a backstop against a loop.
- `abortSignal` bounds the same call by wall clock. Pass an `AbortController` signal that
  fires after an hour, and the call ends when the time is up.

```ts
const abort = new AbortController()
const timer = setTimeout(() => abort.abort(), 60 * 60 * 1000)
const response = await agent.generate(prompt, { maxSteps: 1000, abortSignal: abort.signal })
```

For a long implementation, time is the honest budget. Nobody can say whether a ticket is
400 turns, but everybody can say "an hour". A turn limit is the wrong unit for the person
paying the bill.

## 10. Debugging and progress

**Used:** snapshots, step outputs, suspend payloads, `finishReason`, `listWorkflowRuns`,
`getWorkflowRunById`, `mastra dev` Studio.

What actually helped, in order:

1. **The step output in the snapshot.** Every step's input and output is stored. Reading
   `draft-plan`'s output is how the CLI prints the plan on demand.
2. **The suspend payload.** It carries the question or the plan for approval, so a waiting
   run can explain itself.
3. **`finishReason`.** `stop`, `tool-calls`, `suspended` and `aborted` tell you three
   different stories that all look like "no output" from the outside.
4. **The memory thread.** Tool calls and results, in order.
5. **Studio (`mastra dev`).** The workflow graph and the trace of every step and prompt,
   against the same storage. Good for reading, not for starting or approving.

The lesson for the post: a workflow engine that stores every step's input, output and
suspension payload turns "the agent did something weird" into a five minute read.

## 11. Storage

**Used:** `LibSQLStore` on a local file, `Memory` over the same store.

A single file under `.factory/` holds the workflow snapshots, the threads and the
messages. That is what makes a run survive a laptop restart without a database server.

## 12. What we tried and set aside

- **File-based agents.** Only discovered by `mastra dev` or `mastra build`. We use
  TypeScript modules instead.
- **Parallel review steps.** `.parallel` exists and is the obvious fit for three
  reviewers. We kept the chain sequential so a failure names one reviewer, not a branch.
- **Building the workflow inside the use case.** We moved the framework work into an
  adapter behind a port, so the domain model has no Mastra import. Mastra is an external
  client, not a dependency of the domain.

## 13. What we would tell someone starting

- Model the workflow as data first: step ids, order, and the one step that loops. Then
  bind behaviour to it.
- Put the framework behind a port early. It is the difference between "we use Mastra" and
  "our code is Mastra".
- Log `finishReason` on every model call from day one.
- Budget the model call by time, and keep a turn limit as a backstop.
- Read the snapshot before believing the error message.
