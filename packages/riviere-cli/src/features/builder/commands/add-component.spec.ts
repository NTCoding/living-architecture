import {
  mkdir,
  writeFile,
} from 'node:fs/promises'
import { join } from 'node:path'
import {
  describe,
  expect,
  it,
} from 'vitest'
import {
  addComponent,
  InvalidGraphFileError,
} from './add-component'
import {
  createGraphWithDomain,
  createTestContext,
  setupCommandTest,
  type TestContext,
} from '../../../platform/__fixtures__/command-test-fixtures'
import type { AddComponentInput } from '../../../platform/domain/add-component'

describe('addComponent command', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)

  function baseInput(): AddComponentInput {
    return {
      type: 'UI',
      input: {
        name: 'TestComponent',
        domain: 'test-domain',
        module: 'test-module',
        route: '/test',
        sourceLocation: {
          repository: 'test-repo',
          filePath: '/path/to/file.ts',
        },
      },
    }
  }

  it('returns null when graph does not exist', async () => {
    const result = await addComponent({
      graphPath: join(ctx.testDir, '.riviere', 'graph.json'),
      component: baseInput(),
    })

    expect(result).toBeNull()
  })

  it('throws InvalidGraphFileError when graph contains invalid JSON', async () => {
    const graphDir = join(ctx.testDir, '.riviere')
    const graphPath = join(graphDir, 'graph.json')

    await mkdir(graphDir, { recursive: true })
    await writeFile(graphPath, 'not valid json {{{', 'utf-8')

    await expect(
      addComponent({
        graphPath,
        component: baseInput(),
      }),
    ).rejects.toBeInstanceOf(InvalidGraphFileError)
  })

  it('returns componentId for valid graph input', async () => {
    await createGraphWithDomain(ctx.testDir, 'test-domain')

    const result = await addComponent({
      graphPath: join(ctx.testDir, '.riviere', 'graph.json'),
      component: baseInput(),
    })

    expect(result).toStrictEqual({ componentId: 'test-domain:test-module:ui:testcomponent' })
  })
})
