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
