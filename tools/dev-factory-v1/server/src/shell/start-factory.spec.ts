import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { startFactory } from './start-factory'

type Started = Awaited<ReturnType<typeof startFactory>>

const started: Started[] = []

afterEach(async () => {
  started.splice(0).forEach((factory) => factory.changes.close())
  await Promise.all(started.splice(0).map((factory) => factory.close()))
})

function repoWithOneEpicAndOneIdea(): string {
  const folder = mkdtempSync(join(tmpdir(), 'factory-server-'))
  const epic = join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking')
  mkdirSync(join(epic, 'threads'), { recursive: true })
  writeFileSync(
    join(epic, 'epic.yml'),
    [
      'title: Cross-repo linking',
      'idea: cross-repo-linking',
      'stage: planning',
      'step: architecture',
      'features: []',
      'history: []',
    ].join('\n'),
  )
  writeFileSync(
    join(epic, 'ARCH.md'),
    [
      '# The architecture',
      '',
      '## One file?',
      '',
      ':::decision d-2',
      'proposal: One file.',
      'alternative: Two files.',
      'pick: proposal, because it is simpler.',
      ':::',
    ].join('\n'),
  )
  writeFileSync(
    join(epic, 'threads', 'c-1.yml'),
    [
      'id: c-1',
      'type: comment',
      'document: ARCH.md',
      'anchor:',
      '  selectedText: One file',
      '  prefix: ""',
      '  suffix: ""',
      '  firstLine: 3',
      '  occurrence: 0',
      'waitsFor: nick',
      'outcome: null',
      'messages:',
      '  - author: agent',
      '    time: 2026-11-26T10:04:40Z',
      '    text: Yes. One file per workspace.',
    ].join('\n'),
  )
  const idea = join(folder, 'project-memory', 'ideas', 'preset-workflows')
  mkdirSync(idea, { recursive: true })
  writeFileSync(
    join(idea, 'idea.md'),
    '---\ntitle: Preset workflows\nstatus: captured\nneed: uncertain\nepic: null\n---\n',
  )
  return folder
}

async function startedFactory(): Promise<{ factory: Started; targetRepo: string }> {
  const targetRepo = repoWithOneEpicAndOneIdea()
  const factory = await startFactory({
    port: 0,
    targetRepo,
    log: () => undefined,
    runCommand: () =>
      Promise.resolve({ exitCode: 0, stdout: '[{"number":901,"state":"OPEN"}]', stderr: '' }),
  })
  started.push(factory)
  return { factory, targetRepo }
}

async function jsonOf(factory: Started, path: string): Promise<unknown> {
  const response = await fetch(`http://127.0.0.1:${factory.port}${path}`)
  expect(response.status).toBe(200)
  const body: unknown = await response.json()
  return body
}

describe('startFactory', () => {
  it('says which port it listens on', async () => {
    const { factory } = await startedFactory()

    expect(await jsonOf(factory, '/api/server')).toMatchObject({ port: factory.port })
  })

  it('returns the overview board', async () => {
    const { factory } = await startedFactory()

    const board = await jsonOf(factory, '/api/overview-board')

    expect(board).toMatchObject({
      ideas: [{ slug: 'preset-workflows' }],
      planning: [{ slug: 'cross-repo-linking' }],
    })
  })

  it('returns the planning board', async () => {
    const { factory } = await startedFactory()

    const board = await jsonOf(factory, '/api/planning-board')

    expect(board).toMatchObject({
      columns: expect.arrayContaining([
        {
          step: 'architecture',
          epics: [{ slug: 'cross-repo-linking', title: 'Cross-repo linking' }],
        },
      ]),
    })
  })

  it('returns what waits for Nick', async () => {
    const { factory } = await startedFactory()

    const waiting = await jsonOf(factory, '/api/waiting-for-you')

    expect(waiting).toStrictEqual({
      items: [
        {
          epic: 'cross-repo-linking',
          item: 'c-1',
          kind: 'comment',
          document: 'ARCH.md',
          question: null,
          last: 'Yes. One file per workspace.',
        },
      ],
    })
  })

  it('returns one epic with the state of its stories', async () => {
    const { factory } = await startedFactory()

    const epic = await jsonOf(factory, '/api/epics/cross-repo-linking')

    expect(epic).toMatchObject({ slug: 'cross-repo-linking', step: 'architecture' })
  })

  it('returns a planning document with its question and its comments', async () => {
    const { factory } = await startedFactory()

    const document = await jsonOf(factory, '/api/epics/cross-repo-linking/documents/ARCH.md')

    expect(document).toMatchObject({ decisions: [{ id: 'd-2' }], threads: [{ id: 'c-1' }] })
  })

  it('opens the change stream', async () => {
    const { factory } = await startedFactory()

    const response = await fetch(`http://127.0.0.1:${factory.port}/api/changes`)

    expect(response.headers.get('content-type')).toContain('text/event-stream')
    await response.body?.cancel()
  })

  it('says 404 for a route it does not have', async () => {
    const { factory } = await startedFactory()

    const response = await fetch(`http://127.0.0.1:${factory.port}/api/nothing`)

    expect(response.status).toBe(404)
  })
})
