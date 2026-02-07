import {
  writeFile, mkdir 
} from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { TestAssertionError } from '../../../platform/__fixtures__/command-test-fixtures'

const draftComponentSchema = z.looseObject({
  type: z.string(),
  name: z.string(),
  domain: z.string(),
  location: z.object({
    file: z.string(),
    line: z.number(),
  }),
})

const extractedLinkOutputSchema = z.looseObject({
  source: z.string(),
  target: z.string(),
  type: z.string().optional(),
  sourceLocation: z
    .object({
      filePath: z.string(),
      lineNumber: z.number(),
    })
    .optional(),
  _uncertain: z.string().optional(),
})

const extractionOutputSchema = z.object({
  success: z.literal(true),
  data: z.array(draftComponentSchema),
})

const fullExtractionOutputSchema = z.object({
  success: z.literal(true),
  data: z.object({
    components: z.array(draftComponentSchema),
    links: z.array(extractedLinkOutputSchema),
  }),
})

export type ExtractionOutput = z.infer<typeof extractionOutputSchema>

export type FullExtractionOutput = z.infer<typeof fullExtractionOutputSchema>

export function parseExtractionOutput(consoleOutput: string[]): ExtractionOutput {
  const firstLine = consoleOutput[0]
  if (firstLine === undefined) {
    throw new TestAssertionError('Expected console output but got empty array')
  }
  const parsed: unknown = JSON.parse(firstLine)
  const result = extractionOutputSchema.safeParse(parsed)
  if (!result.success) {
    throw new TestAssertionError(`Invalid extraction output: ${result.error.message}`)
  }
  return result.data
}

export function parseFullExtractionOutput(consoleOutput: string[]): FullExtractionOutput {
  const firstLine = consoleOutput[0]
  if (firstLine === undefined) {
    throw new TestAssertionError('Expected console output but got empty array')
  }
  const parsed: unknown = JSON.parse(firstLine)
  const result = fullExtractionOutputSchema.safeParse(parsed)
  if (!result.success) {
    throw new TestAssertionError(`Invalid full extraction output: ${result.error.message}`)
  }
  return result.data
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

// Note: vi.mock() for git-repository-info is duplicated across spec files
// because vi.mock() must be called at the top level with an inline factory.
// See: https://vitest.dev/api/vi.html#vi-mock
