import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const packageRoot = fileURLToPath(new URL('../../../../../', import.meta.url))

const boundarySources = [
  join(packageRoot, '..', 'domain-model', 'src', 'domain', 'ports', 'ai-cli.ts'),
  join(packageRoot, 'src', 'infra', 'external-clients', 'child-process', 'child-process-client.ts'),
  join(packageRoot, 'src', 'features', 'extract', 'adapters', 'ai-cli', 'ai-cli-adapter.ts'),
]

const forbiddenDependencyPattern = /openai|anthropic|dotenv|^ai$/i
const forbiddenSourcePattern = /dotenv|api[_-]?key|openai|anthropic/i

async function dependencyNames(packageJsonPath: string): Promise<readonly string[]> {
  const parsed: unknown = JSON.parse(await readFile(packageJsonPath, 'utf8'))
  if (typeof parsed !== 'object' || parsed === null) return []
  const dependencies = Object.getOwnPropertyDescriptor(parsed, 'dependencies')?.value
  if (typeof dependencies !== 'object' || dependencies === null) return []
  return Object.keys(dependencies)
}

describe('AI CLI boundary dependencies', () => {
  it('declares no AI SDK or dotenv dependency in the domain model package', async () => {
    const dependencies = await dependencyNames(
      join(packageRoot, '..', 'domain-model', 'package.json'),
    )

    expect(dependencies.filter((name) => forbiddenDependencyPattern.test(name))).toStrictEqual([])
  })

  it('declares no AI SDK or dotenv dependency in the use-case package', async () => {
    const dependencies = await dependencyNames(join(packageRoot, 'package.json'))

    expect(dependencies.filter((name) => forbiddenDependencyPattern.test(name))).toStrictEqual([])
  })

  it('contains no dotenv loading, API-key handling, or AI SDK import in the boundary sources', async () => {
    const matchingLines: string[] = []
    for (const sourcePath of boundarySources) {
      const source = await readFile(sourcePath, 'utf8')
      matchingLines.push(...source.split('\n').filter((line) => forbiddenSourcePattern.test(line)))
    }

    expect(matchingLines).toStrictEqual([])
  })
})
