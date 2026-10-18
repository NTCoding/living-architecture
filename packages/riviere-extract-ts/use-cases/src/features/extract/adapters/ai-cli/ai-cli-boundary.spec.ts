import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const useCasesRoot = fileURLToPath(new URL('../../../../../', import.meta.url))
const useCasesSource = join(useCasesRoot, 'src')
const domainModelSource = fileURLToPath(
  new URL('../../../../../../domain-model/src', import.meta.url),
)

const aiCliPortFile = join(domainModelSource, 'domain/ports/ai-cli.ts')
const childProcessClientFile = join(
  useCasesSource,
  'infra/external-clients/child-process/child-process-client.ts',
)
const aiCliAdapterFile = join(useCasesSource, 'features/extract/adapters/ai-cli/ai-cli-adapter.ts')

const aiCliBoundaryFiles = [aiCliPortFile, childProcessClientFile, aiCliAdapterFile]

const forbiddenAiSdkDependency =
  /openai|anthropic|gemini|generative-ai|langchain|mistral|cohere|dotenv/i

function productionTypeScriptFiles(root: string): readonly string[] {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => join(entry.parentPath, entry.name))
    .filter((path) => !path.includes('.spec.') && !path.includes('__fixtures__'))
}

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function alphabetically(left: string, right: string): number {
  return left.localeCompare(right)
}

function packageDependencies(packageRoot: string): readonly string[] {
  const manifest: unknown = JSON.parse(read(join(packageRoot, 'package.json')))
  if (typeof manifest !== 'object' || manifest === null) throw new PackageManifestUnreadable()
  const dependencies = Object.getOwnPropertyDescriptor(manifest, 'dependencies')?.value
  if (typeof dependencies !== 'object' || dependencies === null)
    throw new PackageManifestUnreadable()
  return Object.keys(dependencies)
}

class PackageManifestUnreadable extends Error {}

describe('ai-cli boundary architecture assertions', () => {
  it('declares no AI SDK or dotenv dependency in the owning packages', () => {
    const dependencies = [
      ...packageDependencies(useCasesRoot),
      ...packageDependencies(
        fileURLToPath(new URL('../../../../../../domain-model/', import.meta.url)),
      ),
    ]

    expect(dependencies.filter((name) => forbiddenAiSdkDependency.test(name))).toStrictEqual([])
  })

  it('keeps credentials and API key handling out of the ai-cli boundary sources', () => {
    const credentialHandling = aiCliBoundaryFiles.filter((path) =>
      /dotenv|API_KEY|apiKey|credentials/i.test(read(path)),
    )

    expect(credentialHandling).toStrictEqual([])
  })

  it('spawns child processes without a shell', () => {
    const clientSource = read(childProcessClientFile)

    expect(clientSource).toContain('shell: false')
    expect(clientSource).not.toMatch(/shell: true|execSync|execFileSync|spawnSync/)
  })

  it('keeps a single child process spawning path for the ai-cli boundary', () => {
    const spawnImportingFiles = [
      ...productionTypeScriptFiles(useCasesSource),
      ...productionTypeScriptFiles(domainModelSource),
    ].filter((path) => /import \{[^}]*\bspawn\b[^}]*\} from 'node:child_process'/.test(read(path)))

    expect(spawnImportingFiles.toSorted(alphabetically)).toStrictEqual([childProcessClientFile])
  })

  it('keeps a single ai-cli availability and execution port', () => {
    const portDeclaringFiles = [
      ...productionTypeScriptFiles(useCasesSource),
      ...productionTypeScriptFiles(domainModelSource),
    ].filter((path) => read(path).includes('type AiCli = '))
    const availabilityDeclaringFiles = [
      ...productionTypeScriptFiles(useCasesSource),
      ...productionTypeScriptFiles(domainModelSource),
    ].filter((path) => read(path).includes('checkAvailability('))

    const expectedAvailabilityFiles = [
      aiCliPortFile,
      aiCliAdapterFile,
      join(domainModelSource, 'domain/riviere-project.ts'),
      join(domainModelSource, 'domain/workflow.ts'),
    ]

    expect(portDeclaringFiles).toStrictEqual([aiCliPortFile])
    expect(availabilityDeclaringFiles.toSorted(alphabetically)).toStrictEqual(
      expectedAvailabilityFiles.toSorted(alphabetically),
    )
  })
})
