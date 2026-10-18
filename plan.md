# dev-workflow-v3: Software Factory on Mastra

**Status:** Draft, awaiting review
**Branch:** `dev-workflow-v3-mastra`

> **Known limitation in the first version.** The agent's workspace runs commands on the host with
> the permissions of this process. That is acceptable while we get v3 working, and it is not
> acceptable long term. Containers are required before anyone outside the team uses this. Tracked
> in the Progress list under "After v3 works".

---

## Progress

### Planning

- [x] Design discussion, options compared, decisions agreed
- [x] First draft of this plan
- [x] Review this plan
- [x] Answer the open questions in section 11

### Decisions needed before slice 3

- [x] Roles for agents, workflows and the workspace configuration, and the `/mastra` location
- [x] Aggregate with `approvedInstances`, or value objects only
- [x] Sandbox on the host, or in a container
- [x] Default model, and one key or one per developer
- [x] Test approach for the workflow graphs

### After v3 works

- [ ] Replace the host sandbox with a container sandbox, before anyone outside the team uses this

### Slice 0: the spike

- [x] A step starts another workflow, and `.dountil` loops over it, with the loop shape constraint in 5.2
- [x] `autoResumeSuspendedTools` resumes a suspended tool from the next chat message
- [x] A file based agent only loads through `mastra build` or `mastra dev`, so agents are TypeScript modules instead, see 6.4
- [ ] The agent modules pass role check. The roles for this layout are not designed yet
- [x] A workspace `beforeToolCall` hook refuses an `EXECUTE_COMMAND` call with `proceed: false`
- [x] Findings recorded in `spike/FINDINGS.md`, and this plan corrected where the docs were wrong
- [x] Decide the two questions in section 11 that slice 3 and slice 4 depend on

### Slice 1: domain-model package

- [x] Create the package, tsconfig files, vitest config, `description`
- [x] Value objects: issue, worktree, plan, approval, outcome, verification, commit, pull request, findings, verdicts, cycle, limit, model
- [ ] Domain ports and their errors. These moved to slice 2, because a `domain-port` must be implemented by a `domain-port-adapter` before role check passes
- [x] Tests to 100%
- [ ] Pull request raised, `pnpm verify` green, reviewed and merged

### Slice 2: use-cases package

- [x] Commands: prepare branch, verify, commit, push, open pull request, publish findings, close cycle
- [ ] Queries: load issue, read pull request feedback. These became ports with adapters instead, because a query has to return a query model, and the workflow only wants the read itself
- [x] Data access: none
- [x] Adapters: git, github, checks
- [x] External clients: git, github, process
- [x] Tests to 100%
- [ ] Pull request raised, `pnpm verify` green, reviewed and merged

### Slice 3: the app and the deterministic workflow

- [x] CLI entrypoints: start, resume, chat, status, runs
- [x] `shell/main.ts` and the Mastra instance
- [x] `start-implementation` with steps 1 to 14, with the model steps stubbed
- [x] `--model` as a required flag on every command that starts or resumes a run
- [x] Run id derived from the issue number
- [ ] CLI presentation: output, formatters, writer. The commands write straight to the terminal for now
- [ ] Tests to 100%. The app has no test target yet
- [ ] Pull request raised, `pnpm verify` green, reviewed and merged

### Slice 4: the model steps

- [x] `draft-plan` and the `planner` agent
- [x] `implement` and the `implementer` agent
- [x] `ask-user` tool, `autoResumeSuspendedTools`, `chat` entrypoint
- [x] The workspace refuses `git push`, `gh pr` and `gh api` in a `beforeToolCall` hook
- [ ] Tests to 100% for the app. The workflow graph and the CLI still have none
- [x] A run against a real issue with a real model. Issue 548 reached pull request 549, and the pull request carries the plan write up
- [ ] `mark-ready-for-human` comments on the pull request. It only records that the run finished
- [ ] Pull request raised, `pnpm verify` green, reviewed and merged

### Slice 5: the review cycle

- [ ] The three reviewer agents
- [ ] `collect-verdicts` and the cycle limit
- [ ] `publish-review-findings`
- [ ] `wait-for-coderabbit`
- [ ] `address-feedback`
- [ ] `verify-and-commit`
- [ ] Pull request raised, `pnpm verify` green, reviewed and merged

---

## 1. The problem

`tools/dev-workflow-v2` is a plugin that runs a coding agent inside a session, and then tries to control what that agent does. That costs us in three places.

**We maintain our own engine.** Around a thousand lines of infrastructure exist only to make a plugin behave like a state machine. The engine, the adapters, the hook wiring and the event log are ours to keep working, across four hosts.

**We maintain an adapter per host.** Claude, Codex, OpenCode and Pi each get a command registration, a hook file and its own deny list. Every host change means work for us, even though the state machine underneath is identical.

**The guarantees are ours, not the tooling's.** Traces, retries, snapshots, resumability and an approval screen all have to be written by hand, because nothing provides them.

The workflow also runs inside an agent session. That means the work and the supervision share a process, and the agent's own freedom is what has to be constrained.

## 2. What v3 is

A Mastra workflow, started from a command line, that carries a GitHub issue through to a pull request that is ready for a person to review.

```bash
pnpm factory start-implementation 455 --model anthropic/claude-sonnet-4-6
```

Mastra runs the agents. It edits files in its own workspace, on its own machine. The developer's coding agent is not involved, so nothing has to be dispatched to Claude, Pi, OpenCode or Codex, and no adapter exists for any of them.

## 3. Design goals

The first five are the confirmed goals. The last two follow from them.

1. **Do not maintain our own framework.** Engine behaviour, storage, snapshots, resumption, tracing and the run UI come from Mastra.
2. **Do not build an adapter each time the coding agent changes.** One runtime, one configuration. No host-specific code.
3. **Run the workflow outside an agent session.** The command line starts it, the workflow owns it, and a suspended run survives the process exiting.
4. **Put as much behaviour as possible in deterministic code.** Deterministic first. A model is used only where the result cannot be computed.
5. **Benefit from tooling that plugs into Mastra.** Studio traces, workflow snapshots, approval surfaces, evaluation and model providers come for free rather than being rebuilt.
6. **Every step has a declared input and output schema.** A model that returns the wrong shape fails the step at the boundary, before the next step runs. Nothing downstream works with unchecked data.
7. **An agent returns data, it does not cause side effects.** A reviewing agent returns a file, a line number, a rule and a sentence of feedback. A deterministic step posts it to GitHub.

## 4. What is different from v2

| v2 | v3 |
| --- | --- |
| Event-sourced state machine, owned by us | The Mastra workflow graph is the state machine |
| Transition guards and preconditions | Step input and output schemas |
| Hooks denying `git push` and `gh pr` | The workflow pushes. The agent has no token |
| State prefix emoji in every response | The step id is the state |
| Commands registered per host | One CLI |
| Sessions found again through a database lookup | Snapshots keyed by a run id derived from the issue number |
| Review verdicts recorded by hand | A typed verdict returned by a step |
| A blocker is a state transition | A blocker is a conversation with the agent |
| Nothing | Traces, run history and the workflow graph in Studio |

v2 stays in place. This table describes how the two differ, not something being removed.

## 5. The workflow

### 5.1 Two workflows

There are two workflows. `start-implementation` is the one you start. `review-cycle` is a separate workflow, and `start-implementation` runs it once per review cycle.

#### `start-implementation`

| # | Step | Kind | What it does | Output |
| --- | --- | --- | --- | --- |
| 1 | `load-issue` | Deterministic | Reads the issue through `gh issue view --json`. Body kept as untrusted text. | `IssueReference` |
| 2 | `prepare-branch` | Deterministic | Derives the branch name from the issue title, creates the branch and the worktree. | `WorktreeReference` |
| 3 | `read-guidance` | Deterministic | Assembles the instructions the agents get. `AGENTS.md`, conventions, ADR-002, role config, glossary, ADRs. | `RepositoryGuidance` |
| 4 | `draft-plan` | **LLM** | Reads the issue and the guidance, plans the change. Reasons only, writes nothing. | `ImplementationPlan` |
| 5 | `request-plan-approval` | Deterministic | Suspends the run with the plan attached. One decision, so a form rather than a conversation. Rejection bails the run. | `PlanApproval` |
| 6 | `implement` | **LLM** | Writes the code in the worktree. Runs the checks, reads failures, fixes them, up to a cap. When it cannot decide, it talks to the developer through the `ask-user` tool. | `ImplementationOutcome` |
| 7 | `verify` | Deterministic | Runs `lint`, `typecheck`, `test` and `role-check` for the changed projects. Fails the run when they are not green. | `VerificationResult` |
| 8 | `commit-work` | Deterministic | Commits with a conventional message. Asserts the tree is clean and that commits exist beyond the default branch. | `CommitRecord` |
| 9 | `push-branch` | Deterministic | Pushes the branch. This is the only place that pushes. | `RemoteBranch` |
| 10 | `draft-pull-request` | **LLM** | Writes the title, the description and the structured fields from the diff. | `PullRequestDraft` |
| 11 | `validate-pull-request` | Deterministic | Applies the existing title, description, commit type and scope rules. Loops back to step 10 up to three times, then fails. | `ValidatedPullRequestDraft` |
| 12 | `open-pull-request` | Deterministic | Creates the pull request. | `PullRequestReference` |
| 13 | `review-cycle` | Runs another workflow | Runs the `review-cycle` workflow once. Details in 5.2. | `ReviewCycleResult` |
| 14 | `mark-ready-for-human` | Deterministic | Comments on the pull request that it is ready, and ends the run. | `PullRequestReady` |

Of these fourteen steps, three call a model and eleven are deterministic.

#### `review-cycle`

| # | Step | Kind | What it does | Output |
| --- | --- | --- | --- | --- |
| 1 | `architecture-review` | **LLM** | Reads the diff against the architecture conventions and ADRs. Returns findings. Posts nothing. | `ReviewVerdict` |
| 2 | `code-review` | **LLM** | Reads the diff against the software design conventions. Returns findings. Posts nothing. | `ReviewVerdict` |
| 3 | `bug-scan` | **LLM** | Reads the diff for defects. Returns findings. Posts nothing. | `ReviewVerdict` |
| 4 | `collect-verdicts` | Deterministic | Folds the three verdicts, leaves out reviewers that already approved, applies the three cycle limit. | `AggregatedReviewResults` |
| 5 | `publish-review-findings` | Deterministic | Posts each finding as a pull request review comment. Details in 5.3. | `PublishedReviewFindings` |
| 6 | `wait-for-coderabbit` | Deterministic | Polls until CodeRabbit has reviewed the current commit, with a timeout. | `PullRequestFeedback` |
| 7 | `address-feedback` | **LLM** | Fixes the open findings in the worktree, including the CodeRabbit comments. | `ImplementationOutcome` |
| 8 | `verify-and-commit` | Deterministic | Runs the checks, commits and pushes the fix. | `CommitRecord` |

Of these eight steps, four call a model and four are deterministic.

Across both workflows that is twenty two steps, seven of which call a model.

### 5.2 One review cycle is its own workflow

`review-cycle` is a separate workflow with eight steps. `start-implementation` runs it once per cycle, and loops over it.

A cycle must not change how the review works. `ReviewCycle` is rebuilt from the step
input at the start of every cycle, exactly as v2 rebuilds it from its state, and it
carries the reviewer statuses and the cycle number. A reviewer that already approved
is left out of the next cycle, and the limit is three, both as in
`packages/dev-workflow-v2/domain-model/src/domain/workflow.ts`.

So the cycle state is the loop shape. The looped step takes it and returns the
updated version of it, the step before the loop seeds it, and the schema is defined
once and used by every step the state passes through. `spike/FINDINGS.md` records
why, and `check-1d-loop-carried-state.ts` proves it.

```ts
// workflows/review-cycle.ts
const ReviewCycleState = z.object({
  runId: z.string(),
  cycleNumber: z.number().int(),
  reviewerStatuses: ReviewerStatuses.schema(),
})

export const reviewCycle = createWorkflow({
  id: 'review-cycle',
  inputSchema: ReviewCycleState,
  outputSchema: ReviewCycleState,
})
  .parallel([architectureReview, codeReview, bugScan])  // LLM x3
  .then(collectVerdicts)                                // deterministic
  .then(publishReviewFindings)                          // deterministic, writes to GitHub
  .then(waitForCodeRabbit)                              // deterministic
  .then(addressFeedback)                                // LLM
  .then(verifyAndCommit)                                // deterministic
  .commit()
```

The parent runs it as a step, because `.dountil()` takes a step.

Two constraints were confirmed by the spike in `spike/FINDINGS.md`. The workflow is
found by the key it is registered under, so that key must equal the workflow `id`.
And a looped step's input must match the previous step's output, because the step's
own output is fed back in as its next input.

```ts
const reviewCycleStep = createStep({
  id: 'review-cycle',
  inputSchema: ReviewCycleState,
  outputSchema: ReviewCycleState,
  execute: async ({ inputData, mastra }) => {
    const nested = mastra.getWorkflow('review-cycle')
    const run = await nested.createRun({ runId: `${inputData.runId}-review-${inputData.cycleNumber}` })
    const result = await run.start({ inputData })
    if (result.status !== 'success') throw new ReviewCycleFailed(inputData.cycleNumber, result.status)
    return result.result
  },
})
```

### 5.3 Posting findings to the pull request

The reviewers never post anything. They return data.

```ts
const ReviewFinding = z.object({
  reviewer: z.enum(['architecture', 'code', 'bugs']),
  file: z.string(),
  line: z.number().int().positive(),
  rule: z.string().nullable(),
  summary: z.string(),
})
```

`publishReviewFindings` is a deterministic step that maps each finding onto a pull request review comment and posts it.

| Finding field | GitHub field |
| --- | --- |
| `file` | `path` |
| `line` | `line` |
| `rule` and `summary` | `body` |

The step is thin. It calls one command use case.

```ts
// mastra/workflows/review-cycle.ts
export const publishReviewFindings = createStep({
  id: 'publish-review-findings',
  inputSchema: PublishReviewFindingsInput,
  outputSchema: PublishReviewFindingsResult,
  execute: async ({ inputData }) => publishReviewFindingsCommand.execute(inputData),
})
```

```ts
// use-cases/features/implementation/commands/publish-review-findings.ts
/** @riviere-role command-use-case */
export class PublishReviewFindings {
  constructor(private readonly comments: PublishReviewComment) {}

  async execute(input: PublishReviewFindingsInput): Promise<PublishReviewFindingsResult> {
    const posted: PostedFinding[] = []
    for (const finding of input.findings) {
      const commentId = await this.comments.publish(input.pullRequest, finding)
      posted.push(PostedFinding.from(finding, commentId))
    }
    return PublishReviewFindingsResult.from(posted)
  }
}
```

```ts
// use-cases/features/implementation/adapters/github/publish-review-comment.ts
/** @riviere-role domain-port-adapter */
export class GithubPublishReviewComment implements PublishReviewComment {
  constructor(private readonly client: CreateReviewCommentRequest) {}

  async publish(pullRequest: PullRequestNumber, finding: ReviewFinding): Promise<CommentId> {
    const response = await this.client.create({
      pullRequest: pullRequest.value(),
      path: finding.file(),
      line: finding.line(),
      body: finding.body(),
    })
    return CommentId.parse(response.id)
  }
}
```

`ReviewFinding.body()` returns `**SD-005** the summary` when a rule is named, and the plain summary when it is not. The step records the returned comment id against its finding, so a later cycle replies in the existing thread instead of opening a second one.

### 5.4 The graph

```ts
createWorkflow({
  id: 'start-implementation',
  inputSchema: StartImplementation,
  outputSchema: PullRequestReady,
})
  .then(loadIssue)
  .then(prepareBranch)
  .then(readGuidance)
  .then(draftPlan)              // LLM
  .then(requestPlanApproval)    // suspends
  .then(implement)              // LLM, suspends when blocked
  .then(verify)                 // deterministic
  .then(commitWork)             // deterministic
  .then(pushBranch)             // deterministic
  .then(draftPullRequest)       // LLM
  .then(validatePullRequest)    // deterministic, retries step 10
  .then(openPullRequest)        // deterministic
  .dountil(reviewCycleStep, cycleIsComplete)   // nested workflow, see 5.2
  .then(markReadyForHuman)      // deterministic
  .commit()
```

### 5.5 Schemas and failure at the boundary

Every step declares `inputSchema` and `outputSchema`. Every model call declares a structured output schema.

```ts
const response = await reviewer.generate(prompt, {
  structuredOutput: { schema: ReviewVerdict },
})
```

If the model returns prose, a missing field or the wrong type, the call fails there. The next step never receives data that was not validated against the schema, and the trace in Studio shows which step and which field failed.

### 5.6 Human input and blockers

There are two mechanisms, because there are two different things.

**A decision** uses a workflow suspend. The run stops, the snapshot is stored, and the process can exit. This is the plan approval, which has one answer.

```ts
resumeSchema: z.object({ approved: z.boolean(), notes: z.string().nullable() })
```

**A conversation** uses a tool that suspends itself. A blocker is rarely answerable in one message, so a form is the wrong shape for it. The implementer agent gets an `ask-user` tool.

```ts
const askUser = createTool({
  id: 'ask-user',
  description: 'Ask the developer when you cannot decide alone.',
  inputSchema: z.object({ question: z.string(), evidence: z.string().nullable() }),
  outputSchema: z.object({ answer: z.string() }),
  suspendSchema: z.object({ question: z.string(), evidence: z.string().nullable() }),
  resumeSchema: z.object({ answer: z.string() }),
  execute: async ({ question, evidence }, context) => {
    const { resumeData, suspend } = context?.agent ?? {}
    if (!resumeData) return await suspend({ question, evidence })
    return { answer: resumeData.answer }
  },
})
```

With `autoResumeSuspendedTools` enabled and memory configured, the next message on the thread resumes the tool. The developer can ask questions of their own, and the agent can ask again. The terminal is a conversation, not a form.

```text
  455  the issue asks for a new port, but configuration already exposes
       assertSchemaConforms. Reuse it, or add a second one?

  > what does the existing one do

  455  it asserts schema conformance for a module and its registered schemas.

  > reuse it then

  455  ok. wiring it up now.
```

If the terminal closes, the suspended tool call is found again with `listSuspendedRuns()` and the conversation continues where it stopped.

### 5.7 Identifiers and resume

A snapshot is written to the `workflow_snapshots` table and identified by its `runId`. The snapshot lives in storage rather than in the process, which is what makes a resume possible after a crash, a reboot or a weekend.

The run id is derived from the issue number, with a suffix on a retry.

| Attempt | Run id | Thread id |
| --- | --- | --- |
| first attempt on issue 455 | `issue-455` | `issue-455` |
| second attempt | `issue-455-2` | `issue-455-2` |

```ts
const run = await workflow.createRun({ runId, resourceId: 'living-architecture' })
```

```bash
pnpm factory start-implementation 455
pnpm factory resume 455
```

A person never types an opaque identifier. `pnpm factory resume 455` resolves to the newest run for that issue.

Agent runs are not the same run. An agent run gets its own identifier from Mastra,
even when the memory thread is `issue-455`, so the issue derived id belongs to the
workflow run only.

One behaviour to design around, found in the spike. After a suspended tool is
resumed, `listSuspendedRuns()` still returns the run, with `status: 'suspended'`
and the tool call still listed. So `pnpm factory status` cannot be built from
`listSuspendedRuns()` alone and needs to cross check the run or the thread.

### 5.8 The command line

This is how the workflow is started and watched day to day. Studio is for reading, not for starting or approving.

| Command | What it does |
| --- | --- |
| `pnpm factory start-implementation <issue> --model <model>` | Starts a run, prints the run id, and reports each step as it happens |
| `pnpm factory status` | Lists every run that is waiting, with its question and how long it has waited |
| `pnpm factory resume <issue> --model <model>` | Resumes the newest run for the issue at the step that is suspended |
| `pnpm factory chat <issue> --model <model>` | Attaches to the conversation thread when a blocker is open |
| `pnpm factory runs` | Lists runs, with the issue number as the resource |

`--model` is required on every command that starts, resumes or talks to a run. There is no default in the repository, so nobody is ever running on a model they did not choose.

`start-implementation` exits with a distinct code when a run stops to wait for a person, so a script can tell that apart from a failure.

Mastra Studio can be started with `mastra dev` against the same storage. It shows the workflow graph, the trace of every step and prompt, and the files in the agent's worktree.

### 5.9 What stops the agent running a command it should not

Three layers, in order of strength.

1. **It has no permission.** The agent's workspace is given no GitHub token, so a push fails at the remote. This is the real guarantee.
2. **It has no tool.** The workspace is built inside the step, so a step that should not run commands does not give the agent a command tool.
3. **The call is refused.** A `beforeToolCall` hook on the workspace refuses a command matching the step's deny list, and returns the refusal to the agent as the tool result.

The deny list is written inside the step that owns it. There is no lookup of a current state, because the step already is the state.

## 6. Component design

### 6.1 Packages

Per ADR-002, a tool is an app and its packages live under `packages/{subdomain}/`.

```text
packages/dev-workflow-v3/
  domain-model/           @living-architecture/dev-workflow-v3-domain-model
  use-cases/              @living-architecture/dev-workflow-v3-use-cases
tools/dev-workflow-v3/    @living-architecture/dev-workflow-v3   (app)
```

No `published-language` package. Nothing here is a contract for another boundary, so nothing qualifies.

### 6.2 domain-model

Roles from `.riviere/role-enforcement.config.ts`: `aggregate`, `value-object`, `domain-port`, `domain-error`.

```text
packages/dev-workflow-v3/domain-model/src/domain/
  issue-number.ts                    value-object
  issue-reference.ts                 value-object
  worktree-reference.ts              value-object
  implementation-plan.ts             value-object
  plan-approval.ts                   value-object
  implementation-outcome.ts          value-object
  blocker-question.ts                value-object
  verification-result.ts             value-object
  commit-record.ts                   value-object
  pull-request-draft.ts              value-object, owns the title and description rules
  pull-request-reference.ts          value-object
  review-finding.ts                  value-object, file, line, rule, summary
  review-verdict.ts                  value-object
  reviewer.ts                        value-object
  reviewer-statuses.ts               value-object
  aggregated-review-results.ts       value-object
  review-cycle.ts                    aggregate, holds the cycle rules and the cycle limit
  review-cycle-limit.ts              value-object, three as the standard maximum
  model-identifier.ts                value-object, the `--model` value
  ports/
    read-issue.ts                    domain-port, slice 2
    prepare-worktree.ts              domain-port, slice 2
    run-project-checks.ts            domain-port, slice 2
    commit-work.ts                   domain-port, slice 2
    push-branch.ts                   domain-port, slice 2
    open-pull-request.ts             domain-port, slice 2
    publish-review-findings.ts       domain-port, slice 2
    read-pull-request-feedback.ts    domain-port, slice 2
    wait-for-reviewer.ts             domain-port, slice 2
```

A `domain-port` must be implemented by a `domain-port-adapter` before role check
passes, so the ports arrive in slice 2 alongside their adapters rather than in
slice 1.

Each file gets a sibling `.spec.ts`. Zod is used for parsing, per SD-019, and every value object is branded per SP-001.

`ReviewCycle` is an aggregate, approved by you. It owns the cycle number, which reviewers still hold open feedback, which reviewers already approved, and the three cycle limit. It needs an entry in `approvedInstances` in `.riviere/roles.ts` with `userHasApproved: true`, which I add as part of slice 1.

It has no `aggregate-repository`, because Mastra persists the step outputs and nothing else stores the cycle. The aggregate is rebuilt from the step input at the start of each cycle. That is unusual for an aggregate and may be challenged under ADR-002 review, so it is worth knowing before slice 1 rather than after.

### 6.3 use-cases

Roles: `command-use-case`, `query-model-use-case`, `domain-port-adapter`, `external-client-service`.

```text
packages/dev-workflow-v3/use-cases/src/features/implementation/
  commands/
    prepare-branch.ts
    verify-work.ts
    commit-work.ts
    push-branch.ts
    open-pull-request.ts
    publish-review-findings.ts
    close-review-cycle.ts
  adapters/
    git/               prepare worktree, commit, push
    github/            read issue, open pull request, publish a finding, read feedback, wait for reviewer
    checks/            run the affected checks and the role check

packages/dev-workflow-v3/use-cases/src/infra/external-clients/
  git/
  github/
  process/            runs a command, returns exit code, stdout and stderr
```

No `data-access` and no repository. Mastra holds the run state, so there is no application state for us to persist.

### 6.4 The app

Shell wires the application and does nothing else. An agent definition and a workflow graph are not wiring, so they do not belong there.

```text
tools/dev-workflow-v3/src/
  features/implementation/entrypoint/
    start-implementation/     cli-entrypoint
    resume/                   cli-entrypoint
    chat/                     cli-entrypoint
    status/                   cli-entrypoint
    runs/                     cli-entrypoint
  infra/cli/presentation/     cli-output, cli-output-formatter, cli-response-writer
  mastra/
    agents/
      planner.ts
      implementer.ts
      reviewer.ts
    tools/
      ask-user.ts
    workflows/
      start-implementation.ts
      review-cycle.ts
    workspace.ts
  shell/
    main.ts                   main
```

An agent is a TypeScript module. It names its model, its tools and its prompt, and
`shell/main.ts` registers it on the app's Mastra instance along with the workflows.
The caller starts a command and the pieces are already wired.

One reason it is not a folder of `config.ts` plus `instructions.md`. File based
discovery only runs through `mastra dev` or `mastra build`, and a plain import of the
Mastra instance finds no agents at all, which the spike measured. Discovery would
put a server between the command and the workflow for no gain, because nobody is
assembling the pieces by hand either way.

The roles for `/mastra` have not been designed. I added three invented roles to the
role model, which was wrong and has to be undone by the owner of `.riviere`. Until
then this folder sits outside the role model.

This layout does not fit ADR-002 today. I wrote that three new roles had been approved. They were not. The plan text was mine, and I treated my own text as your approval. The roles, the `/mastra` location and the ADR change are to be removed by whoever owns those files.

### 6.5 Direction of dependency

```text
cli-entrypoint ──> command-use-case ──> domain-model
                        │
                        └──> domain-port-adapter ──> external-client
shell  ──> entrypoint, and constructs every client, adapter and agent
step  ──> one command use case, or one agent
```

A step does not contain a business decision. It calls one command or one agent, and hands the result on.

### 6.6 The determinism rule

> A step may call a model only when the result cannot be computed from the step input and the repository. Any step that writes state, publishes outside the machine, or makes a decision that could be written as a rule is deterministic.

## 7. Testing

100% is required per `docs/conventions/testing.md`, and enforced by the coverage thresholds in each package's `vitest.config.mts`. No coverage directives and no exclusions, per `AGENTS.md`.

| Layer | Tested by |
| --- | --- |
| Value objects | Unit tests, one spec per file, edge cases from TS-008 |
| Commands and queries | Unit tests, fake ports, happy and unhappy paths |
| Adapters | Unit tests against fake external clients |
| External clients | Unit tests with the process runner and the HTTP client faked |
| Steps | Unit tests. `execute` is called directly with a hand-built context and a stub Mastra that returns stub agents |
| Workflow graph | One test per workflow with stub agents, running the real graph to a finished result |
| Agent `config.ts` | Covered when the workflow graph test constructs the agent |
| Agent instructions | Not unit tested. They are text, and the model is supplied at run time |

Test names describe outcomes, per TS-001. Fixtures live in `<module>-test-fixtures.ts`, per TS-009.

The workflow graph file is the one place where a unit test does not fit. It is covered by running the graph with stub agents, which exercises the wiring without a model. You have accepted that as the approach.

## 8. Repository guidance this plan follows

- `AGENTS.md`, including the role enforcement rule, the no `in` operator rule for domain code, and the ban on coverage workarounds
- `docs/architecture/adr/ADR-002-allowed-folder-structures.md`, for every folder and every import direction
- `.riviere/role-enforcement.config.ts` and `.riviere/role-selection-guide.md`, for role selection
- `docs/conventions/software-design.md`, `standard-patterns.md` and `anti-patterns.md`
- `docs/conventions/testing.md`
- `docs/architecture/domain-terminology/contextive/definitions.glossary.yml`, for names
- `project-memory/AGENTS.md`, for anything this plan defers

## 9. How this work is built, tested and merged

Five slices. Each one is a working, tested increment with its own branch and its own pull request.

| Slice | Content | Branch |
| --- | --- | --- |
| 0 | A spike on four Mastra behaviours the plan depends on | `dev-workflow-v3-spike` |
| 1 | `domain-model` package: value objects and ports | `dev-workflow-v3-domain-model` |
| 2 | `use-cases` package: commands, queries, adapters, external clients | `dev-workflow-v3-use-cases` |
| 3 | The app, the CLI, and `start-implementation` with the model steps stubbed | `dev-workflow-v3-app` |
| 4 | The model steps: `draft-plan`, `implement`, `ask-user` | `dev-workflow-v3-model-steps` |
| 5 | The `review-cycle` workflow and its eight steps | `dev-workflow-v3-review-cycle` |

Slice 0 exists because the plan depends on four Mastra behaviours that I have read about in the docs and have not run. Finding out in slice 3 that one of them works differently would be expensive.

1. A step that starts another workflow with `mastra.getWorkflow(...).createRun()`, and `.dountil()` looping over that step.
2. `autoResumeSuspendedTools`, so the next message on the thread resumes a suspended tool with `resumeData`.
3. A file based agent, meaning `src/mastra/agents/{agent}/config.ts` plus `instructions.md`, loading from our layout and passing role check.
4. A `beforeToolCall` workspace hook refusing an `EXECUTE_COMMAND` call by returning `proceed: false`, and the agent receiving the refusal as the tool result.

The spike is throwaway code on its own branch. Its output is a short findings note, and corrections to this plan wherever the docs and the behaviour disagree.

How each slice gets from a branch to `main`.

1. A GitHub issue per slice, per `docs/workflow/task-workflow.md`.
2. Work on the branch, run `pnpm nx affected -t lint typecheck test build` as you go.
3. `pnpm verify` before the pull request is ready. It is the gate: lint, role check, typecheck, build, test, knip, and the markdown lint.
4. Tests run in CI through Nx on the affected projects, so a slice that only touches `domain-model` does not rerun the whole repo.
5. Coverage thresholds are 100 for lines, statements, functions and branches in each package's `vitest.config.mts`. A slice with a gap fails rather than merges.
6. A person reviews and merges the pull request. The workflow under construction never merges anything.

**`dev-workflow-v2` is not deleted or changed by any of this.** It keeps running the current process while v3 is built. Nothing in slices 1 to 5 touches `tools/dev-workflow-v2` or `packages/dev-workflow-v2`.

## 10. Decisions recorded

These were agreed during the design discussion and are the source of truth for this plan.

1. **Mastra's own coding agent writes the code.** The developer's harness is not used, and is not dispatched to.
2. **Planning is out of scope.** The workflow begins at the issue and ends at a pull request that is ready for a person.
3. **The workflow starts from the CLI.** Studio is for reading runs, traces and worktree files, and for nothing else.
4. **A decision is a suspend, a conversation is a chat.** Plan approval suspends. A blocker uses the `ask-user` tool with `autoResumeSuspendedTools`, so the developer can go back and forth.
5. **The run id and the thread id are the issue number**, with a suffix on a retry.
6. **Everything runs on the developer's own machine.** Each developer has their own storage and their own runs.
7. **The review cycle is a separate workflow.** `review-cycle` is its own workflow with its own eight steps, and `start-implementation` runs it once per cycle.
8. **`dev-workflow-v2` is not deleted or changed.** It keeps running while v3 is built.
9. **The review cycle is an aggregate**, with an entry in `approvedInstances` in `.riviere/roles.ts`. It is rebuilt from the step input each cycle and has no repository, because Mastra holds the state.
10. **The first version runs commands on the host.** Containers are required before anyone outside the team uses this, and that is written at the top of this plan and in the Progress list.
11. **`--model` is a required flag** on every command that starts, resumes or talks to a run. There is no default model in the repository.
12. **A stub agent test is acceptable** for the workflow graph files.
13. **The CodeRabbit poll stays.**
14. **This is not a PRD.** It stays as `plan.md`.
15. **Agents, workflows and the workspace configuration live in `/mastra` in the app.** They are neither shell nor use cases. An agent is a TypeScript module, registered on the app's Mastra instance, so the application is standalone and the caller never assembles the pieces. The roles for this folder are not designed. An earlier version of this decision claimed three new roles had been approved. That was false and has been removed.
16. **The review cycle carries its state in the loop shape.** The looped step takes and returns the cycle state, which holds the reviewer statuses and the cycle number, seeded by the step before the loop. The review behaviour itself is unchanged from v2, so a reviewer that already approved is left out of the next cycle and the limit is three.

## 11. Blockers, unknowns and questions

None outstanding. Everything raised during review, and everything the spike found,
is answered and recorded in section 10.

The one thing left unproven is role check for the `/mastra` layout, which waits for
a role model decision that has not been made.

## 12. Refactor the factory code to fit the architecture rules

Agreed with Nick. No change to `.riviere` and no change to ADR-002 for any of this.

1. **Command inputs and results are plain data.** Each command builds its own domain
   values. No `IssueReference`, `WorktreeReference`, `PullRequestReference`,
   `ReviewVerdict` or `ModelIdentifier` in a command input or result.
2. **`buildWorkflow` is one command use case** at
   `packages/dev-workflow-v3/use-cases/src/features/implementation/commands/build-workflow.ts`.
   Its `execute` takes plain functions, one per step, and returns
   `BuildWorkflowResult` holding `startImplementation` and `reviewCycle`.
   It imports no other use case and receives no use case instances.
3. **The steps call the functions they are given** and pass plain data between each
   other. No value object is constructed in a step.
4. **The Mastra client is generic** at `tools/dev-workflow-v3/src/infra/external-clients/mastra/`:
   instance creation, an agent factory taking a model string and instructions, a
   workspace factory taking a path, and the ask-user tool. Nothing that knows our
   domain.
5. **Shell wires everything**: constructs clients, adapters and commands, passes
   functions into `buildWorkflow.execute`, registers the graphs on the Mastra
   instance, and starts runs. Shell defines no steps.
6. **Delete** the workflow, agent and workspace files currently under the app's
   external-client folders.
7. **Finish with** `pnpm verify` green and a real run of issue 548 producing a pull
   request with the review cycle included.

## 13. Handover state, as of the session that stopped here

### The working tree is not clean

Uncommitted, and deliberately so:

```text
.riviere/configurations/app.ts                        /mastra location removed
.riviere/roles.ts                                     three invented roles and the ReviewCycle entry removed
.riviere/role-definitions/agent-configuration.md      deleted
.riviere/role-definitions/workflow-definition.md      deleted
.riviere/role-definitions/workspace-configuration.md  deleted
docs/architecture/adr/ADR-002-...                     /mastra section removed
plan.md                                               this file
```

Everything under `packages/dev-workflow-v3` and `tools/dev-workflow-v3` is at its last
commit and compiles. The code there is the version Nick rejected: steps build value
objects, and the workflow graphs sit in the app's framework folders.

### The rules Nick set, in his words where possible

1. A use case builds its own domain values. A step never constructs a value object.
2. A use case does not depend on another use case.
3. `buildWorkflow` builds the steps. Each step invokes a use case. `buildWorkflow` takes
   plain functions in its `execute` method. Shell passes the concrete functions by
   wiring in the use cases. Shell defines no steps.
4. Mastra is an external client. Generic framework code knows nothing about the domain.
5. Do not change `.riviere` or the ADRs. If the work appears to need it, stop and ask.
6. The app must not import domain types.

### What `plan.md` section 12 asked for, and what is left

Section 12 is still the work list. Nothing in it is done, other than the decision
itself. The command layer was converted to plain data twice and reverted twice, so treat
it as not started.

### Faults found by the real run of issue 548, each already fixed in the rejected code

These came out of a real end to end run and must not be lost:

1. A fresh worktree has no dependencies installed, so checks cannot run. There is an
   install step before verification.
2. The CLI ran the built `dist` of the packages, so code changes had no effect. Run it
   with `NODE_OPTIONS=--conditions=@living-architecture/source`.
3. `gh pr create` has no `--json` flag. Create, then `gh pr view <branch> --json number,url`.
4. A retry hit an existing branch, worktree, commit and pull request. All four are now
   reused rather than failing.
5. The branch was cut from the current branch, dragging the factory work into the pull
   request. Cut it from `origin/main`.
6. The implementer asked a question and the step treated it as a failure. The step
   suspends with the question, and resuming answers it.
7. Reviewer instructions must be read from `tools/dev-workflow-v2/agents/<reviewer>.md`,
   not rewritten. That is what "preserve the existing workflow functionality" means.

### What has been proven working

Issue 548 reached pull request 550 with a real model: plan, approval, implementation,
verify, commit, push, pull request, and a comment marking it ready. The review cycle ran
as a stub. Pull request 550 is still open and its content is three files.

### Verify is red, and why

`pnpm verify` fails at role check: `Unconfigured sub-location 'mastra'`, `Location
'/shell' cannot import location '/domain'`, and `ReviewCycle` is not in
`approvedInstances`. All three follow from removing the invented configuration. Section
12 removes the causes in the code; the `ReviewCycle` approval is a domain decision that
needs Nick.

## 14. The section 12 refactor, as built

Section 12 is done, with three differences from how it was written. `pnpm verify` is
green and every package with a test target is at 100% coverage.

**The graphs are a port and an adapter, in four layers.** This is the shape Nick
described, rather than one use case that knows Mastra.

```text
domain model   SoftwareFactoryWorkflow.singleton()   the two workflows, as steps in order,
                                                     with the looped step marked
domain port    AdaptWorkflow<Built>                  takes our plan and the step behaviour
                                                     the workflow owns, returns a workflow in
                                                     whatever framework the adapter chooses
adapter        adaptWorkflowToMastra()               orders the steps by the plan, refuses a
                                                     plan step with no behaviour, hands the
                                                     whole thing to the generic client
external       createMastraWorkflow()                 createStep and createWorkflow, the loop,
client         createMastraStorage()                 the nested workflow, the agent factory,
               createAgentFactory()                  the workspace and the ask user tool
               createWorkspace()                     knows nothing about our domain
               createAgentGeneration()
               createAskUserTool()
use case       BuildWorkflow.execute()               builds our plan and the plain functions,
                                                     passes them to the adapter, returns the
                                                     two Mastra workflows
shell          main.ts                               constructs every client, adapter and
                                                     command, wires the functions, registers
                                                     the graphs and starts runs. No steps.
```

**What differs from section 12.**

1. `BuildWorkflow` lives at `commands/build-workflow.ts` in the use-cases package, as
   section 12 said. It imports `@mastra/core` for the `Workflow` type only.
2. The graphs are not in a command use case. The Mastra work is in
   `adapters/mastra/adapt-workflow.ts` and `infra/external-clients/mastra/`.
3. `validate-pull-request` is gone. The step only ever re-ran the title and description
   rules, and `OpenPullRequest` already applies them, so the step had nothing of its
   own to do. The software factory workflow is fifteen steps, not sixteen.

**Two configuration changes, both agreed.** `eslint.config.mjs` allows `@mastra/core`
imports in the `dev-workflow-v3` projects, because `core` is Mastra's folder and not
ours, and raises the line limit for those projects to 900.

**Prompts live with the workflow.** The planner and implementer instructions, the
prompts and the pull request wording sit beside the steps in `build-workflow.ts`. The
app supplies one generic generation function, so nothing in the app knows the domain.
Reviewer instructions are still read from `tools/dev-workflow-v2/agents/<reviewer>.md`.

**`ReviewCycle` is in `approvedInstances`.** Sections 6.2 and 10.9 already recorded it
as approved by Nick.

**A live run of issue 548, with the real review cycle.** `issue-548-14` finished with
`success` on `deepseek/deepseek-chat`. It planned, waited for approval, implemented,
verified, committed, pushed, opened pull request 550, then ran three review cycles with
the three reviewers, published their findings as review comments, waited for
CodeRabbit, addressed the feedback, and commented that it is ready for a person. The
workspace refused the agent's own push and pull request calls throughout.

The run found four faults that the stub tests could not:

1. A reviewer with a workspace needs more than one step. With `maxSteps: 1` the model
   chose a tool and the step received no answer.
2. The review steps wrote their status into `reviewerStatuses`, and `collect-verdicts`
   then asked the aggregate to record the same reviewer as a new verdict, which the
   aggregate refused. The cycle now carries the statuses it came in with and this
   cycle's verdicts separately.
3. `gh api` needs `commit_id` and `side` to place a review comment on a line. Both are
   sent now, and the head sha is read from the pull request first.
4. The cycle number no longer moves on when the cycle limit is reached, so the report
   says three cycles rather than four.

**One command, and the console waits for you.** `start-implementation` follows the run
and prints each step as it changes. When the run reaches the plan it prints the plan and
asks `Approve this plan and continue? [y/N]`. Saying yes resumes in the same process and
carries on. If the implementer asks a question, the question and the answer prompt appear
in the same console. If the console is not a terminal, the run stops and tells you to use
`resume`, so a script is never left waiting on input. At the end it prints the pull
request url and says it has not merged anything.

`pnpm factory read-implementers-plan <issue>` prints the plan for a run, and
`pnpm factory resume <issue> --model <model>` continues a run whose console was closed.

**The plan is posted on the issue.** After `draft-plan` there is a deterministic
`publish-plan` step. It posts the plan as a comment headed `## Implementer's plan`, with
the run id and the command that approves or rejects it, then the run suspends as before.
The factory workflow is sixteen steps again. `pnpm factory plan <issue>` still prints the
plan to the terminal, for scripts.

**The pull request body matches v2 again.** `draft-pull-request` is a model step, as
section 5.1 always said, and it returns the fields v2 used: commit type, commit scope,
subject, description, problem, acceptance criteria, key changes, architectural impact,
validation and notes. The body is the same eight sections, in the same order, with the
same headings:

```text
## Description
## Linked Issue            Closes #<issue>
## What Problem Does This PR Solve?
## Acceptance Criteria
## Key Changes
## Notable Architectural Changes / Impact
## Validation
## Notes
```

**Why the hello world run used all three cycles.** The evidence is in the review
comments on pull request 550.

- Cycle 1 raised the ADR-002 finding that `scripts/` is not an allowed location.
- Cycle 2 opened with "My previously raised finding is not fixed". The feedback step had
  not acted on it, because the prompt allowed the implementer to decide a finding did
  not apply.
- Cycle 3 reviewed the file in its new home under `tools/living-documentation/`, where
  the move had created genuinely new findings: a `main` role on a module with a
  side effect, and a spec that imports a module that runs on import.

So one cycle was spent on a finding the implementer argued with, and one on the fallout
of the fix. The feedback prompt now says a finding is not a suggestion, that it must be
fixed, that a genuine disagreement goes to the developer through the ask-user tool, and
that one complete pass must leave nothing for the next cycle.

**Still open.** The app has no test target, so the Progress item "tests to 100% for the
app" stays unticked. Shell is wiring and the graphs are tested in the use-cases package.
