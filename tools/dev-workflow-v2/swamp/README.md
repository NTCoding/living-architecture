# Maintainer workflow, run by Swamp

The implementation half of the maintainer lifecycle, expressed as a [Swamp](https://swamp-club.com/manual) software factory. It runs from starting work on an issue to a pull request awaiting review. Planning is a different workflow and is out of scope here.

The design rule, and the reason this exists:

> Any work that touches the world outside the working tree is a deterministic Swamp stage. The agent is only ever placed in the stages that need judgement.

So the agent never runs `git`, `gh` or `pnpm`. It edits files and records data that a declared schema validates. Everything else is a zero-LLM Swamp workflow, or a gate that refuses to advance.

## Layout

This directory is its own Swamp repository, so nothing Swamp owns appears at the root of the monorepo.

```text
tools/dev-workflow-v2/swamp/
  .swamp.yaml                             the repository marker
  .gitignore                              ignores .swamp/
  AGENTS.md                               Swamp's managed instructions
  README.md                               this file
  maintainer-factory.spec.ts              cross-file checks over the definition and workflows
  models/
    @swamp/software-factory/              the factory definition, the state machine
    @living-architecture/                 the behaviour definition
  workflows/                              the six deterministic workflows
    workflow-<uuid>.yaml                  named after their own id, as Swamp requires
  vaults/local_encryption/                the local vault definition
  extensions/
    behaviors/                            the maintainer-git behaviour type
      maintainer-git.ts                   the type, its resources and its methods
      maintainer-git-commands.ts          argument construction, covered by tests
      maintainer-git-branch.ts            prepare, commit, verify
      maintainer-git-forge.ts             push, pull request, comments, wait
      maintainer-git-schema.ts            argument and resource schemas
      maintainer-git-errors.ts            one error class per failure
      maintainer-git-execution.ts         running a planned command
      maintainer-git-commands.spec.ts     tests for the above
      npm-zod.d.ts                        declares the npm: specifier Swamp imports
      deno-globals.d.ts                   declares the slice of Deno a method may use
    models/upstream_extensions.json       Swamp's extension bookkeeping
  tsconfig.json                           type checks the behaviour with the repository compiler
  .swamp/                                 runtime data, gitignored
```

One Swamp file lives outside this directory: `.pi/extensions/swamp-audit.ts`. Pi only loads extensions from the directory it is started in, so the audit hook has to be at the repository root. `swamp repo upgrade` writes a second copy under this directory, which is inert and can be deleted.

Swamp finds the repository marker by walking up from the working directory, so from inside this directory every command works. From the repository root, one export points at it.

```bash
export SWAMP_REPO_DIR=tools/dev-workflow-v2/swamp
```

That one variable resolves everything: behaviours, workflows, definitions, vaults and runtime data.

Two constraints forced this shape. Swamp needs `models/`, `workflows/`, `vaults/` and `extensions/` at whichever root it resolves, and `definitionsDir` and `extensionsDir` are not read from `.swamp.yaml`, so a root `models/` and a root `extensions/` could not be avoided. Symlinks are not followed either. Giving the tool its own repository root was the only layout that left the monorepo root clear.

## Setup

Three steps, once per machine.

```bash
curl -fsSL https://swamp-club.com/install.sh | sh
swamp auth login
swamp repo init --tool pi --path tools/dev-workflow-v2/swamp
```

`--tool` accepts `claude`, `codex`, `opencode`, `pi`, `cursor`, `kiro`, `amp`, `copilot`, `antigravity` or a custom tool name. Nothing in this directory knows which one you picked.

Then, from the repository root:

```bash
export SWAMP_REPO_DIR=tools/dev-workflow-v2/swamp

swamp extension pull @swamp/software-factory
swamp behavior create @living-architecture/maintainer-git maintainer-git
```

The factory definition is committed at `models/@swamp/software-factory/maintainer-factory.yaml`, so nothing needs creating or pasting. Edit that file to change the workflow, then check it.

```bash
swamp model method run maintainer-factory validate
swamp model method run maintainer-factory describe
swamp workflow validate
```

`describe` renders the state machine, the stage table and the gate table. `validate` reports the stage count, which is 12.

## Running it

Your own harness is the driver. Tell it what to do in one sentence.

```text
Start work on issue 123 with the maintainer factory.
```

The work item is the issue number as a string. A factory work item is opaque, the stage binding is `${{ self.workItem }}`, and the behaviour parses it, refusing anything that is not a positive integer.

```bash
swamp model method run maintainer-factory status --input workItem=123
swamp model method run maintainer-factory summary --input workItem=123
```

`status` says what the current stage needs. `summary` renders the whole run as markdown with no LLM involved.

## The stages

| Stage | Mode | The agent does | Swamp does |
| --- | --- | --- | --- |
| `preparing` | workflow | nothing | fetch origin, branch from the default branch, refuse a dirty tree |
| `confirm-plan` | interactive | reads the issue and conventions, decides the approach, records a `plan` | nothing |
| `implementing` | interactive | writes the code and tests the plan describes, records a `change` with the commit message | nothing |
| `committing` | workflow | nothing | `git add`, `git commit` with the recorded message, prove clean and ahead |
| `verifying` | workflow | nothing | `pnpm verify` |
| `submitting` | workflow | nothing | `git push`, `gh pr create` with a body composed from the recorded plan and change |
| `reviewing` | dispatch | reviews the diff, records findings and their file and line | nothing |
| `addressing` | interactive | fixes findings, re-records `change`, resolves findings | nothing |
| `awaiting-coderabbit` | workflow | nothing | polls the pull request for a review of the pushed commit |
| `publishing-findings` | workflow | nothing | posts one inline review comment per finding |
| `awaiting-human-review` | terminal | nothing | nothing |

`confirm-plan` is the plan step of this workflow. It has its own agent and its own context window, so the approach is decided without the clutter of a half written change, and `implementing` starts from the recorded plan rather than from the conversation that produced it. It is not the planning workflow, which produces a PRD. There is no approval gate on it.

`reviewing` carries `maxCycles: 3`. A fourth entry parks the run and needs a human `cycle-override` approval. That is the review cap expressed as configuration rather than as a counter in code.

There is no mid-run human pause. The run ends at `awaiting-human-review`, and addressing feedback afterwards is a separate run.

## What the gates enforce

The agent's word is never evidence.

- `record_dispatch` before a stage's work means a work-bearing stage cannot be skipped.
- Every artefact payload is validated against a declared schema on the way in. A rejected payload is kept as a `validation-<target>` record that can be fed back into the retry.
- `workflow-succeeded` checks Swamp's own workflow run records, bound to this work item's run id, so a workflow step cannot be claimed as done.
- `artifact-fresh` with `recordedThisCycle` means a review does not survive a rework.
- `findings-clear` means a stage cannot advance with unresolved blocking findings.

## How findings reach the right line

The factory's `kind: findings` contract is a strict object with an id, a severity, a description and a resolution flag. It carries no file and no line, and it is what `findings-clear` and `resolve_findings` operate on, so it cannot be replaced by a schema of our own without losing the gate.

Reviewers therefore record two artefacts. `review` uses the findings contract, so the gate can count blocking severities and the agent can resolve findings. `review-locations` pairs each finding id with a path and a line. `publishing-findings` joins them and posts an inline review comment at the named line on the reviewed commit. A finding that names no line is posted as an ordinary comment rather than dropped, so nothing a reviewer recorded goes unread.

## How the commit message becomes safe

The `change` artefact declares the commit message as a required string of at most 72 characters, and the schema rejects unknown fields.

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

The workflow passes it to `git commit` as a single argument, so no shell can split it. Before that, `planCommit` rejects anything that is not a conventional commit, and that check is covered by tests rather than left to review.

## Testing it

Everything that can be checked without Swamp runs in the repository test target.

```bash
pnpm nx test dev-workflow-v2
pnpm nx lint dev-workflow-v2
```

`maintainer-factory.spec.ts` parses the definition and every workflow and fails when they disagree: a transition to a stage that does not exist, a gate naming an artefact nobody declares, a stage that forgets to bind a required workflow input, a step calling a behaviour method that does not exist, a workflow file whose name does not match its id.

The definition's own meta-schema and graph rules need Swamp, so they take one command.

```bash
swamp model method run maintainer-factory validate
```

## Trying it end to end

Use a throwaway issue on a repository you do not mind branching.

1. Run the setup steps above.
2. Validate the definition, then tell your agent to start work on the issue with this factory.
3. Watch the stages in the driver's output. There is no human pause before the pull request is open.
4. Inspect what was recorded at any point.

```bash
swamp model method run maintainer-factory summary --input workItem=123
swamp data query 'modelName == "maintainer-git"' --select name
```

## What has not been run

The definition, the six workflows and the behaviour have all been validated and the behaviour has executed. What has not happened is a full lifecycle against a real issue, so these remain unproven:

- whether `data.latest` accepts a concatenated instance name, which is how `maintainer-commit` and `maintainer-submit` reach `artifact-<workItem>-plan` and `artifact-<workItem>-change`
- the shape of the review response `awaiting-coderabbit` matches on
- whether `gh api` places an inline review comment where intended, given `side=RIGHT` and a numeric `line`

Each fails loudly rather than quietly. None of them can corrupt a branch, because every step that writes runs only after a gate that needs a recorded artefact.
