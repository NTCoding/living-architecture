# optimize-factory

Design factory optimizations from PR feedback or ad-hoc instructions. This command creates no product fixes. Its output is an approved GitHub issue that another implementation workflow can execute on a separate branch.

## Arguments

Accepted forms:

- Pull request number: `123`
- Pull request URL: `https://github.com/OWNER/REPO/pull/123`
- Ad-hoc instructions: free text describing the factory weakness to optimize

## Operating Principle

The factory is every mechanism that shapes generated code quality:

- lint rules and custom lint rules
- Riviere role enforcement
- architecture rules
- dependency checks
- test configuration and test helpers
- CI and workflow gates
- CodeRabbit configuration
- workflow commands, agents, hooks, and conventions
- new capabilities that do not exist yet

Never fix the product code under review. Design changes to the factory so the same issue is prevented or detected next time.

## Step 1: Classify the input

If the argument is a PR number or PR URL, run PR mode.

If the argument is ad-hoc text, run ad-hoc mode.

If the argument is missing or ambiguous, ask the user for either a PR number, PR URL, or ad-hoc factory optimization request.

## Step 2A: PR mode — fetch source material

Resolve the PR number:

```bash
gh pr view <PR_NUMBER_OR_URL> --json number,url,title,body,author,headRefName,baseRefName,reviewDecision,comments,reviews,files
```

Resolve the current repository:

```bash
gh repo view --json nameWithOwner
```

Fetch review threads using GraphQL:

```bash
gh api graphql \
  -F owner='<OWNER>' \
  -F name='<REPO>' \
  -F number=<PR_NUMBER> \
  -f query='query($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        url
        title
        reviewThreads(first: 100) {
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
- relevant factory files, including lint, role enforcement, CI, CodeRabbit, agents, commands, hooks, and conventions

## Step 2B: Ad-hoc mode — collect source material

Restate the factory weakness described by the user.

Ask whether prior factory memory should be searched before proposal if the answer is not obvious from the request.

Read relevant factory files and product examples needed to understand the pattern. Do not modify files.

## Step 3: Search factory memory

Read `tools/dev-workflow-v2/docs/factory/README.md`.

Search prior GitHub issues labeled `factory` and `factory optimization`:

```bash
gh issue list \
  --label 'factory' \
  --label 'factory optimization' \
  --state all \
  --limit 100 \
  --json number,title,state,labels,body,url,createdAt,closedAt
```

Use keywords from `[FACTORY]` comments, file paths, rule names, and factory surfaces to identify similar issues.

If memory is used, record:

- the prior issue URL
- the similarity
- the prior resolution
- how it influences the current proposal

If no relevant memory exists, state that no matching factory memory was found.

## Step 4: Discuss each optimization point

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

Factory memory:
- <prior issue references and influence, or "No matching factory memory found.">

Options considered:
1. <option>
   - Enforcement strength: deterministic | semi-deterministic | advisory
   - Accuracy and reliability: <assessment>
   - False-positive risk: <assessment>
   - Verification: <how it can be proven>
2. <option>
   - ...

Recommended solution:
- <prescribed factory change>

Rejected options:
- <option>: <reason>

Open decisions:
- <only include decisions that require user input>
```

Prioritize options in this order:

1. deterministic automated enforcement
2. tests or fixtures proving enforcement works
3. CI or workflow gate
4. review-agent or convention markdown as the last resort

For lint-rule optimizations, include a verification design that proves the rule fails on violating code. Prefer a dedicated fixture or rule test when the lint rule is custom. For `no-restricted-syntax`, prescribe a verification command that fails against a representative violation when practical.

If an issue does not fit the decision matrix in `tools/dev-workflow-v2/docs/factory/README.md`, include an explicit docs update requirement that extends the matrix.

## Step 5: Request approval

After all points have been discussed, ask the user for approval to create one aggregated GitHub issue.

Natural-language approval is enough. Do not create issues, comment on PR threads, or resolve threads before approval.

## Step 6: Create one aggregated GitHub issue

After approval, create exactly one GitHub issue with both labels:

- `factory`
- `factory optimization`

The issue title format is:

```text
Factory optimization: <short summary>
```

The issue body must use this structure:

````markdown
## Factory Optimization Marker

factory optimization

## Source

- PR: <url or "Ad-hoc request">
- Source comments:
  - <comment/thread URL>

## Factory Memory

- <prior issue URL>: <how it influenced this issue>
- Or: No matching factory memory found.

## Approved Optimization Tasks

- [ ] <task 1>
- [ ] <task 2>

## Context

<full context needed by the implementation agent>

## Options Discussed

### Option 1: <name>

- Enforcement strength: deterministic | semi-deterministic | advisory
- Accuracy and reliability: <assessment>
- Verification: <verification approach>

## Rejected Options

- <option>: <reason>

## Prescribed Solution

<exact factory changes to implement. Do not use "likely" language. Prescribe exact targets or name the explicit decision that remains open.>

## Enforcement Surface

- <ESLint/custom rule/Riviere/CI/CodeRabbit/workflow/agent/convention/new capability>

## Verification Strategy

- <commands, fixtures, tests, or manual validation that prove the factory optimization works>

## Documentation and Memory Updates

- [ ] Update `tools/dev-workflow-v2/docs/factory/README.md` if this issue adds a new decision pattern or changes the decision matrix.

## Acceptance Criteria

- [ ] The approved deterministic enforcement is implemented.
- [ ] Violating examples fail under the new enforcement when practical.
- [ ] Passing examples remain accepted when practical.
- [ ] The relevant verification command is documented and passes.
- [ ] Factory memory documentation is updated when the decision matrix changes.

## Commit Guidance

Use semantic commits with the `factory-optimization` scope, for example:

```text
feat(factory-optimization): add guardrail for <pattern>
```
````

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

## Step 7: Comment on source items

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

## Step 8: Resolve resolvable review threads

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

## Step 9: Final response

Return:

- created GitHub issue URL
- source threads resolved
- source comments that require manual resolution
- failures, if any
