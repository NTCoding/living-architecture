# Spec: Role Enforcement Skill Bootstrap

## Context

PR #277 introduced role enforcement for the `extract` feature in `riviere-cli` — 18 files annotated with `@riviere-role` comments, validated by an Oxlint-based tool in `packages/riviere-role-enforcement`.

Now we need to roll this out across the entire codebase. But "just annotate everything" doesn't work — applying roles often requires refactoring code that mixes responsibilities. To make this scalable, we're building a skill prompt (`packages/riviere-role-enforcement/skills/role-enforcement.md`) that agents read to apply role enforcement.

The key insight: role definition files (one per role) contain the behavioral contracts, patterns, and anti-patterns that agents need to classify code correctly. The config owns structural constraints (targets, layers, paths); the definitions own semantic knowledge (what the role *means*).

## Progress

### Phase 1: Foundation

- [ ] 1A. Add `roleDefinitionsDir` to schema, types, config loader, tests
- [ ] 1B. Create role definition files (13 roles + index.md)
- [ ] 1C. Create skill prompt file
- [ ] 1D. Commit and push foundation

### Phase 2: Rollout (agents use the skill)

- [ ] 2A. Apply to features/builder/
- [ ] 2B. Apply to features/query/
- [ ] 2C. Apply to platform/infra/cli-presentation/
- [ ] 2D. Apply to remaining platform/ areas
- [ ] 2E. Apply to shell/
- [ ] 2F. Expand include to src/**/*.ts, verify 100% coverage

## Deliverables

### 1. Role Definition File System

#### 1A. Schema Changes

**File**: `packages/riviere-role-enforcement/role-enforcement.schema.json`

Add `roleDefinitionsDir` as a required string property. Add to root `required` array.

#### 1B. Type Changes

**File**: `packages/riviere-role-enforcement/src/config/role-enforcement-config.ts`

Add `roleDefinitionsDir: string` to `RoleEnforcementConfig`.

#### 1C. Config Loader Validation

**File**: `packages/riviere-role-enforcement/src/config/load-role-enforcement-config.ts`

After existing schema + semantic validation, add filesystem validation:
1. Resolve `roleDefinitionsDir` relative to `configDir`
2. Verify the directory exists
3. Verify `index.md` exists in the directory
4. For each role in `config.roles`, verify `{role-name}.md` exists
5. Collect all missing files into a single error message

Add `roleDefinitionsDir: string` (absolute resolved path) to `LoadedRoleEnforcementConfig`.

#### 1D. Config Update

**File**: `packages/riviere-cli/role-enforcement.config.json`

Add: `"roleDefinitionsDir": "role-definitions"`

### 2. Role Definition Files

**Location**: `packages/riviere-cli/role-definitions/`

Template structure (must NOT duplicate what config already expresses):

```markdown
# {Role Name}

## Purpose
One sentence: what this role represents and why it exists.

## Behavioral Contract
What code with this role DOES at runtime.

## Examples
### Canonical Example
### Edge Cases

## Anti-Patterns
### Common Misclassifications
### Mixed Responsibility Signals

## Decision Guidance
Criteria for choosing between this role and similar roles.

## References
```

Files to create:
- `index.md` (project context, links to architecture resources)
- `cli-entrypoint.md`, `command-use-case.md`, `command-use-case-input.md`, `command-use-case-result.md`, `command-input-factory.md`, `cli-output-formatter.md`, `external-client-service.md`, `external-client-model.md`, `external-client-error.md`, `aggregate.md`, `aggregate-repository.md`, `value-object.md`, `domain-service.md`

### 3. Skill Prompt

**File**: `packages/riviere-role-enforcement/skills/role-enforcement.md`

Three workflows:
- **analyze** — Read-only classification report
- **add** — Analyze → plan → highlight decisions → execute + refactor
- **configure** — Setup for new packages (deferred instructions)

Key principles:
- Generic roles over specific
- Fewer roles = more consistency
- Split over force-fit
- Config owns structure, definitions own semantics
- Never silently introduce new roles
- Document all decisions in battle test log

## Battle Test Log

**File**: `packages/riviere-role-enforcement/skills/BATTLE-TEST-LOG.md`

Each agent documents:
- Area analyzed
- Classifications made (with confidence levels)
- Decisions that were non-obvious
- Where the skill was helpful vs. confusing
- Missing role definitions or unclear guidance
- New roles proposed
- Refactoring performed
- What should be improved in the skill

## End State

- `role-enforcement.config.json` includes `src/**/*.ts`
- Every exported class, function, interface, and type-alias in riviere-cli has a `@riviere-role` annotation
- All enforcement checks pass
- Battle test log captures full process for skill improvement

## Assumptions & Questions (to review with user at the end)

*(Populated during execution)*
