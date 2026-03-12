# PRD: Architecture Role Enforcement

Keeping a codebase well organized is important for navigating the code and helping to keep the code well designed and maintainable. However, this is rarely the case because responsibilities get mixed and code gets added in different folders randomly.

To solve this problem we are going to create software-role-dsl. The DSL defines a list of roles. Each class in code, or static function that is not part of a class, must have a role. And the role defines where the code should live.

For example:

1. `domain-service` => must live in /src/{feature}/domain/
2. `cli-entrypiont` => must live in /src/{feature}/entrypoint/

Roles should be added as decorators like:

```ts
@RiviereRole(RIVIERE_ROLE.AGGREGATE)
class Loan {
   ...
}
```

Configuration should be as simple and minimal as possible:

```json
{
  roles: [
    aggregate: {
      allowedLocations: ['/src/{feature}/domain']
    }
    ...
  ]
}
```

## Objectives

1. Build a system that allows roles to be configured and enforced
2. Tool should enforce 100% codebase compliance (every class or static method outside a class must have a role decorator)
3. Start by applying to the riviere codebase itself => 100% coverage (except schema packages)
4. In riviere our roles should be generic and reusable across codebases => roles like Aggregate are common industry terms and patterns so can be used. We should not have roles specific to our domain like 'connection-extractor'
5. Create specialist subagents that can be used to apply the rules to a given piece of code and correctly determine the role(s) of the code. It should suggest refactorings where needed, for example "this code combines domain-specific and generic logic, it should be decoupled into multiple roles and each one should be located in the relevant folder"

### Implementation requirements

1. Speed is crucial. Let's try oxlint => we need to include performance diagnostics
2. When there is an error the error should provide a clear diagnostic "{role} cannot live in {location}. See {config file for allowed roles}"
3. The config file should have a json schema and be validated before being parsed.
4. The riviere codebase may require refactoring and our architecture rules may need to evolve
5. new package in riviere riviere-role-enforcement => must follow all of our existing lint rules and 100% coverage

## Plan

We must work in small iterations. Initial we need to do discovery:

1. What is our config format?
2. Do a very small POC based on some of our real code
3. Define our roles and rules - review code together to define rules and build our expert subagent that we can rly on later. Every new role added must be approved by a human user.
4. Go through the riviere codebase in iterations (one package at a time) and identify roles and required refactoring.

Each iteration should be a separate PR and we want PRs to be as small as possible.

## Phase 1 Plan

Goal: complete the discovery and proof-of-concept iteration without inventing unapproved roles or baking Riviere-specific paths into the role model.

### Scope

Phase 1 applies only to one pilot slice:

- `packages/riviere-cli/src/features/extract/**/*.ts`

Phase 1 excludes:

- `**/*.spec.ts`
- `**/__fixtures__/**`
- `.tsx` files
- schema packages
- repository-wide rollout
- decorators
- classifier subagents

### Phase 1 Outputs

Phase 1 must produce all of the following:

1. A minimal `riviere-role-enforcement` package using `oxlint`
2. A minimal config format plus JSON schema validation
3. A proof-of-concept check over one real feature slice
4. A complete file-by-file role analysis for the pilot slice
5. A human-reviewed role catalog for the pilot slice before any enforcement is treated as final

### Discovery Requirement

Phase 1 is not allowed to invent a role list and silently proceed. The role catalog for the pilot slice must come from analysis and human review.

Rules:

1. Every new role must be approved by a human user
2. Roles must be generic and reusable across codebases
3. Roles must describe responsibility, not just folder placement
4. The pilot analysis must reach 100% coverage for the selected feature slice
5. If a file mixes responsibilities, the output should say so and recommend refactoring rather than forcing a weak role

### Candidate Roles For Phase 1 Review

Currently approved role names from review:

- `cli-entrypoint`
- `command-use-case`
- `command-use-case-input`
- `command-use-case-result`
- `external-client-service`
- `cli-output-formatter`

All other Phase 1 roles still require human naming approval.

Important constraints for those names:

- role names must be generic and reusable across codebases
- role names must not include Rivière-specific language
- role names must not include pilot-feature language from the current codebase
- role names must not include words taken from the current problem domain or current feature implementation
- role names must describe responsibility rather than just folder placement

Examples of rejected naming patterns:

- names derived from the current feature, such as `extraction-*`, `enrichment-*`, or `relationship-*`
- names derived from current package structure rather than responsibility
- names that only restate a folder name

### File Groups Requiring Human Role Naming

The following responsibility groups need approved generic role names before implementation:

- `packages/riviere-cli/src/features/extract/commands/run-extraction.ts`
  - approved role: `command-use-case`
  - current responsibility: command-side workflow coordination
  - review notes:
    - command must take exactly one parameter
    - that parameter should be named `runExtractionInput`
    - that parameter type must have role `command-use-case-input`
    - the `command-use-case-input` type must live in the `commands` folder
    - command use case should follow `load -> invoke operation -> save/return`
    - current implementation does too much and mixes orchestration, decision-making, and domain concerns
    - `createModuleContexts(...)` is currently under `infra/external-clients` but appears domain-specific and should be reviewed
    - choosing between `extractDraftComponents(...)` and `loadDraftComponentsFromFile(...)` mixes loading concerns with domain invocation
    - `resolvedConfig` already being passed in suggests part of the loading step happens outside the command use case
    - `enrichPerModule(...)` plus post-checking `failedFields` in the command indicates an anemic domain model and likely missing domain behavior

- `packages/riviere-cli/src/features/extract/commands/run-extraction-input.ts`
  - approved role: `command-use-case-input`
  - planned responsibility: the single input contract for `runExtraction`

- `packages/riviere-cli/src/features/extract/commands/run-extraction-result.ts`
  - approved role: `command-use-case-result`
  - planned responsibility: the only return contract for `runExtraction`

### Approved Refactorings Identified During Role Review

- `runExtraction` must be refactored to accept a single `runExtractionInput` parameter
- `runExtractionInput` must be introduced in the `commands` folder and classified as `command-use-case-input`
- `runExtraction` must return only a `command-use-case-result`
- `runExtractionResult` must be introduced in the `commands` folder and classified as `command-use-case-result`
- the CLI options object must not be passed into the command use case directly
- the entrypoint must translate CLI options into `runExtractionInput` before invoking the command use case

### Detailed Review Notes From `runExtraction`

- loading existing values and extracting new values are not interchangeable operations
- `loadDraftComponentsFromFile(...)` is reloading existing state
- `extractDraftComponents(...)` is a domain operation and must not be treated as equivalent to loading existing state
- grouping those two branches together only because they both produce `DraftComponent[]` is a design error
- the likely missing concept is an `Extraction` aggregate that owns the current working state for this workflow
- refined direction: the aggregate may be better modeled as `ExtractionProject`, since the current workflow already centers on a project-shaped unit of work
- an `aggregate-repository` may be needed to load that aggregate
- an `aggregate-repository` must return an aggregate
- therefore an `aggregate-repository` cannot return `ModuleContext` unless `ModuleContext` is itself proven to be an aggregate
- if a candidate repository return type is not an aggregate, that is a design signal that the real aggregate has not yet been identified
- in that situation, the model must be recomposed until the aggregate boundary is explicit
- `DraftComponent[]` is not the aggregate; it is only part of the aggregate state
- `loadDraftComponentsFromFile(...)` is therefore only a partial state loader, not a valid aggregate repository on its own
- partial state loaders may exist as internal implementation details, but they must sit behind an aggregate repository that assembles the full aggregate
- the aggregate repository should load the remaining state and combine all parts into the aggregate before returning it
- repository loading should happen in the use case, not in the entrypoint
- entrypoints must not depend on repositories or datastores
- only `command-use-case` and `query-use-case` may load or save through repositories/datastores
- repositories may depend on lower-level technical helpers to access filesystem, parser state, or other tooling
- those technical helpers are not themselves repositories; they are implementation details behind the repository boundary
- if domain state requires multiple partial loaders, the repository is responsible for coordinating them and returning the assembled aggregate
- `createModuleContexts(...)` currently mixes repository-style assembly with lower-level technical helper calls and should be split accordingly
- `loadExtractionProject(...)` is currently misnamed because it returns `ts-morph`'s `Project`, not the aggregate
- if `ExtractionProject` is the aggregate, then `loadExtractionProject(...)` should evolve into the aggregate repository and return `ExtractionProject`
- `createModuleContexts(...)` should then be absorbed into the aggregate repository as internal assembly logic rather than surviving as a public boundary
- repositories may take external library clients as dependencies when needed for loading and saving
- if an external dependency is injected directly into the repository, it does not necessarily need a local wrapper role in our codebase
- external-client-service wrappers are still valid when we want an explicit boundary, but they are not mandatory for every external library call
- `ModuleContext[]` is not an aggregate; at best it appears to be part of the aggregate state and currently has unclear ownership
- `createModuleContexts(...)` is therefore suspiciously split across layers: it may be building part of an aggregate while living in infrastructure
- `detectConnectionsPerModule(...)` exposes an implementation detail in the API; the domain concept should be connection detection on the aggregate rather than `per-module` plumbing
- once the aggregate is identified, behavior may belong either on the aggregate itself or on a `domain-service` operating on that aggregate
- current direction: start by modeling enrichment behavior as a method on the aggregate rather than as a free function over decomposed state
- current direction: `extractDraftComponents(...)` should also start as a method on the aggregate, likely `ExtractionProject.extractDraftComponents(...)`, rather than as a free function over decomposed state
- `ModuleContext` remains a warning sign and should not remain as an unowned bag of state passed between layers
- `extractDraftComponents(...)` currently looks like procedural plumbing around lower-level extraction behavior rather than a well-shaped boundary
- current direction: the aggregate should expose two public operations in sequence: `extractDraftComponents(...)` as the first step, then `enrichComponents(...)` as the second step
- lower-level deterministic extraction logic such as `extractComponents(...)` can remain beneath the aggregate boundary as internal domain logic or a domain service
- current direction: the current `runExtraction` flow likely hides two distinct command use cases rather than one
- entrypoints must not compose multiple use cases; if composition is needed, that is a design warning sign that the boundary is wrong
- likely split:
  - `extract-draft-components` as one `command-use-case`
  - `enrich-draft-components` as a second `command-use-case`
- based on the current code, `detect-connections` is not yet a standalone `command-use-case`
- current code requires enrichment output before connection detection can run
- therefore connection detection currently belongs inside the second use case rather than as a third independently invokable use case
- each command use case may load the aggregate through a different repository method
- accepted CLI compromise for now: keep a single `extract` CLI command for user ergonomics
- the `extract` entrypoint may choose which single `command-use-case` to invoke based on validated flags
- this is an intentional UX trade-off rather than the ideal architectural shape
- even with one CLI command, each invocation should still dispatch to exactly one `command-use-case`
- likely repository-level distinction:
  - load from source/project state for fresh draft extraction
  - load from persisted draft state for enrichment/resume flows
- this better preserves the difference between computing draft state and reloading existing draft state

### Role Enforcement Rules Confirmed During Review

- `command-use-case` may accept only one parameter
- that parameter must have role `command-use-case-input`
- `command-use-case-input` must live in `/commands`
- `command-use-case` may return only `command-use-case-result`
- `command-use-case-result` must live in `/commands`
- the role-enforcement rule must support `allowedInputs` and `allowedOutputs`
- initial command rule configuration should enforce:
  - `allowedInputs: ["command-use-case-input"]`
  - `allowedOutputs: ["command-use-case-result"]`

### External Client Rules Confirmed During Review

- approved role: `external-client-service`
- generic location rule: `/infra/external-clients/{external-service-name}/{service}.ts`
- alternative acceptable structure: `/infra/external-clients/{external-service-name}/{service-name}.ts`
- for the current code, ts-morph-related technical helpers should be grouped under a `ts-morph` external service boundary
- current likely candidates for this role:
  - `findModuleTsConfigDir(...)`
  - `createConfiguredProject(...)`
  - `loadExtractionProject(...)`
- these helpers should not be treated as repositories; they are technical services used behind a repository boundary

### CLI Output Rules Confirmed During Review

- approved role: `cli-output-formatter`
- generic location rule: `/infra/cli/output/{formatter}.ts`
- presenters in the CLI should use this role instead of a generic presenter role
- current likely candidate for this role:
  - `packages/riviere-cli/src/features/extract/infra/mappers/present-extraction-result.ts`
- current refactoring notes:
  - it should move out of `infra/mappers`
  - it should live under the CLI output boundary
  - it should not depend on the raw CLI options object
  - it should format `command-use-case-result`, not a domain result type

- `packages/riviere-cli/src/features/extract/domain/extract-draft-components.ts`
  - responsibility: performs the first core transformation from analysis context to draft artifacts

- `packages/riviere-cli/src/features/extract/domain/enrich-per-module.ts`
  - responsibility: reconciles and upgrades intermediate artifacts while enforcing consistency

- `packages/riviere-cli/src/features/extract/domain/detect-connections-per-module.ts`
  - responsibility: infers relationships between already identified artifacts

- `packages/riviere-cli/src/features/extract/domain/extraction-result.ts`
  - responsibility: defines the stable result type returned by the feature workflow

- `packages/riviere-cli/src/features/extract/infra/external-clients/create-module-contexts.ts`
- `packages/riviere-cli/src/features/extract/infra/external-clients/load-extraction-project.ts`
- `packages/riviere-cli/src/features/extract/infra/external-clients/create-configured-project.ts`
- `packages/riviere-cli/src/features/extract/infra/external-clients/find-module-tsconfig-dir.ts`
  - responsibility: wrap technical integration with filesystem, tsconfig discovery, globbing, and static analysis tooling

- `packages/riviere-cli/src/features/extract/infra/mappers/present-extraction-result.ts`
  - responsibility: translate workflow results into user-facing output

### Current Pilot Coverage State

The pilot slice is fully enumerated. `command-use-case` is approved for `run-extraction.ts`. The remaining role names still require human approval.

### Annotation Format For The POC

For Phase 1 we use explicit comment annotations, not decorators:

```ts
/** @riviere-role <approved-role-name> */
export function example() {
  ...
}
```

Supported in Phase 1:

- top-level class declarations
- top-level function declarations
- top-level exported function expressions assigned to variables
- static methods on top-level classes

Not supported in Phase 1:

- nested functions
- non-exported internal callbacks
- `.tsx` files
- automatic fixes

### Generic Config Shape

The config format must stay minimal and generic.

```yaml
include:
  - <pilot include patterns>

ignorePatterns:
  - '**/*.spec.ts'
  - '**/__fixtures__/**'

roles:
  - name: <approved-role-name>
    targets: [class, function, static-method]
    allowedLocation:
      - /src/{feature}/...
```

Important:

- `allowedLocation` entries must be generic patterns
- generic patterns may use placeholders such as `/src/{feature}/...`
- the Rivière pilot may map those placeholders onto real paths, but the role definitions themselves must remain reusable

### Phase 1 Pilot Workflow

1. Analyze every non-test `.ts` file in `packages/riviere-cli/src/features/extract`
2. Produce a file-by-file classification table with proposed generic roles and rationale
3. Identify mixed-responsibility files and required refactors
4. Review and approve the role set with a human
5. Configure the POC with only approved roles
6. Annotate the pilot slice
7. Run `oxlint` and verify 100% compliance for the pilot slice

### Enforcement Rules For The POC

Once the pilot role catalog is approved, the POC enforces only these checks:

1. Every supported in-scope symbol must have exactly one `@riviere-role` annotation
2. The assigned role must exist in config
3. The assigned role must allow the symbol kind
4. The assigned role must allow the file location

Required diagnostic shape:

- `{role} cannot live in {location}. See {config file}`

Additional diagnostics may include:

- missing role assignment
- unknown role
- malformed annotation
- duplicate annotation

### Testing

Phase 1 must include:

- config validation tests
- annotation parsing tests
- target extraction tests
- role checking tests
- one integration test that runs the package entrypoint against fixture files
- performance diagnostics for the oxlint-based check

### Success Criteria

Phase 1 is complete when:

1. `packages/riviere-role-enforcement` exists and is testable
2. the config file has schema validation
3. `oxlint` runs the custom enforcement rule successfully
4. the selected pilot slice has a reviewed file-by-file role analysis
5. the selected pilot slice reaches 100% compliance using only human-approved roles
6. diagnostics are clear enough for humans and AI tools to act on
7. the change remains a small, focused first PR
