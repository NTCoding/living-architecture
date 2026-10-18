import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const FORBIDDEN_DEPENDENCIES = [
  'openai',
  '@anthropic-ai/sdk',
  '@google/generative-ai',
  'langchain',
  'dotenv',
]

const AI_CLI_SOURCES = [
  'src/features/extract/adapters/ai-cli/ai-cli-adapter.ts',
  'src/infra/external-clients/child-process/child-process-client.ts',
]

const FORBIDDEN_SOURCE_PATTERNS = [/api[-_]?key/i, /dotenv/i, /openai/i, /anthropic/i]

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')

function readUseCaseFile(path: string): string {
  return readFileSync(resolve(packageRoot, path), 'utf8')
}

describe('AI CLI dependencies', () => {
  it('does not declare an AI SDK or dotenv dependency', () => {
    const packageJson = readUseCaseFile('package.json')

    for (const dependencyName of FORBIDDEN_DEPENDENCIES) {
      expect({
        dependencyName,
        declared: packageJson.includes(`"${dependencyName}"`),
      }).toStrictEqual({
        dependencyName,
        declared: false,
      })
    }
  })

  it('does not handle API keys or load dotenv in the AI CLI boundary', () => {
    for (const sourcePath of AI_CLI_SOURCES) {
      const source = readUseCaseFile(sourcePath)
      for (const forbiddenPattern of FORBIDDEN_SOURCE_PATTERNS) {
        expect({ sourcePath, matches: forbiddenPattern.test(source) }).toStrictEqual({
          sourcePath,
          matches: false,
        })
      }
    }
  })
})
