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
  writeFileSync(
    join(epic, 'threads', 'd-2.yml'),
    [
      'id: d-2',
      'type: decision',
      'document: ARCH.md',
      'question: One file?',
      'answer: null',
      'followed: false',
      'outcome: null',
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

async function postJson(
  factory: Started,
  path: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(`http://127.0.0.1:${factory.port}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
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

    expect(waiting).toMatchObject({
      items: [
        {
          epic: 'cross-repo-linking',
          item: 'c-1',
          kind: 'comment',
          document: 'ARCH.md',
          last: 'Yes. One file per workspace.',
        },
        {
          epic: 'cross-repo-linking',
          item: 'd-2',
          kind: 'decision',
          document: 'ARCH.md',
          question: 'One file?',
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

  it('captures a new idea', async () => {
    const { factory } = await startedFactory()

    const response = await postJson(factory, '/api/ideas', {
      slug: 'cross-repo-linking',
      title: 'Cross-repo linking',
      summary: 'From the planning discussion.',
    })

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ idea: 'cross-repo-linking', status: 'captured' })
  })

  it('starts planning an idea', async () => {
    const { factory } = await startedFactory()

    const response = await postJson(factory, '/api/ideas/preset-workflows/start-planning', {})

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({
      epic: 'preset-workflows',
      step: 'problem-definition',
    })
  })

  it('opens a thread on a document', async () => {
    const { factory } = await startedFactory()

    const response = await postJson(factory, '/api/epics/cross-repo-linking/threads', {
      document: 'ARCH.md',
      selectedText: 'One file',
      prefix: '',
      suffix: '',
      firstLine: 3,
      occurrence: 0,
      text: 'Does that include the private ones?',
    })

    expect(response.status).toBe(201)
    expect(await response.json()).toStrictEqual({ thread: 'c-2', waitsFor: 'agent' })
  })

  it('replies to a thread', async () => {
    const { factory } = await startedFactory()

    const response = await postJson(factory, '/api/epics/cross-repo-linking/threads/c-1/replies', {
      text: 'And the private ones?',
    })

    expect(response.status).toBe(201)
    expect(await response.json()).toStrictEqual({ thread: 'c-1', waitsFor: 'agent' })
  })

  it('answers a decision', async () => {
    const { factory } = await startedFactory()

    const response = await postJson(factory, '/api/epics/cross-repo-linking/decisions/d-2', {
      choice: 'proposal',
      chosen: 'One file per workspace.',
      reply: null,
    })

    expect(response.status).toBe(201)
    expect(await response.json()).toStrictEqual({ decision: 'd-2', waitsFor: 'agent' })
  })

  it('says 500 when the body is missing a field', async () => {
    const { factory } = await startedFactory()

    const statuses = await Promise.all([
      postJson(factory, '/api/ideas', { slug: 'one' }),
      postJson(factory, '/api/epics/cross-repo-linking/threads', { document: 'PRD.md' }),
      postJson(factory, '/api/epics/cross-repo-linking/threads/c-1/replies', {}),
      postJson(factory, '/api/epics/cross-repo-linking/decisions/d-2', { choice: 'reply' }),
      postJson(factory, '/api/agent/epics/cross-repo-linking/threads/c-1/replies', {}),
      postJson(factory, '/api/agent/epics/cross-repo-linking/stories', { features: [1] }),
      postJson(factory, '/api/agent/epics/cross-repo-linking/stories', {
        features: [{ id: 'M1' }],
      }),
      postJson(factory, '/api/agent/epics/cross-repo-linking/stories', {
        features: [{ id: 'M1', title: 'Builder API' }],
      }),
    ])

    expect(statuses.map((response) => response.status)).toStrictEqual([
      500, 500, 500, 500, 500, 500, 500, 500,
    ])
  })

  it('records your own words when you write them', async () => {
    const { factory } = await startedFactory()

    const response = await postJson(factory, '/api/epics/cross-repo-linking/decisions/d-2', {
      choice: 'reply',
      chosen: 'Ask Jo about the private repositories first.',
      reply: 'Ask Jo about the private repositories first.',
    })

    expect(response.status).toBe(201)
  })

  it('says 500 when the passage of a comment has no line', async () => {
    const { factory } = await startedFactory()

    const response = await postJson(factory, '/api/epics/cross-repo-linking/threads', {
      document: 'ARCH.md',
      selectedText: 'One file',
      prefix: 0,
      suffix: '',
      text: 'Why one file?',
    })

    expect(response.status).toBe(500)
  })

  it('says 500 when the body is not a JSON object', async () => {
    const { factory } = await startedFactory()

    const response = await fetch(`http://127.0.0.1:${factory.port}/api/ideas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '[]',
    })

    expect(response.status).toBe(500)
  })

  it('says 500 when the body is larger than a megabyte', async () => {
    const { factory } = await startedFactory()

    const response = await fetch(`http://127.0.0.1:${factory.port}/api/ideas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ summary: 'x'.repeat(1_100_000) }),
    })

    expect(response.status).toBe(500)
  })

  it('adds the reply of the planning agent', async () => {
    const { factory } = await startedFactory()

    const response = await postJson(
      factory,
      '/api/agent/epics/cross-repo-linking/threads/c-1/replies',
      { text: 'It does. I added a line about them.' },
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toStrictEqual({ thread: 'c-1', waitsFor: 'nick' })
  })

  it('closes the item the planning agent has dealt with', async () => {
    const { factory } = await startedFactory()

    const response = await postJson(
      factory,
      '/api/agent/epics/cross-repo-linking/items/c-1/done',
      {},
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toStrictEqual({ item: 'c-1', closedBy: 'agent' })
  })

  it('records the stories of an epic that is creating them', async () => {
    const { factory, targetRepo } = await startedFactory()
    writeFileSync(
      join(targetRepo, 'docs', 'project', 'PRD', 'cross-repo-linking', 'epic.yml'),
      'title: Cross-repo linking\nstage: creating-stories\nfeatures: []\nhistory: []\n',
    )

    const response = await postJson(factory, '/api/agent/epics/cross-repo-linking/stories', {
      features: [{ id: 'M1', title: 'Builder API', stories: [901, 902] }],
    })

    expect(response.status).toBe(201)
    expect(await response.json()).toStrictEqual({
      epic: 'cross-repo-linking',
      stage: 'in-progress',
      stories: [901, 902],
    })
  })

  it('says 500 when a story has no features', async () => {
    const { factory } = await startedFactory()

    const response = await postJson(factory, '/api/agent/epics/cross-repo-linking/stories', {})

    expect(response.status).toBe(500)
  })

  it('says 404 for a route it does not have', async () => {
    const { factory } = await startedFactory()

    const response = await fetch(`http://127.0.0.1:${factory.port}/api/nothing`)

    expect(response.status).toBe(404)
  })
})
