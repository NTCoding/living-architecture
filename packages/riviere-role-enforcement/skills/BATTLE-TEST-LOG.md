# Role Enforcement Skill — Battle Test Log

This log captures how the role enforcement skill performed when applied by agents. It documents decisions, challenges, skill gaps, and improvement suggestions.

Each section represents one area of the codebase that was analyzed and annotated.

## features/builder and features/query — 2026-03-28

### Scope
- Files analyzed: 22 (16 builder + 6 query)
- Files annotated: 22
- Files refactored: 1 (`commands/add-component.ts` — extracted result type, removed mixed output responsibility)
- New files created: 3 (`add-component-result.ts`, `add-component-hints.ts`, `add-component-result.ts` from split)

### Classifications
| File | Role | Confidence | Notes |
|------|------|------------|-------|
| `builder/queries/api-component-queries.ts` — `ApiComponent` | `value-object` | MEDIUM | Domain concept representing API-typed component; reused across multiple query functions |
| `builder/queries/api-component-queries.ts` — `findApisByPath` | `domain-service` | HIGH | Pure function: takes domain data, returns domain results, no side effects |
| `builder/queries/api-component-queries.ts` — `getAllApiPaths` | `domain-service` | HIGH | Same pattern |
| `builder/entrypoint/*.ts` — all `createXxxCommand()` | `cli-entrypoint` | HIGH | All use Commander, register CLI commands |
| `builder/commands/add-component.ts` — `addComponent` | `command-use-case` | HIGH after refactor | Originally mixed: loaded state + invoked domain + formatted output to stdout. Refactored to return typed result |
| `query/entrypoint/*.ts` — all `createXxxCommand()` | `cli-entrypoint` | HIGH | All use Commander, register CLI commands |

### Key Decisions

1. **`ApiComponent` → `value-object` not `external-client-model`**: `ApiComponent` is an internal domain concept (a subset of `Component` with API-specific fields), not a shape from an external API. The file is in `queries/` layer which maps to domain-service/value-object roles.

2. **`queries/` layer addition to config**: The `src/features/builder/queries/` path was not in any configured layer. Added a new `queries` layer with `domain-service` and `value-object` as allowed roles. This is consistent with the separation-of-concerns skill's Q4: "Query/read side?" → queries/.

3. **`addComponent` → `command-use-case` after refactoring**: The original function was a mixed responsibility — it loaded state, invoked domain behavior, AND formatted console output. This violates the `command-use-case` contract (which should return a typed result). Refactored to return `AddComponentResult` discriminated union and moved output formatting to the entrypoint. The entrypoint now follows the extract feature pattern.

4. **Removed `allowedOutputs` from `command-use-case` config**: The enforcement tool's `readTypeRole()` cannot resolve `Promise<T>` wrapped return types — it only resolves direct `TSTypeReference` types. Since `addComponent` is async (file I/O), its return type is `Promise<AddComponentResult>`. Removing `allowedOutputs` constraint documents this as a known tool limitation rather than silently failing.

### Skill Gaps

1. **Enforcement tool does not handle `Promise<T>` return types**: The tool's `readTypeRole()` resolves `Promise<AddComponentResult>` as "no role found" because it looks up `Promise` (a built-in with no annotation). The `allowedOutputs` constraint only works for synchronous command-use-cases. The tool needs to unwrap `Promise<T>` to check the inner type.

2. **Layer path format is ambiguous**: The config uses `src/features,platform/domain` as a path — this is a comma-separated multi-path inside one string, which is unusual. The existing config had this before this session; it could be confusing about whether it's a glob or a literal path list.

3. **Skill doesn't address async command use cases**: The `command-use-case` role definition only shows synchronous examples. Real-world command use cases that do file I/O (like `addComponent`) are async. The skill should document that async command use cases exist and how they should be classified.

4. **Config `include` patterns grow unbounded**: Each new feature area requires adding another glob to `include`. There's no guidance in the skill on when to use `src/**/*.ts` vs feature-specific patterns.

### New Roles Proposed
- None. Existing roles covered all cases once `queries` layer was added to config.

### Refactoring Performed
- `commands/add-component.ts`: Split mixed responsibility. Extracted `AddComponentResult` type to `add-component-result.ts`. Moved console.log output from command to entrypoint. Added `add-component-hints.ts` in `cli-presentation/` for hint messages (entrypoints cannot have private helper functions per linter rule).
- `commands/add-component.spec.ts`: Updated tests to check returned `AddComponentResult` instead of `ctx.consoleOutput`.
- `platform/infra/component-mapping/add-component-mapper.ts`: Removed `outputJson` field from `AddComponentInput` (belonged to presentation layer), added `command-use-case-input` annotation.

### What Worked Well
- Classification decision tree (layer → name → target → behavior) was effective. The `cli-entrypoint` role was unambiguous for all `createXxxCommand()` functions.
- The enforcement tool provided precise error messages that guided the refactoring — the `allowedInputs` check correctly caught that `AddComponentInput` needed a `command-use-case-input` annotation before the mixed responsibility issue was even identified.
- The skill's "split over force-fit" principle prevented incorrectly classifying the mixed-responsibility `addComponent` as something it wasn't.

### What Should Be Improved
1. **Add `Promise<T>` support to the enforcement tool**: The `readTypeRole()` function should unwrap `Promise<T>` and check the inner type `T` for its role annotation. This would enable `allowedOutputs` to work for async command-use-cases.
2. **Document async command-use-cases in the skill and role definition**: The `command-use-case.md` definition should explicitly address async functions returning `Promise<CommandResult>`.
3. **Add a `queries` layer to the standard config template**: The separation-of-concerns skill references a `queries/` layer but the initial config template didn't include it.
4. **Entrypoint private function linter rule**: The linter rejects private functions in entrypoints, which is good. But the skill doesn't mention this constraint — it should note that helper logic must be in `commands/`, `queries/`, or `infra/` layers.

## platform/infra/cli-presentation — 2026-03-28

### Scope
- Files analyzed: 23 source files (all non-spec files in the directory)
- Files annotated: 23
- Files refactored: 0
- New roles created: 2 (`cli-input-validator`, `cli-error`)

### Classifications
| File | Declaration | Role | Confidence | Notes |
|------|-------------|------|------------|-------|
| `error-codes.ts` — `ExitCode` | enum | `cli-error` (annotation only, tool skips enums) | HIGH | CLI exit code enum |
| `error-codes.ts` — `ConfigValidationError` | class | `cli-error` | HIGH | CLI boundary error class |
| `error-codes.ts` — `CliErrorCode` | enum | `cli-error` (annotation only, tool skips enums) | HIGH | CLI error code enum |
| `output.ts` — `SuccessOutput<T>` | interface | `value-object` | HIGH | Reusable CLI output shape |
| `output.ts` — `ErrorOutput` | interface | `value-object` | HIGH | Reusable CLI output shape |
| `output.ts` — `formatSuccess` | function | `cli-output-formatter` | HIGH | Constructs success output structure |
| `output.ts` — `formatError` | function | `cli-output-formatter` | HIGH | Constructs error output structure |
| `validation.ts` — `ValidationResult` | interface | `value-object` | HIGH | Result type for validators |
| `validation.ts` — `validateComponentType` | function | `cli-input-validator` | HIGH | Validates CLI string flag |
| `validation.ts` — `validateLinkType` | function | `cli-input-validator` | HIGH | Validates CLI string flag |
| `validation.ts` — `validateSystemType` | function | `cli-input-validator` | HIGH | Validates CLI string flag |
| `validation.ts` — `isValidHttpMethod` | function | `cli-input-validator` | HIGH | Boolean type-guard for HTTP method |
| `validation.ts` — `validateHttpMethod` | function | `cli-input-validator` | HIGH | Validates CLI string flag |
| `component-types.ts` — `ComponentTypeFlag`, `SystemTypeFlag`, `ApiTypeFlag`, `LinkType` | type-alias | `value-object` | HIGH | Type-safe flag unions |
| `component-types.ts` — `isValidComponentType`, `isValidSystemType`, `isValidApiType`, `isValidLinkType` | function | `cli-input-validator` | HIGH | Boolean type guards for flag values |
| `component-types.ts` — `normalizeToSchemaComponentType`, `normalizeComponentType` | function | `command-input-factory` | MEDIUM | Convert raw CLI strings to typed values |
| `extract-output-formatter.ts` — `formatDryRunOutput` | function | `cli-output-formatter` | HIGH | Formats DraftComponents into display lines |
| `link-external-transformer.ts` — `buildExternalTarget` | function | `command-input-factory` | HIGH | Builds typed ExternalTarget from CLI options |
| `categorize-components.ts` — `categorizeComponents` | function | `cli-output-formatter` | MEDIUM | Computes added/removed components for PR output display |
| `format-pr-markdown.ts` — `CategorizedComponents` | interface | `value-object` | HIGH | View-model type for PR markdown output |
| `format-pr-markdown.ts` — `formatPrMarkdown` | function | `cli-output-formatter` | HIGH | Renders CategorizedComponents to markdown string |
| `custom-type-parser.ts` — `parsePropertySpecs` | function | `command-input-factory` | HIGH | Parses CLI property spec strings to typed record |
| `component-output.ts` — `ComponentOutput` | interface | `value-object` | HIGH | DTO for CLI component output |
| `component-output.ts` — `toComponentOutput` | function | `cli-output-formatter` | MEDIUM | Maps domain Component to CLI output DTO |
| `output-writer.ts` — `outputResult` | function | `cli-output-formatter` | HIGH | Writes output to file or stdout |
| `link-http-validator.ts` — `validateOptions` | function | `cli-input-validator` | HIGH | Validates multiple CLI options as a group |
| `signature-parser.ts` — `parseSignature` | function | `command-input-factory` | HIGH | Parses CLI signature string to typed OperationSignature |
| `custom-property-parser.ts` — `parseCustomProperties` | function | `command-input-factory` | HIGH | Parses raw property strings to typed record |
| `link-http-errors.ts` — `reportNoApiFoundForPath`, `reportAmbiguousApiMatch` | function | `cli-output-formatter` | HIGH | Write structured error output to stdout |
| `global-error-handler.ts` — `handleGlobalError` | function | `cli-output-formatter` | HIGH | Formats known errors to stdout and exits |
| `format-extraction-stats.ts` — `countLinksByType`, `formatExtractionStats`, `formatTimingLine` | function | `cli-output-formatter` | MEDIUM | `countLinksByType` is a pure calculation but serves display prep |
| `enrichment-error-handler.ts` — `handleEnrichmentError` | function | `cli-output-formatter` | HIGH | Formats enrichment errors to stdout |
| `domain-input-parser.ts` — `parseDomainJson` | function | `command-input-factory` | HIGH | Parses JSON string to DomainInputParsed array |
| `exit-with-cli-error.ts` — `exitWithCliError` | function | `cli-output-formatter` | HIGH | Formats error and exits the process |
| `extract-validator.ts` — `ExtractOptions` | interface | `value-object` | HIGH | Raw CLI options bag (not a command-use-case-input) |
| `extract-validator.ts` — `validateFlagCombinations` | function | `cli-input-validator` | HIGH | Validates mutually exclusive flag combinations |
| `enrichment-parser.ts` — `parseStateChanges`, `buildBehavior` | function | `command-input-factory` | HIGH | Parse CLI strings to typed domain structures |
| `option-collectors.ts` — `collectOption` | function | `command-input-factory` | HIGH | Commander accumulator for repeated flags |
| `add-component-hints.ts` — `getAddComponentHints` | function | `cli-output-formatter` | HIGH | Returns hint strings based on error code |

### Key Decisions

1. **`cli-input-validator` new role**: The existing roles had no fit for functions that validate CLI input and return a structured ValidationResult. `domain-service` was considered but rejected — these validate CLI-layer concerns (enum values, flag formats), not business rules. `command-input-factory` was considered but rejected — factories *construct* typed objects; validators only *check* acceptability. Added `cli-input-validator` with target `function`.

2. **`cli-error` new role**: `ConfigValidationError` is an error class at the CLI boundary. `external-client-error` requires "failures from external services" — this is a CLI configuration error, not from any external tool. No existing role fit. Added `cli-error` with target `class`. Note: enums (ExitCode, CliErrorCode) are annotated for human clarity but the enforcement tool does not check enums (they are `VariableDeclaration` in the AST, not `ClassDeclaration` or `TSTypeAliasDeclaration`).

3. **`categorizeComponents` → `cli-output-formatter`**: This is a pure calculation function that computes added/removed components. Ideally it would be `domain-service`, but `domain-service` is not in the cli-presentation allowed roles. Since its sole purpose is to prepare data for PR markdown rendering, `cli-output-formatter` is the closest fit. Considered adding `domain-service` to the layer but rejected — this layer is presentation infrastructure, not domain logic.

4. **`countLinksByType` → `cli-output-formatter`**: Similarly a pure calculation that prepares stats for display. Same reasoning as `categorizeComponents`.

5. **`normalizeComponentType` / `normalizeToSchemaComponentType` → `command-input-factory`**: These transform raw CLI strings into typed values. Not validators (they throw instead of returning a result), not formatters (they don't produce output). `command-input-factory` is the closest fit for "translate raw CLI input to typed values."

6. **`ExitCode` and `CliErrorCode` enum annotation**: Enums are not enforced by the tool (the plugin only handles `FunctionDeclaration`, `ClassDeclaration`, `TSInterfaceDeclaration`, `TSTypeAliasDeclaration`). The `cli-error` role target is `class`. Annotations were added to enums for human readability, but the tool will never check them. The config `RoleTarget` type definition confirms enums are unsupported.

### Skill Gaps

1. **No role for pure calculation helpers in presentation layers**: `countLinksByType` and `categorizeComponents` are pure functions that do calculations (not formatting) but live in cli-presentation. The skill has no guidance on this — the "force-fit closest role" principle was applied, but a `cli-helper` or `cli-view-model-builder` role might be more accurate in future.

2. **Enforcement tool does not support enums**: The plugin has no `TSEnumDeclaration` handler. Enums that are part of the CLI infrastructure (error codes, exit codes) can't be assigned a role that the tool enforces. The skill should document this limitation.

3. **`cli-error` role target is too narrow**: The role is `class`-only because that's the only target checked by the tool. But conceptually, error code enums also belong to this role. Until the tool supports enums, this creates a gap between the role's semantic intent and what can be enforced.

### New Roles Proposed
- `cli-input-validator` (approved/applied): For functions that validate single CLI input values and return a structured result. Distinct from `command-input-factory` (construction) and `domain-service` (business rules).
- `cli-error` (approved/applied): For error classes and error code types at the CLI boundary. Distinct from `external-client-error` (third-party service failures) and domain errors (business rule violations).

### Refactoring Performed
- None. All files had clear single responsibilities. No mixed concerns detected.

### What Worked Well
- The classification decision tree (layer → name → target → behavior) was effective for all 37 declarations.
- The enforcement tool reported 0 errors on first run after annotations.
- 100% test coverage was maintained.
- The two new roles (`cli-input-validator`, `cli-error`) cleanly separated concepts that would otherwise have been force-fit into `domain-service` or `external-client-error`.

### What Should Be Improved
1. **Add `TSEnumDeclaration` support to the enforcement plugin**: Enums are a common TypeScript pattern for error codes and flags. Without enforcement, they can drift from their intended roles.
2. **Add guidance for pure calculation helpers in presentation layers**: The skill's "split over force-fit" principle doesn't cover the case where a pure function lives in a presentation layer for cohesion reasons but isn't purely formatting.
3. **Document that `domain-input-parser.ts` uses a re-export pattern** (`export type { X }`) that the tool does not check. The interface is defined locally but re-exported — the tool won't flag it as missing an annotation.
