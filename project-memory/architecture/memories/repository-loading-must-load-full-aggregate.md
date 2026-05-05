---
status: approved
dateAdded: 2026-05-05
systemAreas:
  - global
  - riviere-cli
architectureConcepts:
  - boundary-placement
  - component-responsibility
  - project-conventions
  - riviere-role-understanding
source: conversation: aggregate repository loading discussion during riviere-extraction-workflows-v1
---

# Repository loading must load the full aggregate

## Memory

During planning of `riviere-extraction-workflows-v1`, it took multiple iterations to design the repository loading method for replacing `ExtractionProject`.

We repeatedly failed to decouple use-case-specific inputs from loading the aggregate itself. The failure pattern was designing repository inputs around what one command wanted to do, rather than around what state the aggregate is.

Important note: a repository loads and saves a full aggregate. That is the key principle to keep in mind when designing an aggregate repository. Anything that starts selectively loading parts of an aggregate is a major red flag.

## Rejected options from the discussion

### Rejected: loading by use-case-specific source mode

```ts
projects.load({
  configPath: input.configPath,
  sourceMode: input.sourceMode,
  files: input.files,
  baseBranch: input.baseBranch,
  useTsConfig: input.useTsConfig,
})
```

Why this was wrong:

`sourceMode` was CLI/input-validation context. It existed to interpret flags such as `--files` and `--pr`, and to validate that the right parameters were provided. It was not project-loading state.

The repository should not receive CLI mode vocabulary unless architecture explicitly approves that vocabulary as domain language.

### Rejected: loading different project shapes for extraction, enrichment, or workflow

```ts
projects.load({
  source: {
    kind: 'draft-enrichment',
    configPath: input.configPath,
    draftComponentsPath: input.draftComponentsPath,
  },
})
```

Why this was wrong:

There is no such thing as an “enrichment load” of the project. The repository loads the project aggregate. Enrichment is an operation performed on the loaded project.

The same mistake appeared with `kind: 'extraction-config'` and workflow/use-case-specific source variants. These shapes made the repository load input describe a command path rather than aggregate identity.

### Rejected: selectively loading only the files this command wants

```ts
const sourceFilePaths =
  input.sourceMode === 'pull-request'
    ? this.resolveChangedSourceFilePaths(allSourceFilePaths, input.baseBranch)
    : input.sourceMode === 'files'
      ? this.resolveSelectedSourceFilePaths(allSourceFilePaths, input.files ?? [])
      : allSourceFilePaths
```

Why this was wrong:

That selectively loads part of the aggregate based on the use case. If the aggregate is a project, the repository should load the full project. The use case then invokes an operation that may operate on a subset of the already-loaded project.

Selected files and changed files are operation-specific inputs, not different versions of the project aggregate.

### Rejected: passing operation options into repository loading

```ts
projects.load({
  configPath: input.configPath,
  includeConnections: input.includeConnections,
  allowIncomplete: input.allowIncomplete,
})
```

Why this was wrong:

`includeConnections` and `allowIncomplete` change what the extraction operation does. They do not identify project state and do not belong in repository loading.

### Rejected: inventing another aggregate to avoid resolving the load design

```ts
ExtractionRunRepository -> ExtractionRun
```

Why this was wrong:

This introduced a second new aggregate without approval. It avoided the real question: what is the aggregate being loaded, and what state does it fully own?

A new aggregate must be approved because it owns a real consistency boundary or lifecycle, not because it makes a loading problem temporarily disappear.

## Useful distinction that emerged

Keep this split explicit:

```text
Repository:
  loads the full aggregate state

Use case:
  invokes the aggregate operation

Operation input:
  says what this command run wants the operation to do
```

For example:

- project identity/config inputs can belong to aggregate loading
- selected files, changed files, draft components, `includeConnections`, and `allowIncomplete` are operation-specific unless the approved architecture says otherwise
- CLI modes are CLI/input-validation context unless explicitly approved as domain language

## Why this matters

When repository loading accepts use-case-specific inputs, the repository quietly becomes a command router and partial aggregate loader. That makes the design look implementable while hiding the real modelling problem.

A replacement task must not ask the implementer to discover this during implementation. If the repository load shape is unclear, architecture is incomplete.

## Consider this when

- Designing an aggregate repository.
- Replacing an aggregate or aggregate repository.
- Reviewing a task that says “remove X” when existing behaviour must continue through a replacement.
- A repository load input contains CLI flags, modes, operation names, selected files, changed files, or operation options.
- A design proposes loading only the part of an aggregate needed for one command.
- A new aggregate is proposed while the actual loaded state boundary is still unclear.

## Do not apply automatically when

- The value genuinely identifies the persisted aggregate state.
- The approved architecture explicitly says a mode or selection is part of the aggregate identity.
- The code is read-side/query behaviour rather than command-side aggregate loading.
- The user has explicitly approved a tactical exception and the architecture records the debt.

## Clarify with the user when

- It is unclear whether an input identifies aggregate state or configures one operation.
- A repository load method appears to exist for one use case.
- A repository load input includes CLI vocabulary.
- A design loads a value object directly instead of loading the aggregate that owns it.
- A proposed replacement removes an old repository but does not show how the full replacement aggregate is loaded.

## Related references

- `docs/project/PRD/riviere-extraction-workflows-v1/ARCH.md`
- `.riviere/role-selection-guide.md`
- `.riviere/role-definitions/aggregate.md`
- `.riviere/role-definitions/aggregate-repository.md`
- `.riviere/role-definitions/command-use-case.md`
