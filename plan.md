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
- [ ] Review this plan
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

- [ ] A step starts another workflow, and `.dountil` loops over it
- [ ] `autoResumeSuspendedTools` resumes a suspended tool from the next chat message
- [ ] A file based agent loads from `src/mastra/agents/{agent}/` and passes role check
- [ ] A workspace `beforeToolCall` hook refuses an `EXECUTE_COMMAND` call with `proceed: false`
- [ ] Findings recorded, and this plan corrected where the docs were wrong

### Slice 1: domain-model package

- [ ] Create the package, tsconfig files, vitest config, `description`
- [ ] Value objects: issue, worktree, plan, approval, outcome, verification, commit, pull request, findings, verdicts, cycle, limit, model
- [ ] Domain ports and their errors
- [ ] Tests to 100%
- [ ] Pull request raised, `pnpm verify` green, reviewed and merged

### Slice 2: use-cases package

- [ ] Commands: prepare branch, verify, commit, push, open pull request, publish findings, close cycle
- [ ] Queries: load issue, read pull request feedback
- [ ] Data access: none
- [ ] Adapters: git, github, checks
- [ ] External clients: git, github, process
- [ ] Tests to 100%
- [ ] Pull request raised, `pnpm verify` green, reviewed and merged

### Slice 3: the app and the deterministic workflow

- [ ] CLI entrypoints: start, resume, chat, status, runs
- [ ] CLI presentation: output, formatters, writer
- [ ] `shell/main.ts` and the Mastra instance
- [ ] `start-implementation` with steps 1 to 14, with the model steps stubbed
- [ ] `--model` as a required flag on every command that starts or resumes a run
- [ ] Run id and thread id from the issue number
- [ ] Tests to 100%
- [ ] Pull request raised, `pnpm verify` green, reviewed and merged
- [ ] Pull request raised, `pnpm verify` green, reviewed and merged

### Slice 4: the model steps

- [ ] `draft-plan` and the `planner` agent
- [ ] `implement` and the `implementer` agent
- [ ] `ask-user` tool, `autoResumeSuspendedTools`, `chat` entrypoint
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

```ts
// workflows/review-cycle.ts
export const reviewCycle = createWorkflow({
  id: 'review-cycle',
  inputSchema: ReviewCycleInput,
  outputSchema: ReviewCycleResult,
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

```ts
const reviewCycleStep = createStep({
  id: 'review-cycle',
  inputSchema: ReviewCycleInput,
  outputSchema: ReviewCycleResult,
  execute: async ({ inputData, mastra }) => {
    const nested = mastra.getWorkflow('review-cycle')
    const run = await nested.createRun({ runId: `${inputData.runId}-review-${inputData.cycle}` })
    const result = await run.start({ inputData })
    if (result.status !== 'success') throw new ReviewCycleFailed(inputData.cycle, result.status)
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
    read-issue.ts                    domain-port
    prepare-worktree.ts              domain-port
    run-project-checks.ts            domain-port
    commit-work.ts                   domain-port
    push-branch.ts                   domain-port
    open-pull-request.ts             domain-port
    publish-review-findings.ts       domain-port
    read-pull-request-feedback.ts    domain-port
    wait-for-reviewer.ts             domain-port
```

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
  queries/
    load-issue.ts
    read-pull-request-feedback.ts
  adapters/
    git/
    github/
    checks/

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
    agents/{agent}/
      config.ts               proposed role: agent-configuration
      instructions.md         text, not role checked
    workflows/
      start-implementation.ts proposed role: workflow-definition
      review-cycle.ts         proposed role: workflow-definition
    workspace.ts              proposed role: workspace-configuration
  shell/
    main.ts                   main
```

Mastra's file-based agents mean an agent is a folder of configuration plus markdown, not a class with behaviour. `config.ts` names the model and the options, and `instructions.md` holds the prompt. That is why none of it belongs in `shell`, and why there is almost no code in it.

This layout does not fit ADR-002 today. It needs three new roles in `.riviere/roles.ts` and a `/mastra` location in `.riviere/role-enforcement.config.ts`, with ADR-002 changed at the same time. You approved this at review time.

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
15. **Agents, workflows and the workspace configuration live in `/mastra` in the app.** They are neither shell nor use cases. This needs three new roles, `agent-configuration`, `workflow-definition` and `workspace-configuration`, added to `.riviere/roles.ts`, `.riviere/role-enforcement.config.ts` and ADR-002 together.

## 11. Blockers, unknowns and questions

None outstanding. Everything raised during review is answered and recorded in section 10.

The one thing still unproven is Mastra's own behaviour, which slice 0 settles.
