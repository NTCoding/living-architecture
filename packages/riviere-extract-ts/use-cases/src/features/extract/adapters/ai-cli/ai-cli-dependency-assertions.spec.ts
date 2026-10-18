import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const adapterDirectory = fileURLToPath(new URL('.', import.meta.url))
const sourceRoot = resolve(adapterDirectory, '../../../..')
const useCasesRoot = resolve(sourceRoot, '..')
const repositoryRoot = resolve(useCasesRoot, '../../..')

const changedSources = [
  resolve(adapterDirectory, 'ai-cli-adapter.ts'),
  resolve(sourceRoot, 'infra/external-clients/child-process/child-process-client.ts'),
  resolve(repositoryRoot, 'packages/riviere-extract-ts/domain-model/src/domain/ports/ai-cli.ts'),
  resolve(sourceRoot, 'features/extract/data-access/riviere-project/riviere-project-repository.ts'),
]

const packageManifests = [
  resolve(useCasesRoot, 'package.json'),
  resolve(repositoryRoot, 'packages/riviere-extract-ts/domain-model/package.json'),
]

const forbiddenSourcePatterns = [
  /from\s+['"]dotenv['"]/,
  /require\(\s*['"]dotenv['"]\s*\)/,
  /from\s+['"](?:openai|@anthropic-ai\/sdk|ai|@ai-sdk\/[^'"]+)['"]/,
  /process\.env\.\w*(?:API_KEY|TOKEN|SECRET)/i,
  /api[_-]?key/i,
]

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

describe('AI CLI dependency boundary', () => {
  it.each(changedSources)('contains no AI SDK, dotenv, or API-key handling in %s', (path) => {
    const source = read(path)

    forbiddenSourcePatterns.forEach((pattern) => {
      expect(source).not.toMatch(pattern)
    })
  })

  it.each(packageManifests)('declares no dotenv or AI SDK dependency in %s', (path) => {
    const manifest = read(path)

    expect(manifest).not.toMatch(/"dotenv"\s*:/)
    expect(manifest).not.toMatch(/"(?:openai|@anthropic-ai\/sdk|ai|@ai-sdk\/[^"]+)"\s*:/)
  })

  it('keeps workflow run-mode validation owned by the domain value object', () => {
    const workflowEntrypointSource = read(
      resolve(repositoryRoot, 'apps/cli/src/features/extract/entrypoint/workflow/entrypoint.ts'),
    )
    const runWorkflowInputSource = read(
      resolve(sourceRoot, 'features/extract/commands/run-workflow-input.ts'),
    )

    expect(workflowEntrypointSource).not.toContain("'run' | 'skip-ai' | 'dry-run'")
    expect(runWorkflowInputSource).not.toContain("'run' | 'skip-ai' | 'dry-run'")
  })

  it('spawns processes with shell execution disabled', () => {
    const clientSource = read(
      resolve(sourceRoot, 'infra/external-clients/child-process/child-process-client.ts'),
    )

    expect(clientSource).toContain('shell: false')
    expect(clientSource).not.toContain('shell: true')
  })
})
