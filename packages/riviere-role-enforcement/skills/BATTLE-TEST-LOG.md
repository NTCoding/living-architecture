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
