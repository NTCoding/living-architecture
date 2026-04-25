import {
  mkdir, mkdtemp, rm, writeFile 
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'
import {
  afterEach, beforeEach, expect, it, vi 
} from 'vitest'
import { createProgram } from '../shell/cli'
import { handleGlobalError } from '../platform/infra/cli/presentation/global-error-handler'

class ProcessExitError extends Error {
  constructor(public exitCode: number) {
    super(`process.exit(${exitCode})`)
    this.name = 'ProcessExitError'
  }
}

export class TestAssertionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TestAssertionError'
  }
}

export class MockError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MockError'
  }
}

export interface ErrorOutput {
  success: false
  error: {
    code: string
    message: string
    suggestions: string[]
  }
}

const errorOutputSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    suggestions: z.array(z.string()),
  }),
})

const successOutputSchema = z.object({
  success: z.literal(true),
  data: z.record(z.string(), z.unknown()),
})

export function parseErrorOutput(consoleOutput: string[]): ErrorOutput {
  const firstLine = consoleOutput[0]
  if (firstLine === undefined) {
    throw new TestAssertionError('Expected console output but got empty array')
  }
  const parsed: unknown = JSON.parse(firstLine)
  return parseErrorOutputSchema(parsed)
}

export function parseSuccessOutput<T>(
  consoleOutput: string[],
  guard: (value: unknown) => value is T,
  errorMessage: string,
): T {
  const firstLine = consoleOutput[0]
  if (firstLine === undefined) {
    throw new TestAssertionError('Expected console output but got empty array')
  }
  const parsed: unknown = JSON.parse(firstLine)
  if (!guard(parsed)) {
    throw new TestAssertionError(errorMessage)
  }
  return parsed
}

export interface TestContext {
  testDir: string
  originalCwd: string
  consoleOutput: string[]
}

export function createTestContext(): TestContext {
  return {
    testDir: '',
    originalCwd: '',
    consoleOutput: [],
  }
}

export function setupCommandTest(ctx: TestContext): void {
  beforeEach(async () => {
    ctx.testDir = await mkdtemp(join(tmpdir(), 'riviere-test-'))
    ctx.originalCwd = process.cwd()
    ctx.consoleOutput = []
    process.chdir(ctx.testDir)
    vi.spyOn(console, 'log').mockImplementation((msg: string) => ctx.consoleOutput.push(msg))
    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new ProcessExitError(typeof code === 'number' ? code : 0)
    })
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    if (ctx.originalCwd !== '') {
      process.chdir(ctx.originalCwd)
    }
    if (ctx.testDir !== '') {
      await rm(ctx.testDir, {
        recursive: true,
        force: true,
      })
    }
  })
}

export async function createGraph(
  testDir: string,
  graphData: object,
  subPath = '.riviere',
): Promise<string> {
  const graphDir = join(testDir, subPath)
  await mkdir(graphDir, { recursive: true })
  const graphPath = join(graphDir, 'graph.json')
  await writeFile(graphPath, JSON.stringify(graphData), 'utf-8')
  return graphPath
}

export const baseMetadata = {
  sources: [{ repository: 'https://github.com/org/repo' }],
  domains: {
    orders: {
      description: 'Order management',
      systemType: 'domain',
    },
  },
}

export const sourceLocation = {
  repository: 'https://github.com/org/repo',
  filePath: 'src/orders/handler.ts',
}

export const useCaseComponent = {
  id: 'orders:checkout:usecase:place-order',
  type: 'UseCase',
  name: 'place-order',
  domain: 'orders',
  module: 'checkout',
  sourceLocation,
}

export const apiComponent = {
  id: 'orders:checkout:api:place-order',
  type: 'API',
  name: 'place-order',
  domain: 'orders',
  module: 'checkout',
  sourceLocation,
  apiType: 'REST',
  httpMethod: 'POST',
  path: '/orders',
}

export const eventHandlerComponent = {
  id: 'orders:checkout:eventhandler:on-order-placed',
  type: 'EventHandler',
  name: 'on-order-placed',
  domain: 'orders',
  module: 'checkout',
  sourceLocation,
  subscribedEvents: ['OrderPlaced'],
}

export const validLink = {
  id: 'orders:checkout:api:place-order→orders:checkout:usecase:place-order:sync',
  source: 'orders:checkout:api:place-order',
  target: 'orders:checkout:usecase:place-order',
  type: 'sync',
}

export const domainOpComponent = {
  id: 'orders:checkout:domainop:confirm-order',
  type: 'DomainOp',
  name: 'Confirm Order',
  domain: 'orders',
  module: 'checkout',
  operationName: 'confirmOrder',
  sourceLocation: {
    repository: 'https://github.com/org/repo',
    filePath: 'src/domain.ts',
  },
}

export const simpleUseCaseComponent = {
  id: 'orders:checkout:usecase:place-order',
  type: 'UseCase',
  name: 'Place Order',
  domain: 'orders',
  module: 'checkout',
  sourceLocation: {
    repository: 'https://github.com/org/repo',
    filePath: 'src/usecase.ts',
  },
}

export async function createGraphWithDomain(testDir: string, domainName: string): Promise<void> {
  const graphDir = join(testDir, '.riviere')
  await mkdir(graphDir, { recursive: true })
  const graph = {
    version: '1.0',
    metadata: {
      sources: [{ repository: 'https://github.com/org/repo' }],
      domains: {
        [domainName]: {
          description: 'Test domain',
          systemType: 'domain',
        },
      },
    },
    components: [],
    links: [],
  }
  await writeFile(join(graphDir, 'graph.json'), JSON.stringify(graph), 'utf-8')
}

export async function createGraphWithSource(testDir: string, repository: string): Promise<void> {
  const graphDir = join(testDir, '.riviere')
  await mkdir(graphDir, { recursive: true })
  const graph = {
    version: '1.0',
    metadata: {
      sources: [{ repository }],
      domains: {
        orders: {
          description: 'Orders',
          systemType: 'domain',
        },
      },
    },
    components: [],
    links: [],
  }
  await writeFile(join(graphDir, 'graph.json'), JSON.stringify(graph), 'utf-8')
}

export async function createGraphWithComponent(testDir: string, component: object): Promise<void> {
  const graphDir = join(testDir, '.riviere')
  await mkdir(graphDir, { recursive: true })
  const graph = {
    version: '1.0',
    metadata: {
      sources: [{ repository: 'https://github.com/org/repo' }],
      domains: {
        orders: {
          description: 'Order management',
          systemType: 'domain',
        },
      },
    },
    components: [component],
    links: [],
  }
  await writeFile(join(graphDir, 'graph.json'), JSON.stringify(graph), 'utf-8')
}

export interface CustomTypeDefinition {
  description?: string
  requiredProperties?: Record<
    string,
    {
      type: string
      description?: string
    }
  >
  optionalProperties?: Record<
    string,
    {
      type: string
      description?: string
    }
  >
}

export async function createGraphWithCustomType(
  testDir: string,
  domainName: string,
  customTypeName: string,
  customTypeDefinition: CustomTypeDefinition,
): Promise<void> {
  const graphDir = join(testDir, '.riviere')
  await mkdir(graphDir, { recursive: true })
  const graph = {
    version: '1.0',
    metadata: {
      sources: [{ repository: 'https://github.com/org/repo' }],
      domains: {
        [domainName]: {
          description: 'Test domain',
          systemType: 'domain',
        },
      },
      customTypes: { [customTypeName]: customTypeDefinition },
    },
    components: [],
    links: [],
  }
  await writeFile(join(graphDir, 'graph.json'), JSON.stringify(graph), 'utf-8')
}

export function hasSuccessOutputStructure(value: unknown): value is {
  success: true
  data: object
} {
  return successOutputSchema.safeParse(value).success
}

export function testCommandRegistration(commandName: string): void {
  it(`registers ${commandName} command under builder`, () => {
    const program = createProgram()
    const builderCmd = program.commands.find((cmd) => cmd.name() === 'builder')
    const cmd = builderCmd?.commands.find((cmd) => cmd.name() === commandName)
    expect(cmd?.name()).toBe(commandName)
  })
}

export async function testCustomGraphPath<T>(
  ctx: TestContext,
  commandArgs: string[],
  parseOutput: (consoleOutput: string[]) => T,
): Promise<T> {
  const customPath = await createGraph(
    ctx.testDir,
    {
      version: '1.0',
      metadata: baseMetadata,
      components: [],
      links: [],
    },
    'custom',
  )

  await createProgram().parseAsync([
    'node',
    'riviere',
    ...commandArgs,
    '--graph',
    customPath,
    '--json',
  ])
  return parseOutput(ctx.consoleOutput)
}

export function parseCommandWithErrorHandling(args: string[]): Promise<void> {
  return createProgram()
    .parseAsync(args)
    .catch(handleGlobalError)
    .then(() => undefined)
}

export function assertDefined<T>(
  value: T | undefined | null,
  message = 'Expected value to be defined',
): T {
  if (value === undefined || value === null) {
    throw new TestAssertionError(message)
  }
  return value
}

function parseErrorOutputSchema(value: unknown): ErrorOutput {
  const result = errorOutputSchema.safeParse(value)
  if (result.success) {
    return result.data
  }

  throw new TestAssertionError('Invalid error output')
}
