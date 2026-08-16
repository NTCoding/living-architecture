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
