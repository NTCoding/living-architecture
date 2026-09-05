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
  it('tells agents to push fixes directly, wait for CodeRabbit, and reflect after clean verification', () => {
    const addressingFeedback = readPluginFile('states/addressing_feedback.md')

    expect(addressingFeedback).toContain('Push the recorded feature branch: `git push`')
    expect(addressingFeedback).toContain('Wait for CodeRabbit to process the pushed commit')
    expect(addressingFeedback).toContain('transitions directly to `REFLECTING`')
  })

  it('registers Pi commands and loads their instruction assets', async () => {
    const packageManifest = readPluginFile('package.json')
    const piProjectSettings = readPluginFile('../../.pi/settings.json')
    const commandNames = [
      'choose-next-task',
      'code-review',
      'continue-planning',
      'create-pr',
      'list-review-threads',
      'optimize-factory',
      'planning-status',
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
    const pi = Object.create({ registerCommand, sendUserMessage })
    const extension = (await import('./pi-plugin')).default

    extension(pi)

    expect({
      extension: packageManifest.includes('"extensions": ["./src/shell/pi-plugin.ts"]'),
      projectPackage: piProjectSettings.includes('"../tools/dev-workflow-v2"'),
      skills: packageManifest.includes('"skills": ["./skills"]'),
      commands: [...registeredCommands.keys()],
    }).toStrictEqual({
      extension: true,
      projectPackage: true,
      skills: true,
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

    await registeredCommands
      .get('dev-workflow-v2:code-review')
      ?.handler('example arguments', Object.create({ isIdle: () => false }))

    expect(sentMessages).toHaveBeenLastCalledWith(expect.any(String), { deliverAs: 'followUp' })
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

  it.each(['workflow', 'code-review', 'create-pr', 'list-review-threads'])(
    'contains a complete %s skill',
    (skillName) => {
      const skill = readPluginFile(`skills/${skillName}/SKILL.md`)

      expect(skill).toContain(`name: ${skillName}`)
      expect(skill).not.toContain('TODO')
    },
  )

  it('uses standardised domain message flows before detailed component design', () => {
    const skill = readPluginFile('skills/domain-message-flow/SKILL.md')
    const architectureDrafting = readPluginFile('planning-stages/architecture-drafting.md')
    const boundaryStepPosition = architectureDrafting.indexOf(
      '## Step 1: Shape interactions and decide top-level architecture boundaries',
    )
    const componentStepPosition = architectureDrafting.indexOf(
      '## Step 2: Present detailed component design options',
    )

    expect({
      hasSkillName: skill.includes('name: domain-message-flow'),
      hasApprovedOptionOrder:
        skill.indexOf('# Option 1:') < skill.indexOf('## Message details') &&
        skill.indexOf('## Message details') < skill.indexOf('## Pros') &&
        skill.indexOf('## Pros') < skill.indexOf('## Cons'),
      keepsMessageDataOutOfDiagram: skill.includes(
        'Do not put message data, return values, annotations, paths, role names, or explanatory prose inside message boxes or on connecting lines.',
      ),
      requiresDetailsTable: skill.includes(
        '| # | Type | Message | Sender → recipient | Significant data |',
      ),
      invokesSkillDuringBoundaries: architectureDrafting.includes(
        'Read and apply `skills/domain-message-flow/SKILL.md` completely',
      ),
      separatesBoundaryAndComponentDesign:
        boundaryStepPosition > -1 &&
        componentStepPosition > boundaryStepPosition &&
        architectureDrafting.includes(
          'proceed to detailed component design only on a later planning turn',
        ),
    }).toStrictEqual({
      hasSkillName: true,
      hasApprovedOptionOrder: true,
      keepsMessageDataOutOfDiagram: true,
      requiresDetailsTable: true,
      invokesSkillDuringBoundaries: true,
      separatesBoundaryAndComponentDesign: true,
    })
  })

  it('selects the code-review execution mechanism for all supported harnesses', () => {
    const skill = readPluginFile('skills/code-review/SKILL.md')
    const command = readPluginFile('commands/code-review.md')

    expect({
      detectsCodex: skill.includes('If `CODEX_THREAD_ID` is present'),
      usesCodexSubagents: skill.includes('Codex `spawn_agent`'),
      detectsOpenCode: skill.includes('if `OPENCODE=1` is present'),
      usesOpenCodeSubagents: skill.includes('OpenCode `Task`'),
      usesClaudeSubagents: skill.includes('Claude Code `Agent`'),
      commandDoesNotOverrideHarness: !command.includes("Use Claude's Agent tool"),
    }).toStrictEqual({
      detectsCodex: true,
      usesCodexSubagents: true,
      detectsOpenCode: true,
      usesOpenCodeSubagents: true,
      usesClaudeSubagents: true,
      commandDoesNotOverrideHarness: true,
    })
  })

  it('validates reviewer result types before recording them', () => {
    const skill = readPluginFile('skills/code-review/SKILL.md')
    const validationPosition = skill.indexOf('`verdict` equal to `PASS` or `FAIL`')
    const recordingPosition = skill.indexOf('`record-review` workflow operation')

    expect({
      validatesSummary: skill.includes('`summary` as a string'),
      validatesFindings: skill.includes('`findings` as an array'),
      blocksInvalidResults: skill.includes('stop before recording any invalid result'),
      validatesBeforeRecording: validationPosition > -1 && validationPosition < recordingPosition,
    }).toStrictEqual({
      validatesSummary: true,
      validatesFindings: true,
      blocksInvalidResults: true,
      validatesBeforeRecording: true,
    })
  })

  it('prohibits direct pushes while creating a pull request', () => {
    const skill = readPluginFile('skills/create-pr/SKILL.md')

    expect({
      prohibitsDirectPush: skill.includes('Do not call `git push`'),
      containsDirectPushCommand: skill.includes('git push -u origin'),
    }).toStrictEqual({
      prohibitsDirectPush: true,
      containsDirectPushCommand: false,
    })
  })

  it.each(['code-review', 'create-pr', 'list-review-threads'])(
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

  it.each(['create-pr', 'list-review-threads'])(
    'selects workflow execution for Codex or slash-command harnesses in %s',
    (skillName) => {
      const skill = readPluginFile(`skills/${skillName}/SKILL.md`)

      expect({
        detectsCodex: skill.includes('If `CODEX_THREAD_ID` is present'),
        usesCodexRunner: skill.includes(
          'pnpm --dir tools/dev-workflow-v2 run codex-workflow <operation> [args]',
        ),
        usesSlashCommand: skill.includes('/dev-workflow-v2:workflow <operation> [args]'),
      }).toStrictEqual({
        detectsCodex: true,
        usesCodexRunner: true,
        usesSlashCommand: true,
      })
    },
  )
})

describe('reviewer workflow preflight', () => {
  it.each(['architecture-review', 'code-review', 'bug-scanner', 'task-check'])(
    'checks REVIEWING state before %s reads project files',
    (reviewerName) => {
      const reviewer = readPluginFile(`agents/${reviewerName}.md`)
      const codexPreflightPosition = reviewer.indexOf('$dev-workflow-v2:workflow get-state')
      const slashPreflightPosition = reviewer.indexOf('/dev-workflow-v2:workflow get-state')
      const projectReadPosition = reviewer.indexOf('You will return structured JSON')

      expect({
        hasCodexInvocation: codexPreflightPosition > -1,
        hasSlashInvocation: slashPreflightPosition > -1,
        hasStateField: reviewer.includes('currentStateMachineState'),
        hasReviewingGuard: reviewer.includes('is not `REVIEWING`'),
        hasRefusal: reviewer.includes('{"refused":true,"reason":"Workflow is not in REVIEWING."}'),
        preflightBeforeReview:
          codexPreflightPosition < projectReadPosition &&
          slashPreflightPosition < projectReadPosition,
      }).toStrictEqual({
        hasCodexInvocation: true,
        hasSlashInvocation: true,
        hasStateField: true,
        hasReviewingGuard: true,
        hasRefusal: true,
        preflightBeforeReview: true,
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
