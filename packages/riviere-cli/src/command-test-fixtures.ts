import {
  mkdtemp, rm, mkdir, writeFile 
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  vi, beforeEach, afterEach, expect, it 
} from 'vitest'
import { createProgram } from './cli'

export class ProcessExitError extends Error {
  constructor(public exitCode: number) {
    super(`process.exit(${exitCode})`)
    this.name = 'ProcessExitError'
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

function isErrorOutput(value: unknown): value is ErrorOutput {
  if (typeof value !== 'object' || value === null) return false
  if (!('success' in value) || value.success !== false) return false
  if (!('error' in value) || typeof value.error !== 'object' || value.error === null) return false
  return true
}

export function parseErrorOutput(consoleOutput: string[]): ErrorOutput {
  const firstLine = consoleOutput[0]
  if (firstLine === undefined) {
    throw new Error('Expected console output but got empty array')
  }
  const parsed: unknown = JSON.parse(firstLine)
  if (!isErrorOutput(parsed)) {
    throw new Error('Invalid error output')
  }
  return parsed
}

export function parseSuccessOutput<T>(
  consoleOutput: string[],
  guard: (value: unknown) => value is T,
  errorMessage: string,
): T {
  const firstLine = consoleOutput[0]
  if (firstLine === undefined) {
    throw new Error('Expected console output but got empty array')
  }
  const parsed: unknown = JSON.parse(firstLine)
  if (!guard(parsed)) {
    throw new Error(errorMessage)
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
    process.chdir(ctx.originalCwd)
    await rm(ctx.testDir, { recursive: true })
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

export function hasSuccessOutputStructure(value: unknown): value is {
  success: true
  data: object
} {
  if (typeof value !== 'object' || value === null) return false
  if (!('success' in value) || value.success !== true) return false
  if (!('data' in value) || typeof value.data !== 'object' || value.data === null) return false
  return true
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
