# role-classifier

`role-classifier` recommends the most likely repository role before code is written or repaired.

- Keep it in `packages/riviere-role-enforcement/src/features/classify/domain/`.
- Use it for layer inference, candidate ranking, ambiguity handling, and assignment-text generation.
- Do not let this role suppress deterministic checker failures.
