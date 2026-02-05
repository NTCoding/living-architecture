import {
  writeFile, mkdir 
} from 'node:fs/promises'
import { join } from 'node:path'
import { TestAssertionError } from '../../../platform/__fixtures__/command-test-fixtures'

interface DraftComponent {
  type: string
  name: string
  domain: string
  location: {
    file: string
    line: number
  }
}

export interface ExtractionOutput {
  success: true
  data: DraftComponent[]
}

interface ExtractedLinkOutput {
  source: string
  target: string
  type?: string
  sourceLocation?: {
    filePath: string
    lineNumber: number
  }
  _uncertain?: string
}

export interface FullExtractionOutput {
  success: true
  data: {
    components: DraftComponent[]
    links: ExtractedLinkOutput[]
  }
}

function isExtractionOutput(value: unknown): value is ExtractionOutput {
  if (typeof value !== 'object' || value === null) return false
  if (!('success' in value) || value.success !== true) return false
  if (!('data' in value) || !Array.isArray(value.data)) return false
  return true
}

function isFullExtractionOutput(value: unknown): value is FullExtractionOutput {
  if (typeof value !== 'object' || value === null) return false
  if (!('success' in value) || value.success !== true) return false
  if (!('data' in value) || typeof value.data !== 'object' || value.data === null) return false
  if (!('components' in value.data) || !Array.isArray(value.data.components)) return false
  if (!('links' in value.data) || !Array.isArray(value.data.links)) return false
  return true
}

export function parseExtractionOutput(consoleOutput: string[]): ExtractionOutput {
  const firstLine = consoleOutput[0]
  if (firstLine === undefined) {
    throw new TestAssertionError('Expected console output but got empty array')
  }
  const parsed: unknown = JSON.parse(firstLine)
  if (!isExtractionOutput(parsed)) {
    throw new TestAssertionError('Invalid extraction output')
  }
  return parsed
}

export function parseFullExtractionOutput(consoleOutput: string[]): FullExtractionOutput {
  const firstLine = consoleOutput[0]
  if (firstLine === undefined) {
    throw new TestAssertionError('Expected console output but got empty array')
  }
  const parsed: unknown = JSON.parse(firstLine)
  if (!isFullExtractionOutput(parsed)) {
    throw new TestAssertionError(
      `Invalid full extraction output. Expected { components, links }. Got: ${JSON.stringify(parsed).slice(0, 200)}`,
    )
  }
  return parsed
}

const validConfigYaml = `
modules:
  - name: orders
    path: "**/src/**/*.ts"
    api: { notUsed: true }
    useCase:
      find: classes
      where:
        hasJSDoc:
          tag: useCase
    domainOp: { notUsed: true }
    event: { notUsed: true }
    eventHandler: { notUsed: true }
    eventPublisher: { notUsed: true }
    ui: { notUsed: true }
`

export const validSourceCode = `
/** @useCase */
export class PlaceOrder {
  execute() {}
}
`

export async function createValidExtractFixture(testDir: string): Promise<string> {
  const srcDir = join(testDir, 'src')
  await mkdir(srcDir, { recursive: true })
  await writeFile(join(srcDir, 'order-service.ts'), validSourceCode)
  const configPath = join(testDir, 'extract.yaml')
  await writeFile(configPath, validConfigYaml)
  return configPath
}
