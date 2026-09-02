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

it.each(['loadByEnrichment', 'loadWorkflow', 'loadForEnrichment', 'loadFromPersistedState'])(
  'rejects aggregate repository method %s',
  (methodName) => {
    const messages = enforceAggregateRepository(`
  ${methodName}(): Project { return new Project() }
    `)

    expect(messages).toHaveLength(1)
    expect(messages[0]?.message).toContain(
      methodName === 'loadByEnrichment'
        ? `forbids aggregate-returning method '${methodName}'`
        : `aggregate-returning method '${methodName}'`,
    )
  },
)

it('does not constrain private aggregate assembly methods', () => {
  const messages = enforceAggregateRepository(`
  loadByGraphPath(): Project { return this.loadForEnrichment() }
  private loadForEnrichment(): Project { return new Project() }
`)

  expect(messages).toStrictEqual([])
})

it('does not constrain ECMAScript-private aggregate assembly methods', () => {
  const messages = enforceAggregateRepository(`
  loadByGraphPath(): Project { return this.#loadForEnrichment() }
  #loadForEnrichment(): Project { return new Project() }
`)

  expect(messages).toStrictEqual([])
})

it('accepts aggregate repository methods with literal access-criterion names', () => {
  const messages = enforceAggregateRepository(`
  ['loadByGraphPath'](): Project { return new Project() }
`)

  expect(messages).toStrictEqual([])
})

it('rejects callable aggregate-returning fields with operation-labelled names', () => {
  const messages = enforceAggregateRepository(`
  loadByEnrichment = (): Project => new Project()
  `)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain("forbids aggregate-returning method 'loadByEnrichment'")
})

it('rejects static aggregate-returning methods with operation-labelled names', () => {
  const messages = enforceAggregateRepository(`
  static loadByEnrichment(): Project { return new Project() }
`)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain("forbids aggregate-returning method 'loadByEnrichment'")
})

it('accepts callable fields with declared aggregate return types and access criteria', () => {
  const messages = enforceAggregateRepository(`
  loadByGraphPath: () => Project = () => new Project()
`)

  expect(messages).toStrictEqual([])
})

it('does not constrain non-aggregate callable members with operation-labelled names', () => {
  const messages = enforceAggregateRepository(`
  loadByEnrichment(): void {}
`)

  expect(messages).toStrictEqual([])
})

it('rejects aggregate-returning methods with template-literal operation labels', () => {
  const messages = enforceAggregateRepository(`
  [\`loadByEnrichment\`](): Project { return new Project() }
`)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain("forbids aggregate-returning method 'loadByEnrichment'")
})

it('rejects callable constructor parameter properties with operation-labelled names', () => {
  const messages = enforceAggregateRepository(`
  constructor(public loadByEnrichment: () => Project) {}
`)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain("forbids aggregate-returning method 'loadByEnrichment'")
})

it('rejects abstract aggregate-returning methods with operation-labelled names', () => {
  const messages = enforceAggregateRepository(`
  abstract loadByEnrichment(): Project
`)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain("forbids aggregate-returning method 'loadByEnrichment'")
})

it('does not constrain protected callable constructor parameter properties', () => {
  const messages = enforceAggregateRepository(`
  constructor(protected loadByEnrichment: () => Project) {}
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
