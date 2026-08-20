import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTestContext, setupCommandTest } from '../../../../__fixtures__/command-test-fixtures'
import { createProgram } from '../../../../shell/cli'

const extractionConfig = `modules:
  - name: orders
    domain: orders
    path: ..
    glob: "*.ts"
    api: { notUsed: true }
    useCase: { notUsed: true }
    domainOp: { notUsed: true }
    event: { notUsed: true }
    eventHandler: { notUsed: true }
    ui: { notUsed: true }
`

const workflow = `version: 1
graph:
  sources:
    - repository: https://github.com/test/repo
  domains:
    - name: orders
  outputPath: .riviere/graph.json
runLog:
  directory: .riviere/logs
stages:
  - extract:
      name: extract-orders
      config: .riviere/config.yml
  - link:
      config: .riviere/config.yml
  - validate: {}
`

describe('riviere workflow run wiring', () => {
  const ctx = createTestContext()
  setupCommandTest(ctx)

  it('creates the builder adapter and runs a named workflow', async () => {
    await mkdir(join(ctx.testDir, '.riviere', 'workflows'), { recursive: true })
    await writeFile(join(ctx.testDir, 'component.ts'), 'export class Order {}')
    await writeFile(join(ctx.testDir, '.riviere', 'config.yml'), extractionConfig)
    await writeFile(join(ctx.testDir, '.riviere', 'workflows', 'main.yaml'), workflow)

    await createProgram().parseAsync(['node', 'riviere', 'workflow', 'run', 'main'])

    expect(JSON.parse(ctx.consoleOutput[0] ?? '{}')).toMatchObject({
      kind: 'success',
      outputPath: join(ctx.testDir, '.riviere', 'graph.json'),
      runLogDirectory: join(ctx.testDir, '.riviere', 'logs'),
    })
  })
})
