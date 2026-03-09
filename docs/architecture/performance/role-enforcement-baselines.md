# Role Enforcement Baselines

Deterministic role-enforcement baseline measurements for `packages/riviere-role-enforcement`, captured on Mar 9, 2026 from the `architecture-rbaf` branch.

## Commands

All measurements were taken from the repository root after a successful `pnpm exec nx build riviere-role-enforcement`.

```bash
pnpm exec tsx packages/riviere-role-enforcement/src/features/check/entrypoint/run-role-enforcement.ts --config riviere-role-enforcement.yaml packages/riviere-query/src/features/querying/queries/flow-queries.ts
pnpm exec tsx packages/riviere-role-enforcement/src/features/check/entrypoint/run-role-enforcement.ts --config riviere-role-enforcement.yaml
```

## Results

| Scenario                      | Scope                                                                  | Result                                 | Real time |
| ----------------------------- | ---------------------------------------------------------------------- | -------------------------------------- | --------- |
| Changed-file check            | `packages/riviere-query/src/features/querying/queries/flow-queries.ts` | 0 warnings, 0 errors                   | `0.72s`   |
| Full configured rollout scope | `riviere-role-enforcement.yaml` include set                            | 3 existing non-role warnings, 0 errors | `0.92s`   |

## Notes

- The direct deterministic entrypoint stays under the PRD targets of `<= 2s` for changed files and `<= 15s` for the full configured scan.
- The current full-scope run reports three pre-existing non-role Oxlint warnings in `tools/dev-workflow-v2`, but role enforcement itself reports no deterministic errors for the configured rollout scope.
- The wrapper command `pnpm role-enforcement:check -- --config riviere-role-enforcement.yaml` currently includes package lint/build work before execution, so its wall-clock time is higher than the deterministic scan baseline recorded here.
