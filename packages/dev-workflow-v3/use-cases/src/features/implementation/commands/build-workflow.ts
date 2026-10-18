import { z } from 'zod'
import type { Workflow } from '@mastra/core/workflows'
import { SoftwareFactoryWorkflow } from '@living-architecture/dev-workflow-v3-domain-model'
import type { AdaptWorkflow } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/adapt-workflow'

const findingSchema = z.object({
  reviewer: z.string(),
  file: z.string(),
  line: z.number().int().positive(),
  rule: z.string().nullable(),
  summary: z.string(),
  commentId: z.number().int().nullable().default(null),
})

const reviewedFindingSchema = findingSchema.omit({ reviewer: true })

const resolutionSchema = z.object({
  commentId: z.number().int().positive(),
  outcome: z.enum(['addressed', 'partly-addressed', 'not-addressed']),
  response: z.string().min(1),
})

const thinkingSchema = z.enum(['off', 'low', 'medium', 'high']).default('low')

const runStateSchema = z.object({
  issueNumber: z.number().int().positive(),
  attempt: z.number().int().positive().default(1),
  model: z.string(),
  thinking: thinkingSchema,
  worktreesDirectory: z.string(),
  issueTitle: z.string().default(''),
  issueBody: z.string().default(''),
  guidance: z.string().default(''),
  worktreePath: z.string().default(''),
  branch: z.string().default(''),
  planMarkdown: z.string().default(''),
  planNeedsInput: z.boolean().default(false),
  planQuestion: z.string().nullable().default(null),
  planCommentAt: z.string().default(''),
  clarification: z.string().default(''),
  changedFiles: z.array(z.string()).default([]),
  commitSha: z.string().default(''),
  pullRequestTitle: z.string().default(''),
  pullRequestBody: z.string().default(''),
  pullRequestNumber: z.number().int().positive().default(1),
  pullRequestUrl: z.string().default(''),
  readyForHuman: z.boolean().default(false),
})

const reviewStateSchema = z.object({
  runId: z.string(),
  model: z.string(),
  thinking: thinkingSchema,
  issueNumber: z.number().int().positive(),
  guidance: z.string().default(''),
  pullRequestNumber: z.number().int().positive(),
  pullRequestUrl: z.string().default(''),
  worktreePath: z.string(),
  branch: z.string(),
  cycleNumber: z.number().int().positive(),
  reviewerStatuses: z.record(z.string(), z.string()),
  cycleVerdicts: z
    .array(z.object({ reviewer: z.string(), status: z.string(), findings: z.array(findingSchema) }))
    .default([]),
  findings: z.array(findingSchema).default([]),
  resolutions: z.array(resolutionSchema).default([]),
  beforeSha: z.string().default(''),
  commitSha: z.string().default(''),
  changedFiles: z.array(z.string()).default([]),
  approved: z.boolean().default(false),
  limitReached: z.boolean().default(false),
  readyForHuman: z.boolean().default(false),
})

const blockerSuspendSchema = z.object({ question: z.string() })

const blockerResumeSchema = z.object({ answer: z.string() })

const unaddressedFeedbackSchema = z.object({
  reason: z.string().default(''),
  unaddressed: z.array(z.number().int().positive()).default([]),
})

const planSchema = z.object({
  markdown: z.string().min(1),
  needsInput: z.boolean(),
  question: z.string().nullable(),
})

const implementationSchema = z.object({
  blockedReason: z.string().nullable(),
  allWorkComplete: z.boolean(),
  allWorkCommitted: z.boolean(),
})

const feedbackSchema = z.object({ resolutions: z.array(resolutionSchema) })

const pullRequestDraftSchema = z.object({
  commitType: z.enum([
    'build',
    'chore',
    'ci',
    'docs',
    'feat',
    'fix',
    'perf',
    'refactor',
    'revert',
    'style',
    'test',
  ]),
  commitScope: z.string().regex(/^[a-z0-9-]{1,20}$/),
  subject: z.string().min(1).max(50),
  description: z.string().min(1),
  problem: z.string().min(1),
  acceptanceCriteria: z.string().min(1),
  keyChanges: z.string().min(1),
  architectureImpact: z.string(),
  validation: z.string().min(1),
  notes: z.string(),
})

const verdictSchema = z.object({
  status: z.enum(['APPROVED', 'OPEN_FEEDBACK']),
  findings: z.array(reviewedFindingSchema),
})

const PLANNER_INSTRUCTIONS = [
  'You are the planner in a software factory workflow.',
  'Read the issue and the repository guidance, then write a plan.',
  'Reason only. Do not write files, do not run commands, and do not open pull requests.',
  'The plan is a short numbered list of the changes the implementer will make.',
  'Set needsInput to false when the issue is clear enough to implement without asking',
  'anything. Set needsInput to true only when the plan would diverge from what the issue',
  'asks, or when a decision is genuinely needed, and put your questions in "question".',
].join('\n')

const ARCHITECTURE_REVIEW_INSTRUCTIONS = `You are the architecture gatekeeper. You enforce codebase structure conventions.

You have a read-only workspace on the branch under review.

## Review scope, prior decisions, and expected outcomes

The added and changed lines are in the diff in this message. Raise findings only on those lines. Read related files only to judge impact; do not report findings on unchanged lines.

Read the decision history supplied in your task before raising anything. A decision already settled with the developer is binding to you: do not raise the same point again. When your only candidate finding repeats a settled decision, approve instead.

Every finding must also state what good looks like: the expected outcome, and the concrete check, test, or assertion that verifies it. A finding that names only the problem is incomplete.

## Instructions

1. Read the local architecture sources of truth:
   - \`docs/architecture/overview.md\` — essential context for understanding the project architecture
   - \`docs/architecture/adr/ADR-002-allowed-folder-structures.md\` — location responsibilities and dependency rules
   - \`.riviere/role-enforcement.config.ts\` — executable location, dependency, and role rules
   - \`.riviere/role-definitions/index.md\` and the referenced local role definitions
   - \`docs/conventions/review-feedback-checks.md\` — especially consumer-mapping ownership checks learned from prior review failures
   - \`.agents/skills/role-check-and-lint-error-remediation/SKILL.md\` — examples of refactoring opportunities like extracting value objects
2. Skip test files (\`.spec.ts\`, \`.test.ts\`) — architecture review applies to production code only.
3. For each production file under review, read its contents and audit it against every applicable local rule.
4. Check related files as needed (callers, implementations, imports) to understand context.
5. Finish after returning your findings.

## Enforcement Method

Apply ADR-002, the role-enforcement configuration, and local role definitions mechanically. Do not invent or import rules from elsewhere. The repository already enforces the roles with the role-check command, so you need to look for abuses of roles. Only flag issues if you are more than 50% confident it is a real violation.

The local files listed above are the sources of truth. Do not paraphrase, soften, or add criteria beyond what they state.

**Burden of proof:** Code must satisfy every criterion the skill defines. If it fails any criterion, it fails the rule. There is no "overall it's fine" — each criterion is independently required.

**No judgment calls.** If you find yourself weighing pros and cons, stop and report the ambiguity between the local rules.

**Fix suggestions must comply with the same local rules.** Never suggest moving code into a location where it would also violate a role enforcement rule.

## External-Client Domain-Leak Check

If a file under \`infra/external-clients/**\` uses domain terminology in its exports, the logic belongs in the domain — not in the adapter. FAIL and move it.

## Consumer-Mapping Ownership Check

If a file under \`domain/\` defines a port, presenter, formatter, bridge, translator, or adapter whose only purpose is to map domain results into the API of a specific consumer such as CLI output, status updates, or builder writes, FAIL it. Pure code is not enough. The abstraction must still be a real domain concept.

## Evaluation Framework

FAIL if any findings, otherwise PASS. There are no severity levels — a violation is a violation. There are no valid skip reasons for architecture violations. The convention rules are absolute.

Invalid Excuses:
- "Too much time" / "too complex"
- "Out of scope" / "Pre-existing code" / "Only renamed"
- "Would require large refactor"

Default: Flag issues. Skip only if IMPOSSIBLE (cannot satisfy convention + requirements + lint + tests simultaneously).

## Additional domain and adapter checks

Fail the review when application code reads aggregate state to make a domain decision, or takes aggregate state out to construct an argument passed back into that aggregate. The aggregate or value object must own that behaviour.

For every domain service, test aggregate ownership first and value object ownership second. Fail when its justification does not specifically explain why neither owns the behaviour.

Fail when an adapter interprets generic metadata, duplicates schema knowledge, adds a union variant without compiler or contract-test detection, or has an ambiguous name compared with its port or established terminology.
`

const CODE_REVIEW_INSTRUCTIONS = `You are the coding standards enforcer. You review code against software design principles, testing conventions, and anti-patterns with absolute rigidity. If you are more than 50% confident a violation has taken place, you flag it.

You have a read-only workspace on the branch under review.

## Review scope, prior decisions, and expected outcomes

The added and changed lines are in the diff in this message. Raise findings only on those lines. Read related files only to judge impact; do not report findings on unchanged lines.

Read the decision history supplied in your task before raising anything. A decision already settled with the developer is binding to you: do not raise the same point again. When your only candidate finding repeats a settled decision, approve instead.

Every finding must also state what good looks like: the expected outcome, and the concrete check, test, or assertion that verifies it. A finding that names only the problem is incomplete.

## Instructions

1. Read the following convention files — these contain the rules you enforce:
   - \`docs/conventions/software-design.md\` — software design principles
   - \`docs/conventions/standard-patterns.md\` — standard implementation patterns
   - \`docs/conventions/anti-patterns.md\` — forbidden patterns
   - \`docs/conventions/testing.md\` — testing conventions
   - \`eslint.config.mjs\` — lint rules, to ensure feedback doesn't contradict them
2. Identify every rule defined in those files.
3. For each file under review, read its contents and audit against every rule.
4. Check related files as needed (callers, implementations, imports) to understand context.
5. Finish after returning your findings.

## Enforcement Method

Apply the rules from the convention files mechanically. Do not interpret, contextualize, or weigh circumstances. The rules define what's acceptable — your job is to check whether the code matches.

The convention docs are the single source of truth. Do not paraphrase, soften, or add criteria beyond what they state.

**Burden of proof:** Code must satisfy every criterion the conventions define. If it fails any criterion, it fails the rule. There is no "overall it's fine" — each criterion is independently required.

Do not suggest "this could be improved" — state "this violates [rule ID]" and mark FAIL.

**Fix suggestions must not contradict lint rules.** Never suggest using \`as\`, \`let\`, or other patterns banned by eslint. Read the lint config first.

## Evaluation Framework

FAIL if any findings, otherwise PASS. There are no severity levels — a violation is a violation. The convention rules are absolute.

Invalid Excuses:
- "Too much time" / "too complex"
- "Out of scope" / "Pre-existing code" / "Only renamed"
- "Would require large refactor"

Default: Flag issues. Skip only if IMPOSSIBLE (cannot satisfy convention + requirements + lint + tests simultaneously).

## Domain naming check

In the domain model, look for variables or fields named \`data\` or another generic word and identify whether a word from the domain describes it. If so, fail the review and suggest the better name.
`

const BUG_SCANNER_INSTRUCTIONS = `You are the bug hunter. You scan code for bugs, dangerous patterns, and security issues. If you are more than 50% confident a violation exists then report it.

You have a read-only workspace on the branch under review.

## Review scope, prior decisions, and expected outcomes

The added and changed lines are in the diff in this message. Raise findings only on those lines. Read related files only to judge impact; do not report findings on unchanged lines.

Read the decision history supplied in your task before raising anything. A decision already settled with the developer is binding to you: do not raise the same point again. When your only candidate finding repeats a settled decision, approve instead.

Every finding must also state what good looks like: the expected outcome, and the concrete check, test, or assertion that verifies it. A finding that names only the problem is incomplete.

## Instructions

1. Read \`docs/conventions/anti-patterns.md\` for codebase-specific anti-patterns (AP-001 through AP-006)
2. Read \`docs/conventions/review-feedback-checks.md\` for RFC checks (RFC-001 through RFC-009)
3. Review every file changed in this pull request
4. For each file, read its contents and scan for the patterns described
5. Check related files as needed to understand context
6. Finish after returning your findings.

## Priority 1: Bug Patterns

### BS-001: Silent Error Swallowing

\`\`\`typescript
// BAD - errors disappear
.catch(() => {})
.catch(e => console.log(e))  // log isn't handling
try { } catch { }
try { } catch (e) { console.log(e) }
\`\`\`

### BS-002: Dangerous Type Assertions

\`\`\`typescript
// BAD - bypassing type safety
as any
as unknown as SomeType
value!  // non-null assertion without prior validation
\`\`\`

### BS-003: Incomplete Async Error Handling

\`\`\`typescript
// BAD - unhandled promise rejection
async function foo() { await bar() }  // no try/catch
promise.then(handler)  // no .catch()
\`\`\`

### BS-004: Dangerous Fallback Values

\`\`\`typescript
// BAD - hiding missing data
value ?? 'default'  // without clear reason
value || 'fallback'  // same
config.setting ?? true  // defaulting booleans
\`\`\`

Exception: Optional parameters with documented defaults, test data.

### BS-005: Race Conditions

\`\`\`typescript
// BAD - read-then-write without synchronization
if (state.value) { state.value = newValue }
\`\`\`

### BS-006: Logic Errors

- Off-by-one errors in loops/slices
- Inverted conditions
- Missing break/return statements
- Unreachable code
- Unused variables that should be used

## Priority 2: Framework & Library Misuse

### BS-007: Inefficient API Usage

- Using multiple calls when a single batch API exists
- Manual implementations of built-in utilities
- Ignoring return values that contain useful data

### BS-008: Deprecated Patterns

- Using deprecated APIs when modern alternatives exist
- Old syntax when newer, cleaner syntax is available
- Patterns the library docs explicitly discourage

### BS-009: Missing Library Features

- Hand-rolling logic that the library provides
- Verbose workarounds for solved problems
- Not leveraging type utilities, helpers, or extensions

### BS-010: Framework Anti-Patterns

- Fighting the framework instead of working with it
- Bypassing framework patterns without justification
- Mixing paradigms inappropriately

## Priority 3: Dangerous Config Changes

### BS-011: Dangerous Config Changes

Protected files that should rarely change:

- \`tsconfig.base.json\`, \`tsconfig.json\`
- \`eslint.config.mjs\`
- \`nx.json\`
- \`pnpm-workspace.yaml\`
- \`.husky/*\`
- \`.gitignore\`
- \`.claude/settings.json\`
- \`.claude/hooks/*\`

Flag ANY modification to these files.

## Priority 4: Security Issues

### BS-012: Hardcoded Secrets

- API keys, tokens, passwords
- Connection strings with credentials
- Private keys

### BS-013: Sensitive Data Exposure

- Logging PII, credentials, tokens
- Exposing internal paths/system info
- Debug code in production paths

### BS-014: Injection Risks

- Unescaped user input in shell commands
- Template injection

## Priority 5: Inconsistent Patterns

### BS-015: Inconsistent Patterns Across Feature Files

When reviewing files within the same feature/module, check for inconsistent approaches to the same concern:

- Different error handling strategies in related files
- Different resolution strategies (e.g., string-based vs symbol-based) for the same kind of lookup
- Different naming conventions for the same concept
- Different patterns for the same operation (e.g., one file filters before processing, another mutates during processing)

**Detection:** When reviewing a file, scan sibling files in the same directory/feature for the same kind of operation. Flag inconsistencies.

## Priority 6: Review Feedback Checks

Read \`docs/conventions/review-feedback-checks.md\` and apply each RFC check to changed code.

## Severity Levels

- **critical**: Security issues, data loss, crashes. Must fix.
- **major**: Bugs, dangerous patterns, config changes. Should fix.
- **minor**: Framework misuse, inefficiencies. Nice to fix.
`

const REVIEWER_INSTRUCTIONS: Readonly<Record<ReviewerName, string>> = {
  'architecture-review': ARCHITECTURE_REVIEW_INSTRUCTIONS,
  'code-review': CODE_REVIEW_INSTRUCTIONS,
  'bug-scanner': BUG_SCANNER_INSTRUCTIONS,
}

const FEEDBACK_INSTRUCTIONS = `You address review feedback on a pull request.

The workflow gives you the feedback items. You do not fetch them, and you do not post to GitHub. The workflow posts your responses.

For each item:
- If it is a bug, a clear rule violation, or poor code, fix it.
- If it is wrong or cannot be done, reject it with a specific technical reason. Never use "out of scope" or "nitpick" as the reason.
- If it needs a design decision you cannot make, use the ask-user tool and wait for the answer.

For a fix, say why the feedback is valid, what you changed, and how you verified it.
For a rejection, state the specific technical reason.

Answer every item. The workflow will not accept this step until you have one response for every item it gave you.
Commit your changes. Do not push and do not post to GitHub.
Do not resolve anything. The workflow posts the responses and resolves the threads.
Do not broaden the scope of the pull request without a person's approval.

`
const PULL_REQUEST_WRITER_INSTRUCTIONS = [
  'You are the pull request writer in a software factory workflow.',
  'Read the issue, the implementation summary and the checks, then write the pull request.',
  'Follow the existing pull request format of this repository exactly.',
  'Do not invent work that was not done, and do not claim a check or a test that did not run.',
].join('\n')

const IMPLEMENTER_INSTRUCTIONS = [
  'You are the implementer in a software factory workflow.',
  'Write the code in the workspace, following the plan and the repository guidance.',
  'Run the checks, read the failures, and fix them, up to a sensible number of attempts.',
  'When you cannot decide alone, use the ask-user tool and wait for the answer.',
  'Do not push, do not open a pull request, and do not merge anything. The workflow does those.',
  'You must commit your work before you finish. The commit runs the repository checks,',
  'and if they fail you must fix them and commit again. Do not push.',
  'When the plan is done, the checks pass and the work is committed, return the summary',
  'with allWorkComplete and allWorkCommitted both true. If you are running low on steps,',
  'stop calling tools, commit what you have, and return the summary saying what is left.',
].join('\n')

const CODERABBIT = 'coderabbit'

const IMPLEMENTATION_TIME_BUDGET_MS = 60 * 60 * 1000
const IMPLEMENTATION_ROUNDS = 3
const FEEDBACK_TIME_BUDGET_MS = 30 * 60 * 1000
const FEEDBACK_ROUNDS = 2
const REVIEW_TIME_BUDGET_MS = 30 * 60 * 1000

type RunState = z.infer<typeof runStateSchema>

type ReviewState = z.infer<typeof reviewStateSchema>

type ReviewFinding = z.infer<typeof findingSchema>

type PullRequestDraftAnswer = z.infer<typeof pullRequestDraftSchema>

type AdaptWorkflowRequest = Parameters<AdaptWorkflow<Workflow>>[0]

type WorkflowStepDefinition = AdaptWorkflowRequest['steps'][number]

/** @riviere-role command-use-case-input */
export interface BuildWorkflowInput {
  readonly loadIssue: (issueNumber: number) => Promise<{
    readonly title: string
    readonly body: string
  }>
  readonly prepareBranch: (request: {
    readonly issueNumber: number
    readonly issueTitle: string
    readonly worktreesDirectory: string
    readonly attempt: number
  }) => Promise<{ readonly worktreePath: string; readonly branch: string }>
  readonly installDependencies: (request: { readonly worktreePath: string }) => Promise<void>
  readonly readGuidance: () => Promise<string>
  readonly generate: (request: {
    readonly agentId: string
    readonly model: string
    readonly thinking: string
    readonly instructions: string
    readonly prompt: string
    readonly workspacePath: string | null
    readonly threadId: string | null
    readonly useTools: boolean
    readonly workspaceWritable: boolean
    readonly responseSchema: z.ZodType<unknown> | null
    readonly maxSteps: number
    readonly timeBudgetMs: number
  }) => Promise<{
    readonly object: unknown
    readonly text: string
    readonly finishReason: string
    readonly suspendPayload: unknown
  }>
  readonly checkWorkCommitted: (request: {
    readonly worktreePath: string
    readonly from: string | null
  }) => Promise<{
    readonly clean: boolean
    readonly hasCommit: boolean
    readonly sha: string
    readonly status: string
    readonly changedFiles: readonly string[]
  }>
  readonly replyToReviewComment: (request: {
    readonly pullRequestNumber: number
    readonly commentId: number
    readonly body: string
  }) => Promise<void>
  readonly pushBranch: (request: {
    readonly worktreePath: string
    readonly branch: string
  }) => Promise<void>
  readonly openPullRequest: (request: {
    readonly worktreePath: string
    readonly branch: string
    readonly title: string
    readonly description: string
  }) => Promise<{ readonly number: number; readonly url: string }>
  readonly commentOnIssue: (request: {
    readonly issueNumber: number
    readonly body: string
  }) => Promise<{ readonly createdAt: string }>
  readonly waitForIssueReply: (request: {
    readonly issueNumber: number
    readonly after: string
  }) => Promise<{ readonly reply: string | null }>
  readonly commentOnPullRequest: (request: {
    readonly pullRequestNumber: number
    readonly body: string
  }) => Promise<void>
  readonly readPullRequestDiff: (request: {
    readonly pullRequestNumber: number
  }) => Promise<{ readonly diff: string }>
  readonly closeReviewCycle: (request: {
    readonly cycleNumber: number
    readonly statuses: Readonly<Record<string, string>>
    readonly verdicts: readonly {
      readonly reviewer: string
      readonly status: string
      readonly findings: readonly ReviewFinding[]
    }[]
  }) => Promise<{
    readonly cycleNumber: number
    readonly statuses: Readonly<Record<string, string>>
    readonly reviewersToRun: readonly string[]
    readonly reviewersLeftOut: readonly string[]
    readonly limitReached: boolean
  }>
  readonly publishReviewFindings: (request: {
    readonly pullRequestNumber: number
    readonly findings: readonly ReviewFinding[]
  }) => Promise<{
    readonly posted: readonly {
      readonly file: string
      readonly line: number
      readonly commentId: number
    }[]
  }>
  readonly waitForReviewer: (request: { readonly pullRequestNumber: number }) => Promise<{
    readonly reviewSeen: boolean
    readonly rateLimited: boolean
    readonly comments: readonly {
      readonly commentId: number
      readonly path: string
      readonly line: number
      readonly body: string
    }[]
  }>
  readonly adaptWorkflow: AdaptWorkflow<Workflow>
}

/** @riviere-role command-use-case-result */
export interface BuildWorkflowResult {
  readonly startImplementation: Workflow
  readonly reviewCycle: Workflow
}

/** @riviere-role command-use-case */
export class BuildWorkflow {
  async execute(input: BuildWorkflowInput): Promise<BuildWorkflowResult> {
    const workflow = SoftwareFactoryWorkflow.singleton()
    const startImplementation = await input.adaptWorkflow({
      plan: workflow.startImplementation(),
      loopUntil: (state) => reviewIsComplete(reviewStateSchema.parse(state)),
      steps: startImplementationSteps(input),
    })
    const reviewCycle = await input.adaptWorkflow({
      plan: workflow.reviewCycle(),
      loopUntil: null,
      steps: reviewCycleSteps(input),
    })
    return { startImplementation: startImplementation.built, reviewCycle: reviewCycle.built }
  }
}

function startImplementationSteps(input: BuildWorkflowInput): readonly WorkflowStepDefinition[] {
  return [
    {
      id: 'load-issue',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        const issue = await input.loadIssue(state.issueNumber)
        return { ...state, issueTitle: issue.title, issueBody: issue.body }
      },
    },
    {
      id: 'prepare-branch',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        const prepared = await input.prepareBranch({
          issueNumber: state.issueNumber,
          issueTitle: state.issueTitle,
          worktreesDirectory: state.worktreesDirectory,
          attempt: state.attempt,
        })
        return { ...state, ...prepared }
      },
    },
    {
      id: 'install-dependencies',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        await input.installDependencies({ worktreePath: state.worktreePath })
        return state
      },
    },
    {
      id: 'read-guidance',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        return { ...state, guidance: await input.readGuidance() }
      },
    },
    {
      id: 'draft-plan',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        const response = await input.generate({
          agentId: 'planner',
          model: state.model,
          thinking: state.thinking,
          instructions: PLANNER_INSTRUCTIONS,
          prompt: planPrompt(state),
          workspacePath: null,
          threadId: null,
          useTools: false,
          workspaceWritable: false,
          responseSchema: planSchema,
          maxSteps: 1,
          timeBudgetMs: 5 * 60 * 1000,
        })
        const plan = planSchema.safeParse(response.object)
        if (!plan.success) throw new RunFailed(noStructuredOutput('The planner', response))
        return {
          ...state,
          planMarkdown: plan.data.markdown,
          planNeedsInput: plan.data.needsInput,
          planQuestion: plan.data.question,
        }
      },
    },
    {
      id: 'publish-plan',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        const posted = await input.commentOnIssue({
          issueNumber: state.issueNumber,
          body: planComment(state),
        })
        return { ...state, planCommentAt: posted.createdAt }
      },
    },
    {
      id: 'wait-for-plan-clarification',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        if (!state.planNeedsInput) return state
        const { reply } = await input.waitForIssueReply({
          issueNumber: state.issueNumber,
          after: state.planCommentAt,
        })
        if (reply === null) {
          throw new RunFailed(
            'Nobody replied on the issue to the plan question. The plan is still on the issue. Start again when the answer is there.',
          )
        }
        return { ...state, clarification: reply }
      },
    },
    {
      id: 'implement',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: blockerSuspendSchema,
      resumeSchema: blockerResumeSchema,
      run: async ({ data, resumeData, suspend }) => {
        const state = runStateSchema.parse(data)
        const answer = blockerResumeSchema.safeParse(resumeData)
        const implementation = await implementUntilCommitted({
          input,
          state: { ...state, baseSha: '' },
          firstPrompt: implementationPrompt(state, answer.success ? answer.data.answer : null),
          instructions: IMPLEMENTER_INSTRUCTIONS,
          rounds: IMPLEMENTATION_ROUNDS,
          timeBudgetMs: IMPLEMENTATION_TIME_BUDGET_MS,
        })
        if (implementation.kind === 'unfinished') throw new RunFailed(implementation.reason)
        if (implementation.kind === 'question') {
          return await suspend({ question: implementation.question })
        }
        return {
          ...state,
          commitSha: implementation.sha,
          changedFiles: implementation.changedFiles,
        }
      },
    },
    {
      id: 'push-branch',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        await input.pushBranch({ worktreePath: state.worktreePath, branch: state.branch })
        return state
      },
    },
    {
      id: 'draft-pull-request',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        const response = await input.generate({
          agentId: 'pull-request-writer',
          model: state.model,
          thinking: state.thinking,
          instructions: PULL_REQUEST_WRITER_INSTRUCTIONS,
          prompt: pullRequestPrompt(state),
          workspacePath: null,
          threadId: null,
          useTools: false,
          workspaceWritable: false,
          responseSchema: pullRequestDraftSchema,
          maxSteps: 1,
          timeBudgetMs: 5 * 60 * 1000,
        })
        const draft = pullRequestDraftSchema.safeParse(response.object)
        if (!draft.success) {
          throw new RunFailed(noStructuredOutput('The pull request writer', response))
        }
        return {
          ...state,
          pullRequestTitle: pullRequestTitle(draft.data),
          pullRequestBody: pullRequestBody(state, draft.data),
        }
      },
    },
    {
      id: 'open-pull-request',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        const opened = await input.openPullRequest({
          worktreePath: state.worktreePath,
          branch: state.branch,
          title: state.pullRequestTitle,
          description: state.pullRequestBody,
        })
        return { ...state, pullRequestNumber: opened.number, pullRequestUrl: opened.url }
      },
    },
    {
      id: 'open-review-cycle',
      inputSchema: runStateSchema,
      outputSchema: reviewStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        return {
          runId: `issue-${String(state.issueNumber)}`,
          model: state.model,
          thinking: state.thinking,
          issueNumber: state.issueNumber,
          guidance: state.guidance,
          pullRequestNumber: state.pullRequestNumber,
          pullRequestUrl: state.pullRequestUrl,
          worktreePath: state.worktreePath,
          branch: state.branch,
          cycleNumber: 1,
          reviewerStatuses: {},
          cycleVerdicts: [],
          beforeSha: state.commitSha,
          commitSha: state.commitSha,
          changedFiles: state.changedFiles,
        }
      },
    },
    {
      id: 'review-cycle',
      inputSchema: reviewStateSchema,
      outputSchema: reviewStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data, workflow }) => {
        const state = reviewStateSchema.parse(data)
        const cycle = await workflow('review-cycle').start({
          runId: `${state.runId}-review-${String(state.cycleNumber)}`,
          input: state,
        })
        if (cycle.status !== 'success') {
          throw new ReviewCycleFailed(state.cycleNumber, cycle.status)
        }
        return reviewStateSchema.parse(cycle.result)
      },
    },
    {
      id: 'mark-ready-for-human',
      inputSchema: reviewStateSchema,
      outputSchema: reviewStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = reviewStateSchema.parse(data)
        await input.commentOnPullRequest({
          pullRequestNumber: state.pullRequestNumber,
          body: readyComment(state),
        })
        return { ...state, readyForHuman: true }
      },
    },
  ]
}

function reviewCycleSteps(input: BuildWorkflowInput): readonly WorkflowStepDefinition[] {
  return [
    reviewStep(input, 'architecture-review'),
    reviewStep(input, 'code-review'),
    reviewStep(input, 'bug-scanner'),
    {
      id: 'collect-verdicts',
      inputSchema: reviewStateSchema,
      outputSchema: reviewStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = reviewStateSchema.parse(data)
        const closed = await input.closeReviewCycle({
          cycleNumber: state.cycleNumber,
          statuses: state.reviewerStatuses,
          verdicts: state.cycleVerdicts,
        })
        return {
          ...state,
          reviewerStatuses: closed.statuses,
          cycleVerdicts: [],
          approved: state.findings.length === 0,
          limitReached: closed.limitReached,
        }
      },
    },
    {
      id: 'publish-review-findings',
      inputSchema: reviewStateSchema,
      outputSchema: reviewStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = reviewStateSchema.parse(data)
        const findings = state.findings.filter((finding) => finding.reviewer !== CODERABBIT)
        const posted = await input.publishReviewFindings({
          pullRequestNumber: state.pullRequestNumber,
          findings,
        })
        const withIds = findings.map((finding, index) => {
          const entry = posted.posted[index]
          if (entry === undefined) {
            throw new RunFailed(
              `The finding ${finding.file}:${String(finding.line)} was not posted.`,
            )
          }
          return { ...finding, commentId: entry.commentId }
        })
        const coderabbit = state.findings.filter((finding) => finding.reviewer === CODERABBIT)
        return { ...state, findings: [...withIds, ...coderabbit] }
      },
    },
    {
      id: 'wait-for-coderabbit',
      inputSchema: reviewStateSchema,
      outputSchema: reviewStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = reviewStateSchema.parse(data)
        const feedback = await input.waitForReviewer({
          pullRequestNumber: state.pullRequestNumber,
        })
        return {
          ...state,
          approved: state.approved && !feedback.rateLimited,
          findings: [...state.findings, ...coderabbitFindings(feedback)],
        }
      },
    },
    {
      id: 'address-feedback',
      inputSchema: reviewStateSchema,
      outputSchema: reviewStateSchema,
      suspendSchema: unaddressedFeedbackSchema,
      resumeSchema: null,
      run: async ({ data, suspend }) => {
        const state = reviewStateSchema.parse(data)
        const required = state.findings.flatMap((finding) =>
          finding.commentId === null ? [] : [finding.commentId],
        )
        if (state.findings.length === 0) return state
        const feedback = await resolveFeedback({
          input,
          state: {
            issueNumber: state.issueNumber,
            model: state.model,
            thinking: state.thinking,
            worktreePath: state.worktreePath,
            guidance: state.guidance,
            baseSha: state.beforeSha,
          },
          firstPrompt: feedbackPrompt(state),
          instructions: FEEDBACK_INSTRUCTIONS,
          requiredCommentIds: required,
          rounds: FEEDBACK_ROUNDS,
          timeBudgetMs: FEEDBACK_TIME_BUDGET_MS,
        })
        if (feedback.kind === 'question') {
          throw new RunFailed(`The implementer is blocked: ${feedback.question}`)
        }
        if (feedback.kind === 'unfinished') {
          return await suspend({ reason: feedback.reason, unaddressed: feedback.missing })
        }
        return { ...state, resolutions: feedback.resolutions }
      },
    },
    {
      id: 'push-branch',
      inputSchema: reviewStateSchema,
      outputSchema: reviewStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = reviewStateSchema.parse(data)
        const committed = await input.checkWorkCommitted({
          worktreePath: state.worktreePath,
          from: state.beforeSha,
        })
        if (!committed.clean) {
          throw new RunFailed(`The worktree still has changes: ${committed.status}`)
        }
        await input.pushBranch({ worktreePath: state.worktreePath, branch: state.branch })
        return {
          ...state,
          commitSha: committed.sha,
          changedFiles: committed.changedFiles,
          beforeSha: committed.sha,
          cycleNumber: state.cycleNumber + (state.approved || state.limitReached ? 0 : 1),
        }
      },
    },
    {
      id: 'publish-review-replies',
      inputSchema: reviewStateSchema,
      outputSchema: reviewStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = reviewStateSchema.parse(data)
        for (const resolution of state.resolutions) {
          await input.replyToReviewComment({
            pullRequestNumber: state.pullRequestNumber,
            commentId: resolution.commentId,
            body: renderReply(resolution),
          })
        }
        return { ...state, resolutions: [], findings: [] }
      },
    },
  ]
}

type ReviewerName = 'architecture-review' | 'code-review' | 'bug-scanner'

function reviewStep(input: BuildWorkflowInput, reviewer: ReviewerName): WorkflowStepDefinition {
  return {
    id: reviewer,
    inputSchema: reviewStateSchema,
    outputSchema: reviewStateSchema,
    suspendSchema: null,
    resumeSchema: null,
    run: async ({ data }) => {
      const state = reviewStateSchema.parse(data)
      const previous = state.reviewerStatuses[reviewer] ?? null
      if (previous === 'APPROVED') return state
      const { diff } = await input.readPullRequestDiff({
        pullRequestNumber: state.pullRequestNumber,
      })
      const response = await input.generate({
        agentId: reviewer,
        model: state.model,
        thinking: state.thinking,
        instructions: REVIEWER_INSTRUCTIONS[reviewer],
        prompt: reviewPrompt(state, reviewer, previous, diff),
        workspacePath: state.worktreePath,
        threadId: null,
        useTools: true,
        workspaceWritable: false,
        responseSchema: verdictSchema,
        maxSteps: 200,
        timeBudgetMs: REVIEW_TIME_BUDGET_MS,
      })
      const verdict = verdictSchema.safeParse(response.object)
      if (!verdict.success) throw new RunFailed(noStructuredOutput(`The ${reviewer}`, response))
      return {
        ...state,
        cycleVerdicts: [
          ...state.cycleVerdicts,
          {
            reviewer,
            status: verdict.data.status,
            findings: verdict.data.findings.map((finding) => ({ ...finding, reviewer })),
          },
        ],
        findings: [
          ...state.findings,
          ...verdict.data.findings.map((finding) => ({ ...finding, reviewer })),
        ],
      }
    },
  }
}

type ImplementationTarget = {
  readonly issueNumber: number
  readonly model: string
  readonly thinking: string
  readonly worktreePath: string
  readonly guidance: string
  readonly baseSha: string
}

type ImplementationResult =
  | {
      readonly kind: 'committed'
      readonly sha: string
      readonly changedFiles: readonly string[]
    }
  | { readonly kind: 'question'; readonly question: string }
  | { readonly kind: 'unfinished'; readonly reason: string; readonly missing: readonly number[] }

async function implementUntilCommitted(request: {
  readonly input: BuildWorkflowInput
  readonly state: ImplementationTarget
  readonly firstPrompt: string
  readonly instructions: string
  readonly rounds: number
  readonly timeBudgetMs: number
}): Promise<ImplementationResult> {
  const progress = { prompt: request.firstPrompt, round: 0, startedAt: Date.now() }
  for (;;) {
    const remaining = request.timeBudgetMs - (Date.now() - progress.startedAt)
    const round = await runImplementationRound(request, progress.prompt, Math.max(remaining, 1))
    if (round.kind === 'question') return round
    const committed = await request.input.checkWorkCommitted({
      worktreePath: request.state.worktreePath,
      from: request.state.baseSha,
    })
    if (isFinished(round.answer, committed)) {
      return {
        kind: 'committed',
        sha: committed.sha,
        changedFiles: committed.changedFiles,
      }
    }
    progress.round += 1
    if (progress.round >= request.rounds) {
      return {
        kind: 'unfinished',
        reason: unfinishedMessage(round.answer, committed),
        missing: [],
      }
    }
    progress.prompt = nudgePrompt(round.answer, committed)
  }
}

function missingResolutions(
  resolutions: readonly { readonly commentId: number }[],
  required: readonly number[],
): readonly number[] {
  const provided = new Set(resolutions.map((resolution) => resolution.commentId))
  return required.filter((id) => !provided.has(id))
}

type FeedbackResult =
  | {
      readonly kind: 'committed'
      readonly sha: string
      readonly changedFiles: readonly string[]
      readonly resolutions: readonly z.infer<typeof resolutionSchema>[]
    }
  | { readonly kind: 'question'; readonly question: string }
  | { readonly kind: 'unfinished'; readonly reason: string; readonly missing: readonly number[] }

async function resolveFeedback(request: {
  readonly input: BuildWorkflowInput
  readonly state: ImplementationTarget
  readonly firstPrompt: string
  readonly instructions: string
  readonly requiredCommentIds: readonly number[]
  readonly rounds: number
  readonly timeBudgetMs: number
}): Promise<FeedbackResult> {
  const progress = { prompt: request.firstPrompt, round: 0, startedAt: Date.now() }
  for (;;) {
    const remaining = request.timeBudgetMs - (Date.now() - progress.startedAt)
    const round = await runFeedbackRound(request, progress.prompt, Math.max(remaining, 1))
    if (round.kind === 'question') return round
    const committed = await request.input.checkWorkCommitted({
      worktreePath: request.state.worktreePath,
      from: request.state.baseSha,
    })
    const missing = missingResolutions(round.answer.resolutions, request.requiredCommentIds)
    if (committed.clean && committed.hasCommit && missing.length === 0) {
      return {
        kind: 'committed',
        sha: committed.sha,
        changedFiles: committed.changedFiles,
        resolutions: round.answer.resolutions,
      }
    }
    progress.round += 1
    if (progress.round >= request.rounds) {
      return {
        kind: 'unfinished',
        reason: feedbackUnfinishedMessage(committed, missing),
        missing,
      }
    }
    progress.prompt = feedbackNudgePrompt(committed, missing)
  }
}

async function runFeedbackRound(
  request: {
    readonly input: BuildWorkflowInput
    readonly state: ImplementationTarget
    readonly instructions: string
  },
  prompt: string,
  remaining: number,
): Promise<
  | { readonly kind: 'answer'; readonly answer: z.infer<typeof feedbackSchema> }
  | { readonly kind: 'question'; readonly question: string }
> {
  const response = await request.input.generate({
    agentId: 'implementer',
    model: request.state.model,
    thinking: request.state.thinking,
    instructions: request.instructions,
    prompt,
    workspacePath: request.state.worktreePath,
    threadId: `issue-${String(request.state.issueNumber)}`,
    useTools: true,
    workspaceWritable: true,
    responseSchema: feedbackSchema,
    maxSteps: 1000,
    timeBudgetMs: remaining,
  })
  if (response.finishReason === 'suspended') {
    return { kind: 'question', question: questionFrom(response.suspendPayload) }
  }
  if (response.finishReason === 'aborted') throw new RunFailed(timeExhaustedMessage)
  if (response.finishReason === 'tool-calls') throw new RunFailed(stepsExhaustedMessage)
  const outcome = feedbackSchema.safeParse(response.object)
  if (!outcome.success) throw new RunFailed(noStructuredOutput('The implementer', response))
  return { kind: 'answer', answer: outcome.data }
}

function feedbackUnfinishedMessage(committed: CommitState, missing: readonly number[]): string {
  return [
    'The implementer did not finish the feedback.',
    missing.length === 0
      ? 'It answered every finding.'
      : `It did not answer these findings: ${missing.join(', ')}.`,
    committed.clean
      ? 'The worktree is clean.'
      : `Changes still not committed:\n${tailOf(committed.status)}`,
  ].join('\n')
}

function feedbackNudgePrompt(committed: CommitState, missing: readonly number[]): string {
  return [
    'You are not finished.',
    committed.clean
      ? 'The worktree is clean.'
      : `The worktree still has changes that are not committed:\n${tailOf(committed.status)}`,
    committed.hasCommit ? 'The branch has your commit.' : 'The branch has no commit of yours yet.',
    missing.length === 0
      ? 'You answered every finding.'
      : `You did not answer these findings: ${missing.join(', ')}. Answer each one.`,
    'Commit your changes and return a response for every finding.',
  ].join('\n')
}

type RoundOutcome =
  | { readonly kind: 'answer'; readonly answer: z.infer<typeof implementationSchema> }
  | { readonly kind: 'question'; readonly question: string }

async function runImplementationRound(
  request: {
    readonly input: BuildWorkflowInput
    readonly state: ImplementationTarget
    readonly instructions: string
  },
  prompt: string,
  remaining: number,
): Promise<RoundOutcome> {
  const response = await request.input.generate({
    agentId: 'implementer',
    model: request.state.model,
    thinking: request.state.thinking,
    instructions: request.instructions,
    prompt,
    workspacePath: request.state.worktreePath,
    threadId: `issue-${String(request.state.issueNumber)}`,
    useTools: true,
    workspaceWritable: true,
    responseSchema: implementationSchema,
    maxSteps: 1000,
    timeBudgetMs: remaining,
  })
  if (response.finishReason === 'suspended') {
    return { kind: 'question', question: questionFrom(response.suspendPayload) }
  }
  if (response.finishReason === 'aborted') throw new RunFailed(timeExhaustedMessage)
  if (response.finishReason === 'tool-calls') throw new RunFailed(stepsExhaustedMessage)
  const outcome = implementationSchema.safeParse(response.object)
  if (!outcome.success) throw new RunFailed(noStructuredOutput('The implementer', response))
  if (outcome.data.blockedReason !== null) {
    return { kind: 'question', question: outcome.data.blockedReason }
  }
  return { kind: 'answer', answer: outcome.data }
}

function isFinished(answer: ImplementationAnswer, committed: CommitState): boolean {
  return answer.allWorkComplete && answer.allWorkCommitted && committed.clean && committed.hasCommit
}

type ImplementationAnswer = {
  readonly allWorkComplete: boolean
  readonly allWorkCommitted: boolean
}

type CommitState = {
  readonly clean: boolean
  readonly hasCommit: boolean
  readonly status: string
}

const timeExhaustedMessage =
  'The implementer ran out of time. The work in the worktree is kept. Start again on the same issue to carry on from it.'

const stepsExhaustedMessage =
  'The implementer used all its steps without finishing. The work in the worktree is kept. Start again on the same issue to carry on from it.'

function unfinishedMessage(answer: ImplementationAnswer, committed: CommitState): string {
  return [
    'The implementer did not finish the feedback and the work is not committed.',
    answer.allWorkComplete
      ? 'It said the work was complete.'
      : 'It said the work was not complete.',
    answer.allWorkCommitted
      ? 'It said the work was committed.'
      : 'It said the work was not committed.',
    committed.clean
      ? 'The worktree is clean.'
      : `Changes still not committed:\n${tailOf(committed.status)}`,
  ].join('\n')
}

function nudgePrompt(answer: ImplementationAnswer, committed: CommitState): string {
  return [
    'You are not finished.',
    '',
    committed.clean
      ? 'The worktree is clean.'
      : `The worktree still has changes that are not committed:\n${tailOf(committed.status)}`,
    committed.hasCommit ? 'The branch has your commit.' : 'The branch has no commit of yours yet.',
    `Your last answer said allWorkComplete=${String(answer.allWorkComplete)} and allWorkCommitted=${String(answer.allWorkCommitted)}.`,
    '',
    'Finish the work, run the checks, commit it with a conventional message, answer every',
    'finding, and only then return the result.',
  ].join('\n')
}

function tailOf(output: string): string {
  return output.split('\n').slice(-20).join('\n')
}

function planComment(state: RunState): string {
  const posted = [
    "[dev-workflow-v3] Implementer's plan",
    '',
    state.planMarkdown,
    '',
    '---',
    '',
    `Run \`issue-${String(state.issueNumber)}\`.`,
  ]
  if (state.planNeedsInput) {
    posted.push('', '### Needs your input', '')
    if (state.planQuestion !== null) posted.push(state.planQuestion)
    posted.push('', 'Reply on this issue and the run will carry on with your answer.')
  }
  return posted.join('\n')
}

function planPrompt(state: RunState): string {
  return [
    `Issue ${String(state.issueNumber)}: ${state.issueTitle}`,
    '',
    state.issueBody,
    '',
    'Repository guidance:',
    state.guidance,
    '',
    'Your response:',
    '- markdown: the plan, as a short numbered list.',
    '- needsInput: true when a decision is needed before implementation, otherwise false.',
    '- question: the question for the developer when needsInput is true, otherwise null.',
  ].join('\n')
}

function implementationPrompt(state: RunState, answer: string | null): string {
  const first = [
    `Implement issue ${String(state.issueNumber)} in this workspace.`,
    '',
    'Plan:',
    state.planMarkdown,
    '',
    'Repository guidance:',
    state.guidance,
    '',
    'Your response:',
    '- blockedReason: a question for the developer when you cannot continue, otherwise null.',
    '- allWorkComplete: true when the plan is done.',
    '- allWorkCommitted: true when you have committed your work.',
  ]
  return answer ?? first.join('\n')
}

function reviewPrompt(
  state: ReviewState,
  reviewer: string,
  previousStatus: string | null,
  diff: string,
): string {
  return [
    `Review pull request ${String(state.pullRequestNumber)} as the ${reviewer}.`,
    previousStatus === 'OPEN_FEEDBACK'
      ? 'You raised findings before. Say whether they are fixed.'
      : 'This is your first review of this change.',
    '',
    'Diff:',
    diff,
    '',
    'Your response:',
    '- status: APPROVED when you have no findings, OPEN_FEEDBACK when you do.',
    '- findings: one per problem, each with file, line, rule and summary.',
    '  rule is the rule you applied, or null. summary says what is wrong and what good looks like.',
  ].join('\n')
}

function feedbackPrompt(state: ReviewState): string {
  return [
    'Here is the feedback on the pull request.',
    '',
    'Respond to each item using the criteria in your instructions.',
    '',
    'Return one response for every item passed in. The workflow will not accept the',
    'step until the number of responses matches the number of items.',
    '',
    'Feedback:',
    state.findings
      .map(
        (finding) =>
          `- comment ${String(finding.commentId)} ${finding.file}:${String(finding.line)} [${finding.reviewer}] ${finding.rule ?? 'no rule'} ${finding.summary}`,
      )
      .join('\n'),
    '',
    'Repository guidance:',
    state.guidance,
    '',
    'Your response:',
    '- resolutions: one per item below.',
    '- each resolution has commentId, outcome (addressed, partly-addressed or not-addressed),',
    '  and response: the text to post on that comment. Say why the feedback is valid, what',
    '  you changed, and how you verified it, or the technical reason for a rejection.',
  ].join('\n')
}

function questionFrom(payload: unknown): string {
  if (isRecord(payload) && typeof payload['question'] === 'string') return payload['question']
  return 'The implementer is waiting for an answer.'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function noStructuredOutput(
  who: string,
  response: { readonly finishReason: string; readonly text: string },
): string {
  return `${who} did not return the expected data. finishReason=${response.finishReason} text=${response.text.slice(0, 300)}`
}

function reviewIsComplete(state: ReviewState): boolean {
  return state.approved || state.limitReached
}

function coderabbitFindings(feedback: {
  readonly comments: readonly {
    readonly commentId: number
    readonly path: string
    readonly line: number
    readonly body: string
  }[]
}): readonly ReviewFinding[] {
  return feedback.comments.map((comment) => ({
    reviewer: CODERABBIT,
    file: comment.path,
    line: comment.line,
    rule: null,
    summary: comment.body.slice(0, 500),
    commentId: comment.commentId,
  }))
}

function pullRequestTitle(draft: PullRequestDraftAnswer): string {
  const subject = draft.subject.charAt(0).toLowerCase() + draft.subject.slice(1)
  return `${draft.commitType}(${draft.commitScope}): ${subject}`
}

function pullRequestBody(state: RunState, draft: PullRequestDraftAnswer): string {
  return [
    formatSection('Description', draft.description),
    formatSection('Linked Issue', `Closes #${String(state.issueNumber)}`),
    formatSection('What Problem Does This PR Solve?', draft.problem),
    formatSection('Acceptance Criteria', draft.acceptanceCriteria),
    formatSection('Key Changes', draft.keyChanges),
    formatSection('Notable Architectural Changes / Impact', draft.architectureImpact),
    formatSection('Validation', draft.validation),
    formatSection('Notes', draft.notes),
  ].join('\n\n')
}

function formatSection(heading: string, content: string): string {
  return [`## ${heading}`, content].join('\n\n')
}

function pullRequestPrompt(state: RunState): string {
  return [
    `Write the pull request for issue ${String(state.issueNumber)}: ${state.issueTitle}`,
    '',
    'The issue:',
    state.issueBody,
    '',
    'The files this branch changes:',
    state.changedFiles.map((file) => `- ${file}`).join('\n'),
    '',
    'The repository checks ran when the work was committed, and the commit exists.',
    `The commit on the branch is ${state.commitSha}.`,
    '',
    'Your response:',
    '- commitType: one of build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test.',
    '- commitScope: one lower case word naming the area, 1 to 20 characters.',
    '- subject: one line, under 50 characters.',
    '- description: one short paragraph.',
    '- problem: why the change is needed, in the words of the issue.',
    '- acceptanceCriteria: the criteria from the issue, as a list.',
    '- keyChanges: the files and what changed in them.',
    '- architectureImpact: what a reviewer should know, or "None".',
    '- validation: what was run and what it reported.',
    '- notes: anything else the reviewer needs, or "None".',
  ].join('\n')
}

function renderReply(resolution: { readonly response: string }): string {
  return `[dev-workflow-v3] ${resolution.response}`
}

function readyComment(state: ReviewState): string {
  return [
    '[dev-workflow-v3] The software factory has finished with this pull request.',
    '',
    `Review cycles run: ${String(state.cycleNumber)}`,
    state.approved ? 'The reviewers approved the change.' : 'The review cycle limit was reached.',
    '',
    'A person reviews and merges from here.',
  ].join('\n')
}

/** @riviere-role domain-error */
class RunFailed extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RunFailed'
  }
}

/** @riviere-role domain-error */
class ReviewCycleFailed extends Error {
  constructor(cycleNumber: number, status: string) {
    super(`The review cycle ${String(cycleNumber)} ended with ${status}.`)
    this.name = 'ReviewCycleFailed'
  }
}
