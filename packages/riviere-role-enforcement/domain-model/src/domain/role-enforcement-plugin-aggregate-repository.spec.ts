import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { enforce } from './__fixtures__/role-enforcement-plugin-fixture'

function enforceAggregateRepository(methods: string) {
  const workspaceDirectory = mkdtempSync(join(tmpdir(), 'aggregate-repository-plugin-'))
  const entrypointDirectory = join(workspaceDirectory, 'packages/example/src/entrypoint')
  mkdirSync(entrypointDirectory, { recursive: true })
  writeFileSync(
    join(entrypointDirectory, 'project.ts'),
    '/** @riviere-role aggregate */\nexport class Project {}\n',
  )
  try {
    return enforce(
      `import { Project } from './project'

/** @riviere-role aggregate-repository */
export class ProjectRepository {
${methods}
}
`,
      {
        configDir: workspaceDirectory,
        filename: join(entrypointDirectory, 'project-repository.ts'),
      },
    )
  } finally {
    rmSync(workspaceDirectory, { force: true, recursive: true })
  }
}

it('accepts aggregate repository load methods with access criteria', () => {
  const messages = enforceAggregateRepository(`
  load(): Project { return new Project() }
  loadById(): Project { return new Project() }
  loadByGraphPath(): Project { return new Project() }
  loadByExtractionConfigPath(): Project { return new Project() }
  loadByDraftComponentsPath(): Project { return new Project() }
  loadByWorkflowName(): Project { return new Project() }
`)

  expect(messages).toStrictEqual([])
})

it('rejects an aggregate repository method named loadBy without an access criterion', () => {
  const messages = enforceAggregateRepository(`
  loadBy(): Project { return new Project() }
`)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain("aggregate-returning method 'loadBy'")
})

it.each(['loadWorkflow', 'loadForEnrichment', 'loadFromPersistedState'])(
  'rejects aggregate repository method %s',
  (methodName) => {
    const messages = enforceAggregateRepository(`
  ${methodName}(): Project { return new Project() }
`)

    expect(messages).toHaveLength(1)
    expect(messages[0]?.message).toContain(`aggregate-returning method '${methodName}'`)
  },
)

it('does not constrain private aggregate assembly methods', () => {
  const messages = enforceAggregateRepository(`
  loadByGraphPath(): Project { return this.loadForEnrichment() }
  private loadForEnrichment(): Project { return new Project() }
`)

  expect(messages).toStrictEqual([])
})

it('does not constrain persistence methods without aggregate outputs', () => {
  const messages = enforce(`/** @riviere-role aggregate-repository */
export class ProjectRepository {
  save(): void {}
}
`)

  expect(messages).toStrictEqual([])
})
