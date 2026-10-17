# Maintainer workflow, run by Swamp

A maintainer lifecycle expressed as a [Swamp](https://swamp-club.com/manual) software factory, so that almost none of it is code this repository maintains.

The design rule, and the reason this exists:

> Any work that touches the world outside the working tree is a deterministic Swamp stage. The agent is only ever placed in the stages that need judgement.

The consequence is that the agent never runs `git`, `gh` or `pnpm`. It edits files and records typed data. Everything else is a zero-LLM Swamp workflow, or a gate that refuses to advance.

## What is here

```text
  models/@swamp/software-factory/        the factory definition, committed
  maintainer-factory.spec.ts             cross-file checks over the definition and workflows
workflows/                               the deterministic stages
  workflow-<uuid>.yaml                   named after their own id, as Swamp requires
extensions/behaviors/                    one behaviour type: git reads and forge writes
  maintainer-git.ts                      the type, its resources and its methods
  maintainer-git-commands.ts             argument construction, covered by tests
  maintainer-git-branch.ts               prepare, commit, verify
  maintainer-git-forge.ts                push, open pull request, comment, wait
  maintainer-git-schema.ts               argument and resource schemas
  maintainer-git-errors.ts               one error class per failure
  maintainer-git-execution.ts            running a planned command
  models/                                both definitions, committed
  workflows/                             the six workflows, committed
  vaults/                                the local vault definition
```

## Setup

Three steps, once per machine.

```bash
curl -fsSL https://swamp-club.com/install.sh | sh
swamp auth login
swamp repo init --tool pi --path tools/dev-workflow-v2/swamp
```

`--tool` accepts `claude`, `codex`, `opencode`, `pi`, `cursor`, `kiro`, `amp`, `copilot`, `antigravity` or a custom tool name. Nothing in this directory knows which one you picked.

## Layout

This directory is its own Swamp repository, so nothing Swamp owns appears at the root of the monorepo.

```text
tools/dev-workflow-v2/swamp/
  .swamp.yaml            the repository marker
  models/                behaviour and factory definitions
  workflows/             the six workflows
  vaults/                the local vault definition
  extensions/behaviors/  the maintainer-git behaviour type
  .swamp/                runtime data, gitignored
```

Swamp finds the repository marker by walking up from the working directory, so from inside this directory every command just works. From the repository root, point at it.

```bash
export SWAMP_REPO_DIR=tools/dev-workflow-v2/swamp
```

One variable, and everything resolves: behaviours, workflows, definitions, vaults and runtime data all live under this directory.

Two things worth knowing about that choice. `definitionsDir` in `.swamp.yaml` is not honoured, and neither is `extensionsDir`, so a root `models/` and a root `extensions/` cannot be avoided any other way.

Agent scaffolding is the exception, and it stays where the harness reads it. The Pi audit hook is committed at `.pi/extensions/swamp-audit.ts` in the repository root, not here, because Pi only loads extensions from the directory it is started in. `swamp repo upgrade` writes a second copy under this directory, which is inert and can be deleted.

## Turning it on

```bash
export SWAMP_REPO_DIR=tools/dev-workflow-v2/swamp

swamp extension pull @swamp/software-factory
swamp behavior create @living-architecture/maintainer-git maintainer-git
```

The factory definition is committed at `models/@swamp/software-factory/maintainer-factory.yaml`, so nothing needs creating or pasting. Edit that file to change the workflow. Check it with:

```bash
swamp model method run maintainer-factory validate
swamp model method run maintainer-factory describe
swamp workflow validate
```

`describe` renders the state machine and the stage and gate tables. `validate` reports the stage count, which is 12.

## Running it

Your own harness is the driver. Tell it what to do, in one sentence.

```text
Start work on issue 123 with the maintainer factory.
```

The work item is the issue number as a string. A factory work item is opaque, the stage binding is `${{ self.workItem }}`, and the behaviour parses it, refusing anything that is not a positive integer.

```bash
swamp model method run maintainer-factory status --input workItem=123
swamp model method run maintainer-factory summary --input workItem=123
```

## The stages

| Stage | Mode | The agent does | Swamp does |
| --- | --- | --- | --- |
| `preparing` | workflow | nothing | fetch origin, branch from the default branch, refuse a dirty tree |
| `confirm-plan` | interactive | reads the issue and conventions, decides the approach and records a `plan` | nothing |
| `implementing` | interactive | writes the code and tests the plan describes, records a `change` with the commit message | nothing |
| `committing` | workflow | nothing | `git add`, `git commit` with the recorded message, prove clean and ahead |
| `verifying` | workflow | nothing | `pnpm verify` |
| `submitting` | workflow | nothing | `git push`, `gh pr create` with a body composed from the recorded artefacts |
| `reviewing` | dispatch | reviews the diff, records findings and their file and line | nothing |
| `addressing` | interactive | fixes findings, re-records `change`, resolves findings | nothing |
| `awaiting-coderabbit` | workflow | nothing | polls the pull request for a review of the pushed commit |
| `publishing-findings` | workflow | nothing | posts one inline review comment per finding |
| `awaiting-human-review` | terminal | nothing | nothing |

`reviewing` carries `maxCycles: 3`. A fourth entry parks the run and needs a human `cycle-override` approval, which is the review cap expressed as configuration rather than as a counter in code.

`confirm-plan` is the plan step of this workflow, where the approach is decided and confirmed before any code is written. It has its own agent and its own context window, so the agent decides the approach without the clutter of a half written change, and `implementing` starts from the recorded plan rather than from the conversation that produced it. It is not the planning workflow, which produces a PRD and is out of scope. There is no approval gate on it.

## What the gates enforce

The agent's word is never evidence.

- `record_dispatch` before a stage's work means a work-bearing stage cannot be skipped.
- Every artefact payload is validated against a declared schema on the way in. A rejected payload is kept as `validation-<target>` and can be fed back into the retry.
- `workflow-succeeded` checks Swamp's own workflow run records, bound to this work item's run id, so a test run cannot be claimed.
- `artifact-fresh` with `recordedThisCycle` means a review does not survive a rework.
- `findings-clear` means a stage cannot advance with unresolved blocking findings.

## How findings reach the right line

The factory's `kind: findings` contract carries an id, a severity and a description, and nothing else, because it is strict. It carries no file and no line, and it is what `findings-clear` and `resolve_findings` operate on, so it cannot simply be replaced by a schema of our own.

Reviewers therefore record two artefacts. `review` uses the findings contract, so the gate can count blocking severities and the agent can resolve findings. `review-locations` pairs each finding id with a path and a line.

`publishing-findings` joins them in the behaviour and posts an inline review comment at the named line on the reviewed commit. A finding that names no line is posted as an ordinary comment rather than dropped, so nothing a reviewer recorded goes unread.

## How the commit message becomes safe

The `change` artefact declares the commit message as a required string of at most 72 characters. The workflow passes it to `git commit` as a single argument, so no shell can split it. Before that, `planCommit` rejects anything that is not a conventional commit, and that check is covered by tests rather than left to review.

```yaml
artifacts:
  - name: change
    schema:
      type: object
      additionalProperties: false
      required: [summary, commitMessage, files]
      properties:
        summary: { type: string, minLength: 1 }
        commitMessage: { type: string, minLength: 1, maxLength: 72 }
        files: { type: array, minItems: 1 }
```

## Testing it

Everything that can be checked without Swamp is checked by the repository test target.

```bash
pnpm nx test dev-workflow-v2
pnpm nx lint dev-workflow-v2
```

`maintainer-factory.spec.ts` parses the definition and every workflow and fails when they disagree: a transition to a stage that does not exist, a gate naming an artefact nobody declares, a stage that forgets to bind a required workflow input, a step calling a behaviour method that does not exist, a workflow file whose name does not match its id.

The definition's own meta-schema and graph rules cannot be checked from this repository without Swamp, so they need one command:

```bash
swamp model method run maintainer-factory validate
```

## Trying it end to end

Use a throwaway issue on a repository you do not mind a branch appearing in.

1. Run the setup steps above.
2. Create the factory and validate it.
3. Ask your agent to start work on the issue with this factory.
4. Watch the stages in the driver's output. There is no human pause before the pull request is open.
5. Inspect what was recorded at any point.

```bash
swamp model method run maintainer-factory summary --input workItem=123
swamp data query 'modelName == "maintainer-git"' --select name
```

## Not verified yet

This is the first version, and three things were built from the Swamp documentation and the published source of the first-party extensions rather than from a successful run:

- the exact position Swamp loads `workflows/` from when the behaviour sources live outside the repository root
- whether `data.latest` accepts a concatenated instance name, which is how the workflows reach `artifact-<workItem>-change`
- the shape of the review response the external reviewer produces on this repository

Each shows up immediately as a loud failure in `validate`, in expression evaluation, or in the `awaiting-coderabbit` step. None of them can corrupt a branch, because the write steps run only after a gate that needs a recorded artefact.
