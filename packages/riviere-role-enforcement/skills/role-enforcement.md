# Role Enforcement Skill

Apply, analyze, and manage role annotations across a TypeScript codebase.

## Usage

```text
Read this file and follow the workflow for the requested action:
- analyze <package-path> — Read-only classification report
- add <package-path> — Full workflow: analyze → plan → execute
- configure <package-path> — Set up role enforcement for a new package
```

## Core Principles

1. **Generic roles over specific** — Always try to fit existing roles before proposing new ones. The fewer roles, the more consistent the codebase.
2. **Split over force-fit** — If code mixes responsibilities, recommend splitting rather than assigning a weak role.
3. **Human approval for new roles** — Never silently introduce a new role. Always propose and wait for approval.
4. **Config owns structure, definitions own semantics** — The config file defines targets, layers, paths. The definition files describe behavioral contracts and patterns.
5. **Document everything** — Every decision, challenge, and insight must be captured in the battle test log.

## Step 1: Load Context

Before classifying any code:

1. **Read the config file**: Find `role-enforcement.config.json` in the target package. Parse it to understand:
   - `include` / `ignorePatterns` — which files are in scope
   - `layers` — which roles are allowed at which paths
   - `roles` — the full role catalog with targets, naming patterns, and constraints
   - `roleDefinitionsDir` — path to role definition files

2. **Read index.md**: Read `{roleDefinitionsDir}/index.md` to discover project-level architecture resources. Follow the links to read referenced documents (separation of concerns, tactical DDD, ADRs, conventions).

3. **Read role definitions**: For each role in the config, read `{roleDefinitionsDir}/{role-name}.md`. These contain:
   - Behavioral contracts (what the code DOES)
   - Examples (canonical + edge cases)
   - Anti-patterns (misclassifications, mixed responsibility signals)
   - Decision guidance (choosing between similar roles)

## Step 2: Determine Scope

Ask about the scope of work:
- **Full package** — all files matched by include patterns
- **One feature** — a specific feature directory (e.g., `src/features/extract/`)
- **One layer** — a specific layer across features (e.g., all `domain/` directories)
- **Specific files** — user-provided file paths

Recommend working in small increments (one feature or layer at a time) for safety.

## Step 3: Discover Files

1. List all `.ts` files in scope matching the config's `include` patterns
2. Exclude files matching `ignorePatterns` (specs, fixtures, etc.)
3. Categorize each file:
   - **Already annotated** — has `/** @riviere-role ... */` comments on all exports
   - **Partially annotated** — some exports have annotations, some don't
   - **Unannotated** — no role annotations

## Step 4: Classify Unannotated Declarations

For each unannotated exported declaration (function, class, interface, type-alias):

### Classification Decision Process

1. **Layer constraint**: What layer does the file path map to? What roles are allowed in that layer?
2. **Name matching**: Does the declaration name match any role's `nameMatches` pattern?
3. **Target matching**: What is the declaration type? Filter to roles allowing that target.
4. **Behavioral analysis**: Read the role definition files for candidate roles. Which behavioral contract best matches what this code actually does?

### Confidence Levels

- **HIGH** — Single clear match. Layer + target + behavior all point to one role.
- **MEDIUM** — Two candidates, one stronger. Or behavior matches but the file is in an unexpected layer.
- **LOW** — Ambiguous. Possible mixed responsibility. Multiple roles could apply.

### Mixed Responsibility Detection

Watch for these signals (from the role definition anti-patterns):
- A function that loads state AND contains business logic (command + domain mixed)
- A function that calls external libraries AND orchestrates domain behavior (infra + command mixed)
- A type that serves as both a command input AND a domain concept (input + value-object mixed)
- A function that formats output AND makes domain decisions (formatter + domain mixed)

When mixed responsibilities are detected:
1. Identify which roles are mixed
2. Propose how to split the code into separate files/functions
3. Classify the split pieces with their correct roles

## Step 5: Produce Classification Report

Output a structured report:

```markdown
## Classification Report: {package}/{scope}

### Summary
- Files in scope: N
- Already annotated: N
- Unannotated: N
- High confidence: N
- Needs review: N

### Classifications

| File | Declaration | Type | Proposed Role | Confidence | Notes |
|------|-------------|------|---------------|------------|-------|

### Mixed Responsibility Files

| File | Roles Mixed | Recommended Action |
|------|-------------|--------------------|

### Proposed New Roles (if any)

| Name | Justification | Example Files |
|------|---------------|---------------|

### Decisions Log

For each non-obvious classification, explain:
1. What candidates were considered
2. Why the chosen role won
3. What the runner-up was and why it lost
```

## Step 6: Execute (add workflow only)

After presenting the classification report:

1. **Annotate**: Add `/** @riviere-role {role-name} */` before each exported declaration
   - Place the annotation on the line immediately before the `export` keyword
   - One annotation per declaration
   - Use the exact role name from the config

2. **Refactor** (when mixed responsibilities detected):
   - Split the file into separate files, one per role
   - Move each piece to the correct layer directory
   - Update imports in all affected files
   - Annotate the split pieces

3. **Update config** (if needed):
   - Add new include patterns if the scope expanded
   - Add new layer paths if files moved to new locations
   - Add new roles if approved by user

4. **Verify**: Run the enforcement tool:
   ```bash
   pnpm exec tsx packages/riviere-role-enforcement/src/bin.ts packages/riviere-cli/role-enforcement.config.json
   ```
   Fix any violations until the tool passes.

5. **Run tests**: Ensure existing tests still pass:
   ```bash
   pnpm nx test riviere-cli
   ```

## Step 7: Document in Battle Test Log

After completing work on each area, append to `packages/riviere-role-enforcement/skills/BATTLE-TEST-LOG.md`:

```markdown
## {Area Name} — {Date}

### Scope
- Files analyzed: N
- Files annotated: N
- Files refactored: N

### Classifications
| File | Role | Confidence | Notes |
|------|------|------------|-------|

### Key Decisions
- {Decision 1}: Chose X over Y because...
- {Decision 2}: ...

### Skill Gaps
- {What was missing or unclear in the skill/definitions}

### New Roles Proposed
- {Role name}: {Justification} (approved/pending)

### Refactoring Performed
- {File}: Split into {file1} ({role1}) + {file2} ({role2})

### What Worked Well
- {Positive feedback about the skill}

### What Should Be Improved
- {Suggestions for skill improvement}
```

## Configure Workflow

If no `role-enforcement.config.json` exists in the target package:

1. Analyze the package's directory structure
2. Map directories to layers based on naming conventions
3. Start with the standard role catalog (the 13 roles defined above)
4. Create the config file with appropriate include/ignore patterns
5. Create the `roleDefinitionsDir` with index.md and role definition files
6. Run enforcement and iteratively fix until compliance is achieved
