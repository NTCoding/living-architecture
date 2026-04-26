# optimize-factory

Design factory optimizations from PR feedback or ad-hoc instructions. This command creates no product fixes. Its output is an approved GitHub issue that another implementation workflow can execute on a separate branch.

## Arguments

Accepted forms:

- Pull request number: `123`
- Pull request URL: `https://github.com/OWNER/REPO/pull/123`
- Ad-hoc instructions: free text describing the factory weakness to optimize

## Operating Principle

The factory is the repository-specific system mapped by `tools/dev-workflow-v2/docs/factory/factory-map.md`. The map describes what exists, where it is defined, how surfaces relate, and examples of how each mechanism is used. Read the map before proposing anything, but do not cite the map as proof of enforcement. Read the complete relevant source files at command execution time.

Never fix the product code under review. Design changes to the factory so the same issue is prevented or detected next time.

Every proposal must state:

- which factory source files were inspected,
- what enforcement was observed in those source files,
- which exact factory file or capability should change,
- what gap remains after existing enforcement is considered,
- how the proposed enforcement will be verified.

Factory memory lives in GitHub issues labeled `factory` and `factory optimization`. Every factory optimization issue should be searchable by:

- labels: `factory`, `factory optimization`,
- source PR and comment URLs,
- exact factory surface names,
- problem pattern names.

Issue #361 is the reference example for how factory optimization issues must be written. Use it as the standard for:

- simple human-readable language,
- concrete code examples,
- diagrams when they help explain the failure chain,
- clear separation between Problem, Root Cause Analysis, Proposed Solutions, and Verification Plan,
- solutions that map onto the factory pipeline rather than one local fix.

## Step 1: Classify the input

If the argument is a PR number or PR URL, run PR mode.

If the argument is ad-hoc text, run ad-hoc mode.

If the argument is missing or ambiguous, ask the user for either a PR number, PR URL, or ad-hoc factory optimization request.

## Step 2: Load the repository factory map

Read these files before discussing any solution:

- `tools/dev-workflow-v2/docs/factory/factory-map.md`

Use the factory map to identify which factory surfaces and source files exist. Inspect the relevant source files in full at command execution time. Do not use map examples, headings, or summaries as evidence of enforcement.

## Step 3A: PR mode — fetch source material

Resolve the PR number:

```bash
gh pr view <PR_NUMBER_OR_URL> --json number,url,title,body,author,headRefName,baseRefName,reviewDecision,comments,reviews,files
```

Resolve the repository:

```bash
gh repo view --json nameWithOwner
```

Fetch review threads using GraphQL:

```bash
gh api graphql \
  -F owner='<OWNER>' \
  -F name='<REPO>' \
  -F number=<PR_NUMBER> \
  -f query='query($owner: String!, $name: String!, $number: Int!, $threadCursor: String) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        url
        title
        reviewThreads(first: 100, after: $threadCursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            isResolved
            isOutdated
            path
            line
            startLine
            comments(first: 100) {
              nodes {
                id
                databaseId
                url
                body
                author { login }
                createdAt
              }
            }
          }
        }
      }
    }
  }'
```

Do not treat one `first: 100` response as complete data. Page through review threads until `reviewThreads.pageInfo.hasNextPage` is `false`.

For each selected review thread, fetch the full comment history with a separate per-thread GraphQL query that paginates comments for that one thread only:

```bash
gh api graphql \
  -F threadId='<THREAD_ID>' \
  -f query='query($threadId: ID!, $commentCursor: String) {
    node(id: $threadId) {
      ... on PullRequestReviewThread {
        comments(first: 100, after: $commentCursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            databaseId
            url
            body
            author { login }
            createdAt
          }
        }
      }
    }
  }'
```

Do not pass empty strings as cursor stand-ins. Omit the cursor variable until a real cursor exists, then continue with the returned `endCursor`.

If the command cannot page through all review threads and comments, fail fast and tell the user that the source set is incomplete. Do not continue with partial review-thread data.

Select source items:

- Include unresolved review threads that contain any comment whose body starts with `[FACTORY]`.
- Include unresolved CodeRabbit review threads when a user comment in the thread starts with `[FACTORY]`.
- Include general PR comments whose body starts with `[FACTORY]`.
- Ignore resolved review threads by default.
- If a resolved or outdated marked thread appears relevant, ask the user before including it.

For every selected item, read all relevant context:

- the full marked thread or PR comment
- the referenced file and line range
- surrounding code needed to understand the pattern
- exact relevant factory source files identified through `tools/dev-workflow-v2/docs/factory/factory-map.md`

## Step 3B: Ad-hoc mode — collect source material

Restate the factory weakness described by the user.

Ask whether prior factory memory should be searched before proposal if the answer is not obvious from the request.

Read the exact factory source files and product examples needed to understand the pattern. Do not modify files.

## Step 4: Search factory memory

Use `tools/dev-workflow-v2/docs/factory/factory-map.md` as the local factory map before searching GitHub issues.

Search prior GitHub issues labeled `factory` and `factory optimization`:

```bash
gh search issues \
  --repo <OWNER>/<REPO> \
  --match title,body \
  --state all \
  --limit 1000 \
  --json number,title,state,labels,body,url,createdAt,closedAt \
  -- 'label:"factory" label:"factory optimization" <keyword set>'
```

Use multiple targeted searches when needed so the command examines the full relevant memory set rather than treating one limited result page as exhaustive.

If the search approach cannot cover the full relevant issue set, fail fast and tell the user that factory memory could not be searched completely. Do not claim that no matching factory memory exists from partial search results.

Use keywords from `[FACTORY]` comments, file paths, rule names, factory files, and factory surfaces to identify similar issues.

If memory is used, record:

- the prior issue URL
- the similarity
- the prior resolution
- how it influences this proposal

If no relevant memory exists, state that no matching factory memory was found.

## Step 5: Discuss each optimization point

For each selected factory weakness, discuss with the user before creating an issue.

Use this structure:

```markdown
## Factory Optimization Point N: <name>

Source:
- PR: <url or none>
- Comment/thread: <url>
- File: <path:line or none>

Problem pattern:
- <specific recurring weakness>

Inspected factory context:
- Existing enforcement files inspected: <exact paths>
- Existing enforcement observed in source: <what blocks or reviews this pattern at command execution time>
- Factory gap: <what is not blocked or reviewed reliably>

Factory memory:
- <prior issue references and influence, or "No matching factory memory found.">

Pipeline analysis:

1. PRD creation
   - Guardrails: <what guidance or review existed>
   - Failure: <what went wrong at this stage>
   - Reinforcement: <how this stage repeated or normalized the bad idea>
   - Improvement: <what change at this stage would help>
2. Task creation
   - Guardrails: <...>
   - Failure: <...>
   - Reinforcement: <...>
   - Improvement: <...>
3. Task implementation
   - Guardrails: <...>
   - Failure: <...>
   - Reinforcement: <...>
   - Improvement: <...>
4. Role enforcement
   - Guardrails: <what role-enforcement materials were inspected>
   - Failure: <what role selection, role contract, or config gap allowed the mistake>
   - Reinforcement: <how the current role system let the bad idea appear valid>
   - Improvement: <what role-enforcement change is possible>
5. Code review
   - Guardrails: <...>
   - Failure: <...>
   - Reinforcement: <...>
   - Improvement: <...>

Reinforcement chain:
- <show where the same bad idea was repeated across stages>

Role-enforcement questions:
- What roles did the current code have?
- Why might those roles have seemed plausible?
- What do the role definitions actually say?
- Compared to a genuine example of that role, does the code still fit?
- Can current role-enforcement options be extended to block the misuse mechanically?

Role-enforcement materials inspected:
- `.riviere/role-definitions/index.md`
- `.riviere/role-selection-guide.md`
- <relevant role definition files>
- `.riviere/roles.ts`
- `.riviere/role-enforcement.config.ts`

Options considered:
1. <option>
   - Enforcement strength: deterministic | semi-deterministic | advisory
   - Accuracy and reliability: <assessment>
   - False-positive risk: <assessment>
   - Verification: <how it can be proven>
2. <option>
   - ...

Recommended solution:
- <prescribed factory change with exact target files or exact new capability>

Rejected options:
- <option>: <reason>

Open decisions:
- <only include decisions that require user input>
```

Analyze the factory pipeline in this exact order every time:

1. PRD creation
2. task creation
3. task implementation
4. role enforcement
5. code review

If a stage is not relevant, say so explicitly and explain why. Do not skip the stage silently.

The goal is not only to identify one local fix. Make the reinforcement across the pipeline visible.

Prioritize options in this order:

1. deterministic automated enforcement
2. tests or fixtures proving enforcement works
3. CI or workflow gate
4. review-agent or convention markdown as the last resort

Use this decision matrix as the starting point. Extend `tools/dev-workflow-v2/docs/factory/factory-map.md` only when a new factory surface is added, an existing surface relationship changes, or the current map does not explain an existing surface deeply enough to support the required analysis.

| Problem pattern | Preferred factory surface | Verification approach |
| --- | --- | --- |
| Syntax or AST-level smell | ESLint rule, custom ESLint rule, or `no-restricted-syntax` | Violating fixture or representative lint failure |
| Repeated naming smell | Custom ESLint rule or existing naming rule extension | Rule test with rejected and accepted names |
| Folder or layer violation | Riviere role enforcement or dependency rule | Fixture or package check proving invalid placement fails |
| Import direction violation | Riviere role enforcement or dependency rule | Fixture or dependency check proving forbidden import fails |
| Test smell | Vitest ESLint rule or custom test lint rule | Failing test fixture or lint failure against representative test |
| Coverage weakness | Vitest coverage thresholds or coverage include/exclude adjustment | Coverage command proves threshold failure or restored coverage |
| CI escape hatch | CI workflow gate or workflow command state guard | CI-equivalent command proves blocked path fails |
| Code review blind spot | Review agent instruction, convention doc, or deterministic scanner capability | Agent review scenario or documented checklist addition |
| CodeRabbit blind spot | CodeRabbit configuration or knowledge-base guideline | CodeRabbit config review and linked guideline |
| Security or secret risk | gitleaks, semgrep, CodeRabbit tool, or CI gate | Tool command proves detection |
| Workflow misuse | dev-workflow command, hook, state-machine guard, or agent instruction | Unit test or workflow command scenario proves misuse is blocked |
| Capability gap | New factory tool, custom checker, command, or agent workflow | Purpose-built test or dry-run scenario proves the new capability works |

For lint-rule optimizations, include a verification design that proves the rule fails on violating code. Prefer a dedicated fixture or rule test when the lint rule is custom. For `no-restricted-syntax`, prescribe a verification command that fails against a representative violation when practical.

If an issue adds a new factory surface or changes relationships between factory surfaces, include an explicit docs update requirement for `tools/dev-workflow-v2/docs/factory/factory-map.md`.

## Step 6: Request approval

After all points have been discussed, ask the user for approval to create one aggregated GitHub issue.

Natural-language approval is enough. Do not create issues, comment on PR threads, or resolve threads before approval.

## Step 7: Create one aggregated GitHub issue

After approval, create exactly one GitHub issue with both labels:

- `factory`
- `factory optimization`

The issue title format is:

```text
Factory optimization: <short summary>
```

The issue body must use this exact high-level structure:

````markdown
## Problem

- Source:
  - PR: <url or "Ad-hoc request">
  - Source comments:
    - <comment/thread URL>
  - Related issues or PRDs: <links or file paths>
- Factory memory:
  - <prior issue URL>: <how it influenced this issue>
  - Or: No matching factory memory found.
- Reference example:
  - Issue #361: <url>

<clear human-readable explanation of the problem>

## Concrete Examples

- File: <path>
  - <code example and why it demonstrates the problem>
- File: <path>
  - <code example and why it demonstrates the problem>

## Root Cause Analysis

### Pipeline analysis

#### 1. PRD creation
- Guardrails: <what existed>
- Failure: <what went wrong>
- Reinforcement: <how this stage repeated or normalized the bad idea>
- Improvement opportunity: <what can change here>

#### 2. Task creation
- Guardrails: <...>
- Failure: <...>
- Reinforcement: <...>
- Improvement opportunity: <...>

#### 3. Task implementation
- Guardrails: <...>
- Failure: <...>
- Reinforcement: <...>
- Improvement opportunity: <...>

#### 4. Role enforcement
- Guardrails: <which real role-enforcement materials were inspected>
- Current roles: <what roles the code had>
- Plausible reasoning: <why those roles might have been chosen>
- Role-definition reality: <what the definitions and guide actually say>
- Failure: <why the roles were wrong or why enforcement failed to flag them>
- Reinforcement: <how the current role system made the bad idea appear acceptable>
- Improvement opportunity: <what role-enforcement change is possible>

#### 5. Code review
- Guardrails: <...>
- Failure: <...>
- Reinforcement: <...>
- Improvement opportunity: <...>

### Reinforcement across the pipeline

- <show the repeated failure chain across stages>

Role-enforcement analysis must be part of Root Cause Analysis, not a separate top-level section.
This analysis must inspect:

- `.riviere/role-definitions/index.md`
- `.riviere/role-selection-guide.md`
- the relevant role definition files
- `.riviere/roles.ts`
- `.riviere/role-enforcement.config.ts`

The analysis must answer:

1. What roles did the current code have?
2. Why might those roles have been added?
3. Were those the right roles or the wrong roles?
4. If they were the wrong roles, why did role enforcement allow them or fail to flag them?
5. Is this actually a domain concept?
6. Does this code really satisfy the behavioral contract of the role it was given?
7. Compared to a genuine example of that role, does it still fit?
8. Can current role-enforcement options be extended to block the misuse mechanically?

## Proposed Solutions

### Options considered

#### Option 1: <name>
- Enforcement strength: deterministic | semi-deterministic | advisory
- Accuracy and reliability: <assessment>
- Verification: <verification approach>

### Rejected options

- <option>: <reason>

### Prescribed solution

Group or explain the improvements by the relevant factory stage:

- PRD creation: <exact change>
- task creation: <exact change>
- task implementation: <exact change>
- role enforcement: <exact change>
- code review: <exact change>

For the role-enforcement stage, explicitly consider:

- role-definition changes
- role-selection-guide changes
- `.riviere/roles.ts` changes
- `.riviere/role-enforcement.config.ts` changes
- factory-map documentation changes that explain the available role-enforcement levers

Do not default to generic lint-only fixes if a role-enforcement solution is more direct.

## Verification Plan

- <verification tied to each proposed improvement>
- <for example: synthetic planning scenario, failing fixture, rule test, prompt audit, config review>

## Documentation and Memory Updates

- [ ] Update `tools/dev-workflow-v2/docs/factory/factory-map.md` if the issue adds a new factory surface, changes surface relationships, or the current map needs a deeper explanation of an existing surface for this problem pattern.

## Acceptance Criteria

- [ ] The required pipeline analysis covers PRD creation, task creation, task implementation, role enforcement, and code review.
- [ ] The issue uses the structure: Problem, Concrete Examples, Root Cause Analysis, Proposed Solutions, Verification Plan.
- [ ] The root cause analysis shows the reinforcement chain across the pipeline.
- [ ] Role enforcement is analyzed inside Root Cause Analysis using the real role materials.
- [ ] Proposed solutions map improvements onto the relevant factory stages.
- [ ] Verification is documented for each relevant improvement.
- [ ] Factory map documentation is updated when required by the problem pattern or surface changes.

## Commit Guidance

Use semantic commits with the `factory-optimization` scope, for example:

```text
feat(factory-optimization): add guardrail for <pattern>
```
````

Forbidden issue sections and noise:

- machine-oriented marker headings such as `Factory Optimization Marker`
- approval-style headings such as `Approved Optimization Tasks`
- any top-level section whose main purpose is template bookkeeping rather than helping a human reader understand the problem

Write the issue in the order a human reader would want to understand it, not in template bookkeeping order.

Create the issue:

```bash
gh issue create \
  --title 'Factory optimization: <short summary>' \
  --label 'factory' \
  --label 'factory optimization' \
  --body "$(cat <<'EOF'
<ISSUE_BODY>
EOF
)"
```

Capture the created issue URL.

## Step 8: Comment on source items

After issue creation succeeds, comment on every source item with this fixed format:

```markdown
Factory optimization accepted.

Created issue: <issue-url>

Agreed solution:
- <summary of prescribed factory change>

This thread can be resolved because the product PR should not carry factory optimization work.
```

For review threads, reply to the last review comment in the thread:

```bash
gh api \
  --method POST \
  'repos/<OWNER>/<REPO>/pulls/<PR_NUMBER>/comments/<DATABASE_ID>/replies' \
  -f body='<COMMENT_BODY>'
```

For general PR comments, add a PR comment that references the source comment URL:

```bash
gh pr comment <PR_NUMBER> --body '<COMMENT_BODY_WITH_SOURCE_URL>'
```

## Step 9: Resolve resolvable review threads

Resolve each review thread only after both issue creation and source-thread comment succeed:

```bash
gh api graphql \
  -F threadId='<THREAD_ID>' \
  -f query='mutation($threadId: ID!) {
    resolveReviewThread(input: { threadId: $threadId }) {
      thread { id isResolved }
    }
  }'
```

General PR comments cannot be resolved through review-thread resolution. Tell the user which general comments need manual handling.

If issue creation succeeds but any comment or thread resolution fails, stop and report:

- created issue URL
- source item URL
- failed operation
- thread ID or comment URL
- exact command error

Do not retry without user instruction.

## Step 10: Final response

Return:

- created GitHub issue URL
- source threads resolved
- source comments that require manual resolution
- failures, if any
