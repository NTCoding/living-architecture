# Repository Factory Map

This map routes factory-optimization analysis to the correct factory source files. It is not a duplicated rule inventory. Source files are authoritative at command execution time, so an optimization agent must read the relevant source files directly before proposing a change.

Use this map for three things only:

1. Identify which factory surface can catch a class of issue.
2. See concrete examples of issue patterns each surface is suited to handle.
3. Find the source files and verification commands needed for source inspection.

Do not treat any example below as exhaustive or source truth. Read the source.

## Factory Execution Pipeline

### Local commit gate

Read these source files directly:

- `.husky/pre-commit`
- `.husky/commit-msg`
- `package.json`

Use this surface when an optimization needs to run before a developer can commit.

Example issue patterns:

| Issue pattern | Source files to inspect | Factory route |
| --- | --- | --- |
| A new deterministic guardrail exists but does not run locally | `.husky/pre-commit`, `package.json`, root `project.json` | Wire the target into the local verification path rather than documenting it only |
| A generated artifact can be stale at commit time | `.husky/pre-commit`, package generation scripts, `check-generated-docs` targets | Add or reuse a generated-doc check in the local gate |
| Commit messages violate project history style | `.husky/commit-msg`, commitlint config | Adjust commit-message enforcement rather than review guidance |

Verification sources:

- Local gate command observed in `package.json`
- Hook contents observed in `.husky/pre-commit` and `.husky/commit-msg`

### Pull request CI gate

Read these source files directly:

- `.github/workflows/ci.yml`
- `nx.json`
- root `project.json`
- affected package `project.json` files

Use this surface when an optimization must block a pull request after push.

Example issue patterns:

| Issue pattern | Source files to inspect | Factory route |
| --- | --- | --- |
| A local check exists but does not run in PR CI | `.github/workflows/ci.yml`, `nx.json`, relevant `project.json` | Add the target to affected CI or target dependencies |
| A quality gate is only run on main | `.github/workflows/ci.yml` | Move or duplicate the gate into the PR workflow |
| A generated-doc or smoke-test failure can reach review | `.github/workflows/ci.yml`, package targets | Add a CI job or affected target coverage |
| An external scanner is the authoritative check | `.github/workflows/ci.yml`, external scanner config | Configure CI to fail on the scanner result |

Verification sources:

- Workflow job definitions in `.github/workflows/ci.yml`
- Nx target dependency graph in `nx.json`
- Root and package targets in `project.json` files

## Enforcement Surfaces

### ESLint and custom rules: syntax, imports, naming, tests, and local code shape

Read these source files directly:

- `eslint.config.mjs`
- `.eslint-rules/no-generic-names.js`
- `packages/riviere-extract-conventions/src/eslint/*.cjs`
- `packages/riviere-extract-conventions/src/eslint/*.spec.ts`

Use this surface when the issue can be detected from one file's syntax, AST shape, import declarations, filename, class name, test structure, or deterministic metadata.

Example issue patterns:

| Issue pattern | Concrete violating example | Source files to inspect | Factory route |
| --- | --- | --- | --- |
| Required data is hidden by a silent fallback | `const owner = issue.owner ?? ''` when `owner` must exist | `eslint.config.mjs`, relevant convention docs | Add or adjust a selector/custom rule that rejects unsafe fallback shapes |
| Product code introduces generic names | `src/platform/helpers/date-helper.ts` or `class DataManager` | `.eslint-rules/no-generic-names.js`, `eslint.config.mjs` | Extend the naming rule if the forbidden fragment is structurally detectable |
| Entrypoint gains business logic | CLI entrypoint parses input and also computes domain decisions in private helpers | `eslint.config.mjs`, dependency rules, ADR-002 | Use ESLint for local function/complexity shapes; use dependency rules for imports |
| Test title and assertion drift apart | `it('returns only active users')` asserts only `result.length` | Vitest ESLint config, custom rule specs | Add a Vitest/custom rule only when the mismatch has a deterministic shape |
| TypeScript escape hatch hides a bug | `value as KnownType`, `any`, or non-null assertion in production code | `eslint.config.mjs` | Adjust TypeScript safety rules or add a specific selector |
| Public API documentation is omitted | Exported public API type has no required JSDoc in a public entry file | `eslint.config.mjs`, public API file patterns | Adjust JSDoc rule scope or public API file selection |
| Comment explains implementation instead of code being self-documenting | Inline comment compensates for unclear control flow | `eslint.config.mjs`, convention docs | Use lint only for comment presence; use review guidance for semantic naming quality |

Configuration mechanics:

- `no-restricted-syntax` is the route for one stable selector.
- A custom ESLint rule is the route for path-aware logic, multi-node AST logic, fixer logic, or accepted/rejected fixtures.
- `.eslint-rules/no-generic-names.js` is the existing naming-specialized rule surface.
- Rule tests belong next to custom rules when the rule has its own implementation.

Verification commands:

- `pnpm exec nx affected -t lint --verbose`
- `pnpm exec nx test riviere-extract-conventions`
- `pnpm run verify`

### Riviere role enforcement: architectural roles and declaration contracts

Read these source files directly:

- `.riviere/role-enforcement.config.ts`
- `.riviere/roles.ts`
- `.riviere/role-definitions/**`
- `.riviere/canonical-role-configurations.md`
- `packages/riviere-role-enforcement/src/**`
- `packages/riviere-role-enforcement/role-enforcement-plugin.mjs`

Use this surface when the issue is about exported declaration responsibility, allowed role location, role-to-role dependency, public method count, role-specific naming, or function/class input/output role contracts.

Role definition example:

```typescript
role('command-use-case', {
  targets: ['class', 'function'],
  allowedInputs: ['command-use-case-input'],
  allowedOutputs: ['command-use-case-result'],
  forbiddenDependencies: ['command-use-case'],
  minPublicMethods: 1,
  maxPublicMethods: 1,
})
```

Annotated code example:

```typescript
/** @riviere-role command-use-case-input */
export interface EnrichComponentInput {
  readonly componentId: string
}

/** @riviere-role command-use-case-result */
export interface EnrichComponentResult {
  readonly changed: boolean
}

/** @riviere-role command-use-case */
export class EnrichComponent {
  execute(input: EnrichComponentInput): EnrichComponentResult {
    return { changed: true }
  }
}
```

Example issue patterns:

| Issue pattern | Concrete violating example | Source files to inspect | Factory route |
| --- | --- | --- | --- |
| Exported declaration has the wrong responsibility for its folder | `domain/save-to-database.ts` exports `@riviere-role external-client-service` | `.riviere/role-enforcement.config.ts`, `.riviere/roles.ts` | Adjust allowed roles for the location or add a missing location |
| Use case accepts unclassified input | `execute(input: RawCliOptions)` where the type has no input role | `.riviere/roles.ts`, plugin input/output checks | Add or adjust `allowedInputs` and fixtures |
| Use case returns an unapproved output role | Command returns a query model or raw infrastructure response | `.riviere/roles.ts`, role definitions | Add/adjust `allowedOutputs` or split result roles |
| Peer use cases compose each other | One command imports another `command-use-case` and calls it | `.riviere/roles.ts`, role-enforcement tests | Add/adjust `forbiddenDependencies` |
| Wiring layer calls collaborators directly | `main` calls `RunCommand.execute()` instead of only constructing wiring | `.riviere/roles.ts`, forbidden-method-call tests | Add/adjust `forbiddenMethodCalls` |
| Class exposes too much public behavior | Command class has `execute`, `validate`, and `format` public methods | `.riviere/roles.ts`, public method checks | Add/adjust `minPublicMethods` and `maxPublicMethods` |
| Role name convention is too weak | Aggregate or use-case name hides responsibility | `.riviere/roles.ts`, role definition docs | Add/adjust `nameMatches` or `allowedNames` |

Simplified location concept example:

This is an illustrative shape, not a source-of-truth copy. Inspect `.riviere/role-enforcement.config.ts` for actual locations, allowed roles, and forbidden imports.

```typescript
location<RoleName>('src/features/{feature}')
  .subLocation('/entrypoint', ['cli-entrypoint'], {
    forbiddenImports: ['**/infra/persistence/**'],
  })
  .subLocation('/commands', commandRoles, {
    forbiddenImports: ['**/infra/cli/**'],
  })
  .subLocation('/domain', domainRoles)
```

Decision boundary:

- Use role enforcement when the rule depends on `@riviere-role` annotations or exported declaration contracts.
- Use dependency-cruiser when the rule is only about path-to-path imports or folder shape.

Verification commands:

- `pnpm exec nx run @living-architecture/source:role-check`
- `pnpm exec tsx packages/riviere-role-enforcement/src/shell/bin.ts .riviere/role-enforcement.config.ts --package <package-path>`
- `pnpm exec nx test riviere-role-enforcement`

### Dependency Cruiser: path-level architecture and import graph rules

Read these source files directly:

- `.dependency-cruiser.mjs`
- `.dependency-cruiser.frontend.mjs`
- `.dependency-cruiser.specs.mjs`
- `package.json`

Use this surface when the issue is a file-path, folder-shape, import-direction, cross-feature dependency, or circular-dependency problem that does not require role annotations.

Example issue patterns:

| Issue pattern | Concrete violating example | Source files to inspect | Factory route |
| --- | --- | --- | --- |
| Domain imports infrastructure | `features/billing/domain/invoice.ts` imports `features/billing/infra/persistence/repository.ts` | `.dependency-cruiser.mjs`, ADR-002 | Add/adjust a forbidden dependency rule |
| Feature imports another feature | `features/search/commands/index.ts` imports `features/users/domain/user.ts` | `.dependency-cruiser.mjs`, frontend config if applicable | Add/adjust cross-feature import rule |
| Entrypoint bypasses use cases | `entrypoint/cli.ts` imports domain objects or persistence directly | `.dependency-cruiser.mjs`, role config | Use dependency-cruiser for path import; role enforcement for exported role placement |
| Commands or queries become nested mini-apps | `features/building/commands/enrich/helpers/normalize.ts` | `.dependency-cruiser.mjs` | Add/adjust folder-shape rule |
| Spec file is detached from production code | `src/my-feature.spec.ts` at package root | `.dependency-cruiser.specs.mjs` | Add/adjust spec placement rule |
| Frontend-only folder shape is rejected or too permissive | React feature adds `hooks/` or `components/` imports that violate frontend layering | `.dependency-cruiser.frontend.mjs` | Adjust frontend-specific rules, not backend rules |
| Circular dependency hides orchestration | Command imports presenter that imports the command | Dependency-cruiser configs | Add/adjust circular dependency severity/scope |

Configuration mechanics:

- Backend/package import rules live in `.dependency-cruiser.mjs`.
- Frontend import rules live in `.dependency-cruiser.frontend.mjs`.
- Test placement rules live in `.dependency-cruiser.specs.mjs`.

Verification command:

- `pnpm depcruise`

### ADR and architecture docs: placement semantics and architectural decisions

Read these source files directly:

- `docs/architecture/adr/ADR-002-allowed-folder-structures.md`
- `docs/architecture/overview.md`
- dependency-cruiser configs when the decision is enforceable
- role-enforcement config when the decision is role-based

Use this surface when the architecture decision itself is incomplete or ambiguous. Do not use architecture docs as the only guardrail when the rule can be encoded mechanically.

Example issue patterns:

| Issue pattern | Concrete example | Source files to inspect | Factory route |
| --- | --- | --- | --- |
| New folder responsibility is missing from the architecture decision | A feature needs `infra/external-clients/<client>` but ADR-002 does not describe it | ADR-002, dependency-cruiser configs, role config | Update ADR and pair with enforceable rules |
| Existing terms are ambiguous | `platform` is used for shared domain behavior and for technical adapters without clear boundary | Architecture overview, ADR-002 | Clarify architecture docs, then enforce paths/roles if possible |
| Review agents disagree with deterministic rules | Architecture review allows a dependency that depcruise rejects | Agent instructions, ADR-002, dependency configs | Align agent guidance to the deterministic rule |
| A small package should remain flat | A package has no internal layers and deterministic structure rules would be noise | ADR-002, package `project.json`, depcruise scope | Document the exception and keep enforcement scoped |

Verification expectation:

- `pnpm lint:md`
- Relevant role-check or dependency-cruiser command when the doc decision is enforceable

### Vitest coverage and behavior tests

Read these source files directly:

- `tools/dev-workflow-v2/vitest.config.mts`
- package-level Vitest configs
- package `project.json` test targets
- tests adjacent to the affected production behavior

Use this surface when behavior can ship without deterministic proof, coverage excludes production code, or a custom rule needs fixture-level validation.

Example issue patterns:

| Issue pattern | Concrete example | Source files to inspect | Factory route |
| --- | --- | --- | --- |
| Production code is outside coverage scope | New workflow production folder is not matched by `include` | Vitest config, package test target | Adjust coverage include/exclude and add proof test |
| Coverage exclusion masks real behavior | External-client code is excluded after gaining business decisions | Vitest config, production file, nearby specs | Remove/narrow exclusion or extract testable domain behavior |
| Edge-case cluster lacks tests | Bug fix covers one missing field but not adjacent missing/null/empty cases | Relevant specs, conventions/testing docs | Add edge-case checklist or behavior tests |
| Custom lint rule lacks rejected fixture | Rule exists but only tests passing code | Rule spec file | Add rejected and accepted fixtures |
| Test passes without proving title | Assertion checks array length but not selected values | Relevant spec file, Vitest lint config | Add a behavior test or deterministic test-smell rule if detectable |

Verification commands:

- `pnpm exec nx test dev-workflow-v2`
- `pnpm exec nx affected -t test --verbose`
- `pnpm test`

### Generated documentation and generated artifacts

Read these source files directly:

- package generation scripts
- package `project.json` generated-doc targets
- `apps/docs` copy/build scripts
- generated output directories referenced by checks

Use this surface when source-of-truth files and checked generated artifacts can drift.

Example issue patterns:

| Issue pattern | Concrete example | Source files to inspect | Factory route |
| --- | --- | --- | --- |
| Generated CLI docs can become stale | Command changes do not update generated CLI reference | CLI generation script, `project.json`, generated docs | Add/update `check-generated-docs` coverage |
| Docs app copies stale package output | `apps/docs` consumes generated package docs but does not validate source freshness | Docs build scripts, package generated-doc target | Connect source generation to docs verification |
| API docs include unintended artifacts | Generated reference gains files from local build side effects | Generation config, generated output paths | Fix generation source or cleanup/check target |

Verification commands:

- Relevant package generated-doc check target
- `pnpm exec nx affected -t check-generated-docs --verbose`
- `pnpm run verify`

### CodeRabbit, SonarCloud, and external scanners

Read these source files directly:

- `.coderabbit.yaml`
- `.github/workflows/ci.yml`
- knowledge-base docs referenced by `.coderabbit.yaml`

Use this surface only when the authoritative mechanism is external review/scanning, or when a review pattern cannot be made deterministic locally with acceptable accuracy.

Example issue patterns:

| Issue pattern | Concrete example | Source files to inspect | Factory route |
| --- | --- | --- | --- |
| Secret scanning misses a file class | A new config file type may contain tokens but is not scanned | `.coderabbit.yaml`, CI, scanner docs | Configure scanner/tool coverage |
| Review assistant lacks repository-specific context | CodeRabbit comments conflict with ADR-002 or project conventions | `.coderabbit.yaml`, knowledge-base docs | Update knowledge-base docs or CodeRabbit config |
| Static-analysis quality gate is not blocking | SonarCloud result is advisory in PR workflow | `.github/workflows/ci.yml` | Make CI wait/fail on the scanner result |
| Learned review pattern is semantic, not lintable | Reviewer identifies a domain modeling smell requiring judgment | Convention docs, agent docs, `.coderabbit.yaml` | Add convention/knowledge-base guidance after rejecting deterministic enforcement |

Verification expectation:

- Repository-side config can be linted or reviewed locally.
- External settings must be verified through the service when local proof is unavailable.

### Dev-workflow commands, states, hooks, and plugin integration

Read these source files directly:

- `tools/dev-workflow-v2/commands/*.md`
- `tools/dev-workflow-v2/states/*.md`
- `tools/dev-workflow-v2/hooks/**`
- `tools/dev-workflow-v2/src/features/workflow/domain/workflow.ts`
- `tools/dev-workflow-v2/src/features/workflow/domain/states/*.ts`
- `tools/dev-workflow-v2/src/features/workflow/domain/registry.ts`
- `tools/dev-workflow-v2/src/features/workflow/entrypoint/workflow-cli.ts`
- `tools/dev-workflow-v2/src/features/workflow/infra/persistence/workflow-definition.ts`
- `tools/dev-workflow-v2/src/shell/opencode-plugin.ts`
- `tools/dev-workflow-v2/.claude-plugin/plugin.json`

Use this surface when the workflow agent performs the wrong operation, skips a state, bypasses approval, records the wrong event, fails to block a tool action, or diverges between Claude Code and OpenCode.

Example issue patterns:

| Issue pattern | Concrete example | Source files to inspect | Factory route |
| --- | --- | --- | --- |
| Command allows action before approval | Factory issue is created before options are discussed and approved | Relevant command markdown, workflow state instructions | Tighten command instructions or add mechanical state guard |
| Agent relies on the map instead of reading source | Proposal cites `factory-map.md` examples as enforcement proof | `optimize-factory.md`, factory docs | Add command instruction requiring direct source inspection |
| Tool action must be impossible | Agent writes files while in a read-only workflow state | Hook policy, workflow state machine, tests | Add hook/state-machine guard and tests |
| PR feedback transition records incomplete data | Feedback exists but workflow moves to reflecting | Workflow CLI, event fold, GitHub feedback client tests | Add transition/event tests |
| OpenCode and Claude Code behavior diverge | Slash command works in Claude Code but maps incorrectly in OpenCode | `opencode-plugin.ts`, command templates | Update plugin bridge and registration tests |
| Plugin changes are not picked up | Command changed without plugin patch version bump | `.claude-plugin/plugin.json`, plugin docs | Bump patch version with plugin-facing changes |

Verification commands:

- `pnpm exec nx test dev-workflow-v2`
- `pnpm exec nx typecheck dev-workflow-v2`
- `pnpm exec nx lint dev-workflow-v2`
- `pnpm run verify`

### Review agents and convention memory

Read these source files directly:

- `tools/dev-workflow-v2/agents/architecture-review.md`
- `tools/dev-workflow-v2/agents/code-review.md`
- `tools/dev-workflow-v2/agents/bug-scanner.md`
- `tools/dev-workflow-v2/agents/task-check.md`
- `docs/conventions/software-design.md`
- `docs/conventions/standard-patterns.md`
- `docs/conventions/anti-patterns.md`
- `docs/conventions/testing.md`
- `docs/conventions/review-feedback-checks.md`

Use this surface for semantic review checks that cannot be encoded reliably by lint, role enforcement, dependency-cruiser, tests, CI, or hooks.

Example issue patterns:

| Issue pattern | Concrete example | Source files to inspect | Factory route |
| --- | --- | --- | --- |
| Semantic design smell is not AST-detectable | Code technically follows layers but puts domain decision-making in a DTO mapper | Architecture/code review agents, conventions | Add review-agent guidance with a stable convention rule ID |
| Prior PR feedback should become reusable memory | Reviewer repeatedly catches the same non-deterministic bug pattern | `review-feedback-checks.md`, `bug-scanner.md` | Add learned review-feedback check consumed by bug-scanner |
| Task acceptance checks miss required behavior | Implementation satisfies structure but not issue acceptance criteria | `task-check.md`, workflow docs | Tighten task-check instructions |
| Review agent suggests lint-banned code | Code-review guidance recommends comments or type assertions | `code-review.md`, ESLint config, conventions | Align review guidance with deterministic lint constraints |
| Architecture review misses a responsibility boundary | Entrypoint remains thin by lines but still owns semantic business decisions | `architecture-review.md`, ADR-002 | Add semantic audit instruction only if deterministic enforcement is not viable |

Verification expectation:

- `pnpm lint:md`
- Workflow review path when practical
- Deterministic workflow tests when agent behavior is backed by TypeScript state or hook changes

## Selection Rules

Use these routing rules after reading the relevant source files:

1. Use ESLint/custom rules for one-file syntax, AST, import declaration, naming, and test-shape problems.
2. Use role enforcement for exported declaration roles, role locations, role dependencies, and role contracts.
3. Use dependency-cruiser for path shape and import graph problems.
4. Use tests and coverage for missing deterministic behavior proof.
5. Use generated-doc checks for source/generated artifact drift.
6. Use CI/local hooks when an existing check exists but does not run at the required lifecycle point.
7. Use workflow state, hooks, or plugin code when the AI workflow itself must be constrained.
8. Use review agents or convention docs only when deterministic enforcement is unavailable or intentionally rejected.

Any new factory surface added to the repository should add a new section here with:

- source files to read,
- issue patterns it can catch,
- the boundary between this surface and adjacent surfaces,
- verification commands.
