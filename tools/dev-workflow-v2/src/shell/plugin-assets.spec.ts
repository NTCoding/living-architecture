import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

const readPluginFile = (path: string): string => readFileSync(join(pluginRoot, path), 'utf8')

describe('plugin Agent Skills', () => {
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

  it('validates and quotes the recorded branch before pushing', () => {
    const skill = readPluginFile('skills/create-pr/SKILL.md')
    const validationPosition = skill.indexOf('git check-ref-format --branch "$featureBranch"')
    const pushPosition = skill.indexOf('git push -u origin "$featureBranch"')

    expect({
      validatesBeforePush: validationPosition > -1 && validationPosition < pushPosition,
      rejectsUnquotedInterpolation: skill.includes('never interpolate it into unquoted shell text'),
    }).toStrictEqual({
      validatesBeforePush: true,
      rejectsUnquotedInterpolation: true,
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
      'An agent must write `riviere-workflow.yaml` with its named stages, not “the Workflow”.',
    )
  })
})
