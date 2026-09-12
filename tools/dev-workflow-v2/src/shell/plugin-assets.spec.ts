import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@nt-ai-lab/deterministic-agent-workflow-pi', () => ({
  createPiWorkflowExtension: () => () => undefined,
}))

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

const readPluginFile = (path: string): string => readFileSync(join(pluginRoot, path), 'utf8')

describe('plugin Agent Skills', () => {
  it('delegates workflow feedback handling to the reusable procedure before returning to reviewing', () => {
    const addressingFeedback = readPluginFile('states/addressing_feedback.md')

    expect(addressingFeedback).toContain('commands/address-pull-request-feedback.md')
    expect(addressingFeedback).toContain('transition to `REVIEWING`')
  })

  it('registers Pi commands and loads their instruction assets', async () => {
    const packageManifest: { pi?: { extensions?: string[] }; skills?: unknown } = JSON.parse(
      readPluginFile('package.json'),
    )
    const piProjectSettings = readPluginFile('../../.pi/settings.json')
    const commandNames = [
      'address-pull-request-feedback',
      'choose-next-task',
      'continue-planning',
      'list-review-threads',
      'optimize-factory',
      'planning-status',
      'review-pull-request',
      'start-implementation',
      'start-planning',
    ]
    const registeredCommands = new Map<string, Parameters<ExtensionAPI['registerCommand']>[1]>()
    const sentMessages = vi.fn()
    function registerCommand(
      name: string,
      command: Parameters<ExtensionAPI['registerCommand']>[1],
    ): void {
      registeredCommands.set(name, command)
    }
    function sendUserMessage(...argumentsList: Parameters<ExtensionAPI['sendUserMessage']>): void {
      sentMessages(...argumentsList)
    }
    const pi = Object.create({
      registerCommand,
      sendUserMessage,
    })
    const extension = (await import('./pi-plugin')).default

    extension(pi)

    expect({
      extension: packageManifest.pi?.extensions,
      projectPackage: piProjectSettings.includes('"../tools/dev-workflow-v2"'),
      codexSkillsExcluded: packageManifest.skills === undefined,
      commands: [...registeredCommands.keys()],
    }).toStrictEqual({
      extension: expect.arrayContaining(['./src/shell/pi-plugin.ts']),
      projectPackage: true,
      codexSkillsExcluded: true,
      commands: commandNames.map((commandName) => `dev-workflow-v2:${commandName}`),
    })

    for (const commandName of commandNames) {
      const command = registeredCommands.get(`dev-workflow-v2:${commandName}`)
      await command?.handler('example arguments', Object.create({ isIdle: () => true }))
    }

    expect(sentMessages).toHaveBeenCalledTimes(commandNames.length)
    for (const [index, commandName] of commandNames.entries()) {
      expect(sentMessages).toHaveBeenNthCalledWith(
        index + 1,
        expect.stringContaining(`# ${commandName}`),
        undefined,
      )
    }
  })

  it('renders Pi branch preparation without Claude or Codex startup assumptions', async () => {
    const registeredCommands = new Map<string, Parameters<ExtensionAPI['registerCommand']>[1]>()
    const sentMessages = vi.fn()
    function registerCommand(
      name: string,
      command: Parameters<ExtensionAPI['registerCommand']>[1],
    ): void {
      registeredCommands.set(name, command)
    }
    function sendUserMessage(...argumentsList: Parameters<ExtensionAPI['sendUserMessage']>): void {
      sentMessages(...argumentsList)
    }
    const pi = Object.create({ registerCommand, sendUserMessage })
    const extension = (await import('./pi-plugin')).default
    extension(pi)

    await registeredCommands
      .get('dev-workflow-v2:start-implementation')
      ?.handler('42', Object.create({ isIdle: () => true }))

    const instruction = sentMessages.mock.calls[0]?.[0]
    expect({
      callCount: sentMessages.mock.calls.length,
      instruction,
      containsBranchRename: String(instruction).includes('git branch -m'),
      containsClaudeStartup: String(instruction).includes('claude -w'),
      containsCodexSession: String(instruction).includes('CODEX_THREAD_ID'),
    }).toStrictEqual({
      callCount: 1,
      instruction: expect.stringMatching(
        /prepare-implementation-branch[\s\S]*the `workflow` tool init/,
      ),
      containsBranchRename: false,
      containsClaudeStartup: false,
      containsCodexSession: false,
    })
  })

  it('provides an Agent Skill for every plugin command', () => {
    const commandNames = readdirSync(join(pluginRoot, 'commands'))
      .filter((filename) => filename.endsWith('.md'))
      .map((filename) => filename.replace(/\.md$/, ''))
    const skillNames = readdirSync(join(pluginRoot, 'skills')).map((directory) =>
      directory.replace(/^dev-workflow-/, ''),
    )

    expect(commandNames.filter((commandName) => !skillNames.includes(commandName))).toStrictEqual(
      [],
    )
  })

  it.each(['workflow', 'list-review-threads'])('contains a complete %s skill', (skillName) => {
    const skill = readPluginFile(`skills/${skillName}/SKILL.md`)

    expect(skill).toContain(`name: ${skillName}`)
    expect(skill).not.toContain('TODO')
  })

  it.each(['list-review-threads'])(
    'does not translate Codex skill syntax in the %s command adapter',
    (commandName) => {
      const command = readPluginFile(`commands/${commandName}.md`)

      expect(command.trim().split('\n')).toStrictEqual([
        `# ${commandName}`,
        '',
        'Read `${CLAUDE_PLUGIN_ROOT}/skills/' +
          `${commandName}/SKILL.md\` completely and follow it.`,
      ])
      expect(command).not.toContain('$dev-workflow-v2:workflow')
    },
  )

  it.each(['list-review-threads'])(
    'selects workflow execution for Codex or slash-command harnesses in %s',
    (skillName) => {
      const skill = readPluginFile(`skills/${skillName}/SKILL.md`)

      expect({
        detectsCodex: skill.includes('If `CODEX_THREAD_ID` is present'),
        detectsPi: skill.includes('if `PI_CODING_AGENT=true` is present'),
        usesPiWorkflowTool: skill.includes('with the `workflow` tool'),
        usesCodexRunner: skill.includes(
          'pnpm --dir tools/dev-workflow-v2 run codex-workflow <operation> [args]',
        ),
        usesSlashCommand: skill.includes('/dev-workflow-v2:workflow <operation> [args]'),
      }).toStrictEqual({
        detectsCodex: true,
        detectsPi: true,
        usesPiWorkflowTool: true,
        usesCodexRunner: true,
        usesSlashCommand: true,
      })
    },
  )
})

describe('reusable pull request orchestration', () => {
  it('configures pi-subagents to discover the four repository reviewers', () => {
    const piProjectSettings = readPluginFile('../../.pi/settings.json')

    expect(JSON.parse(piProjectSettings)).toMatchObject({
      packages: expect.arrayContaining(['npm:pi-subagents']),
      subagents: {
        agentScanDirs: ['tools/dev-workflow-v2/agents'],
        defaultSubagentContext: 'fresh',
      },
    })
  })

  it('uses one canonical procedure from both standalone and workflow review entry points', () => {
    const reviewing = readPluginFile('states/reviewing.md')
    const pullRequestReview = readPluginFile('commands/review-pull-request.md')

    expect({
      workflowDelegates: reviewing.includes('commands/review-pull-request.md'),
      usesGraphql: pullRequestReview.includes('gh api graphql'),
      readsChangedFiles: pullRequestReview.includes('files(first: 100)'),
      readsClosingIssues: pullRequestReview.includes('closingIssuesReferences(first: 100)'),
      launchesInParallel: pullRequestReview.includes('`runs.all`'),
      publishesDiagnosticRecord: pullRequestReview.includes('[workflow-orchestrator]'),
      doesNotUseWorkflowCommand: !pullRequestReview.includes('$dev-workflow-v2:workflow'),
    }).toStrictEqual({
      workflowDelegates: true,
      usesGraphql: true,
      readsChangedFiles: true,
      readsClosingIssues: true,
      launchesInParallel: true,
      publishesDiagnosticRecord: true,
      doesNotUseWorkflowCommand: true,
    })
  })

  it('does not launch task-check without linked issues and records why', () => {
    const pullRequestReview = readPluginFile('commands/review-pull-request.md')

    expect({
      skipsTaskCheck: pullRequestReview.includes('do not launch `task-check`'),
      namesReason: pullRequestReview.includes('task-check: no linked issue'),
      waitsForLaunches: pullRequestReview.includes(
        'after every applicable reviewer has been launched successfully',
      ),
    }).toStrictEqual({
      skipsTaskCheck: true,
      namesReason: true,
      waitsForLaunches: true,
    })
  })

  it('plans feedback before making changes and preserves human direction', () => {
    const feedbackProcedure = readPluginFile('commands/address-pull-request-feedback.md')

    expect({
      workflowIndependent: !feedbackProcedure.includes('$dev-workflow-v2:workflow'),
      checksHeadBranch: feedbackProcedure.includes('pull request head branch'),
      waitsForApproval: feedbackProcedure.includes('Wait for explicit approval'),
      hasClearFixes: feedbackProcedure.includes('**Clear fixes**'),
      hasDiscussion: feedbackProcedure.includes('**Discussion needed**'),
      hasHumanDirection: feedbackProcedure.includes('**Human direction**'),
      recoversPersistedDecisions: feedbackProcedure.includes(
        'Recover persisted `[main-agent]` decisions from the thread history',
      ),
      resumesRecordedFixes: feedbackProcedure.includes(
        'then start at step 2. Do not post a duplicate planning reply',
      ),
      recordsPlanBeforeChanges:
        feedbackProcedure.includes('respond to each approved GitHub review') &&
        feedbackProcedure.includes(
          'thread with the agreed follow up action before changing any code',
        ),
      explainsWhyBeforeWhatAndHow: feedbackProcedure.includes(
        'must start by explaining why the feedback is valid, then state what outcome',
      ),
      publishesRepliesImmediately: feedbackProcedure.includes(
        'This endpoint publishes the reply immediately',
      ),
      usesSubmittedRestReplies:
        feedbackProcedure.includes(
          'pulls/<PR_NUMBER>/comments/<ROOT_COMMENT_DATABASE_ID>/replies',
        ) && !feedbackProcedure.includes('addPullRequestReviewThreadReply(input'),
      readsRootCommentDatabaseId: feedbackProcedure.includes(
        'REST database ID of its root comment',
      ),
      recordsCompletion: feedbackProcedure.includes(
        '[main-agent] Done as planned: <what changed and how it was verified>',
      ),
      resolvesAfterCompletion:
        feedbackProcedure.indexOf('Done as planned:') <
        feedbackProcedure.indexOf('Resolve the thread only after'),
      rejectsAndResolvesImmediately:
        feedbackProcedure.includes('When a technically justified rejection') &&
        feedbackProcedure.includes('Immediately after the reply succeeds, resolve'),
      doesNotResolveHumanDecisions: feedbackProcedure.includes('do not resolve it'),
    }).toStrictEqual({
      workflowIndependent: true,
      checksHeadBranch: true,
      waitsForApproval: true,
      hasClearFixes: true,
      hasDiscussion: true,
      hasHumanDirection: true,
      recoversPersistedDecisions: true,
      resumesRecordedFixes: true,
      recordsPlanBeforeChanges: true,
      explainsWhyBeforeWhatAndHow: true,
      publishesRepliesImmediately: true,
      usesSubmittedRestReplies: true,
      readsRootCommentDatabaseId: true,
      recordsCompletion: true,
      resolvesAfterCompletion: true,
      rejectsAndResolvesImmediately: true,
      doesNotResolveHumanDecisions: true,
    })
  })

  it.each(['architecture-review', 'code-review', 'bug-scanner', 'task-check'])(
    'keeps %s as a direct GitHub publisher that does not use workflow state',
    (reviewerName) => {
      const reviewer = readPluginFile(`agents/${reviewerName}.md`)

      expect({
        hasGitHubPublishing: reviewer.includes('## GitHub Review Output'),
        hasBash: reviewer.includes('tools: read, grep, find, ls, bash'),
        doesNotQueryWorkflow: reviewer.includes('Do not query or change workflow state.'),
        returnsCompletionReceipt: reviewer.includes(
          'Return a short completion receipt to the workflow caller only after GitHub publication.',
        ),
      }).toStrictEqual({
        hasGitHubPublishing: true,
        hasBash: true,
        doesNotQueryWorkflow: true,
        returnsCompletionReceipt: true,
      })
    },
  )
})

describe('task creation planning guidance', () => {
  it('requires concrete user problems and solution references', () => {
    const taskCreation = readPluginFile('planning-stages/task-creation.md')
    const badExample =
      'Product-level tests alone do not prove that a real multi-domain customer can use the product. This slice matters because D0.3 is an explicit dependency in the approved delivery sequence and an incomplete boundary would push design decisions into later implementation tickets.'
    const goodExample =
      'Users trying to create one accurate architecture graph from multiple codebases, EventCatalog, AsyncAPI, and AI-assisted findings must determine for themselves how to combine those inputs, in what order, and whether each step produced the correct result. This makes Rivière difficult to learn, adapt, and trust. Users who cannot confidently apply it to their own systems are less likely to adopt it.'
    const badLabelPosition = taskCreation.indexOf('Bad:')
    const badExamplePosition = taskCreation.indexOf(badExample)
    const goodLabelPosition = taskCreation.indexOf('Good:')
    const goodExamplePosition = taskCreation.indexOf(goodExample)

    expect({
      connectsWiderProblem: taskCreation.includes(
        'how this specific problem fits into the wider problem described',
      ),
      rejectsDeliveryRationale: taskCreation.includes(
        '`## Problem` justifies the ticket through dependencies, delivery sequencing, or effects on later tickets',
      ),
      rejectsMissingSolution: taskCreation.includes(
        '`## Problem` defines the problem as the absence of the proposed solution',
      ),
      requiresConcreteLanguage: taskCreation.includes(
        '`## Problem` uses vague umbrella terms or project jargon where concrete source-backed language is available',
      ),
      requiresSourceBackedConsequence: taskCreation.includes(
        'does not state a source-backed user or product consequence',
      ),
      requiresConcreteUserProblem: taskCreation.includes(
        'does not explain the concrete user task, difficulty, or failure mode',
      ),
      rejectsSolutionAsAdoptionProblem: taskCreation.includes(
        'For a learning or adoption ticket, do not say that users lack a demo, example, guide, configuration, or documentation.',
      ),
      requiresWiderProblemContext: taskCreation.includes(
        "does not explain how the ticket's problem fits into the wider approved problem context",
      ),
      showsJargonReplacement: taskCreation.includes('replace "architecture facts"'),
      requiresConcreteSolutionReferences: taskCreation.includes(
        'Never use an undefined reference such as “the Workflow”, “the demo”, “the customer journey”, “the result”, “all capabilities”, “everything”, or “works together”.',
      ),
      showsCompleteOrderedExamples:
        badLabelPosition > -1 &&
        badLabelPosition < badExamplePosition &&
        badExamplePosition < goodLabelPosition &&
        goodLabelPosition < goodExamplePosition,
    }).toStrictEqual({
      connectsWiderProblem: true,
      rejectsDeliveryRationale: true,
      rejectsMissingSolution: true,
      requiresConcreteLanguage: true,
      requiresSourceBackedConsequence: true,
      requiresConcreteUserProblem: true,
      rejectsSolutionAsAdoptionProblem: true,
      requiresWiderProblemContext: true,
      showsJargonReplacement: true,
      requiresConcreteSolutionReferences: true,
      showsCompleteOrderedExamples: true,
    })
  })

  it('requires concrete references in dogfooding purposes', () => {
    const dogfooding = readPluginFile('planning-stages/dogfooding.md')

    expect(dogfooding).toContain(
      'Never use an undefined reference such as “the Workflow”, “the demo”, “the customer journey”, “the result”, “all capabilities”, or “everything”.',
    )
    expect(dogfooding).toContain(
      'For a Workflow deliverable, an agent must write `riviere-workflow.yaml` with its named stages, not “the Workflow”.',
    )
  })
})
