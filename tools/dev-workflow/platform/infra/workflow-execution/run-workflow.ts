import {
  workflow,
  type Step,
  type BaseContext,
  type WorkflowResult,
} from '../../domain/workflow-execution/workflow-runner'
import { handleWorkflowError } from './error-handler'
import {
  type DebugLog, noopDebugLog 
} from '../../domain/debug-log'
import { type WorkflowIO } from '../../domain/workflow-io'
import { formatTimingsMarkdown } from '../cli/format-timings'

export interface WorkflowOptions<T extends BaseContext> {
  resolveTimingsFilePath?: (ctx: T) => string
  resolveOutputFilePath?: (ctx: T) => string
  errorOutputFilePath?: string
  debugLog?: DebugLog
  io?: WorkflowIO
}

function noop(): void {
  // intentionally empty - used for optional writeFile
}

const defaultIO: WorkflowIO = {
  writeFile: noop,
  log: (output: string) => {
    console.log(output)
  },
  exit: (code: number) => {
    process.stdout.write('', () => {
      process.exit(code)
    })
  },
}

export function runWorkflow<T extends BaseContext>(
  steps: Step<T>[],
  buildContext: () => Promise<T>,
  formatResult?: (result: WorkflowResult, ctx: T) => unknown,
  options?: WorkflowOptions<T>,
): void {
  executeWorkflow(steps, buildContext, formatResult, options).catch((error: unknown) => {
    handleWorkflowError(error, options?.errorOutputFilePath)
  })
}

function writeOptionalFiles<T extends BaseContext>(
  io: WorkflowIO,
  context: T,
  result: WorkflowResult,
  jsonOutput: string,
  options?: WorkflowOptions<T>,
): void {
  if (options?.resolveTimingsFilePath) {
    const timingsPath = options.resolveTimingsFilePath(context)
    const markdown = formatTimingsMarkdown(result.stepTimings, result.totalDurationMs)
    io.writeFile(timingsPath, markdown)
  }

  if (options?.resolveOutputFilePath) {
    const outputPath = options.resolveOutputFilePath(context)
    io.writeFile(outputPath, jsonOutput)
  }
}

async function executeWorkflow<T extends BaseContext>(
  steps: Step<T>[],
  buildContext: () => Promise<T>,
  formatResult?: (result: WorkflowResult, ctx: T) => unknown,
  options?: WorkflowOptions<T>,
): Promise<void> {
  const log = options?.debugLog ?? noopDebugLog()
  const io = options?.io ?? defaultIO

  log.log('buildContext: start')
  const context = await buildContext()
  log.log(`buildContext: done (branch=${context.branch})`)

  const runner = workflow(steps, log)
  const result = await runner(context)

  log.log(`workflow complete: success=${result.success}, failedStep=${result.failedStep ?? 'none'}`)

  const formatted = formatResult ? formatResult(result, context) : undefined
  const output = formatted ?? result.output ?? result
  const jsonOutput = JSON.stringify(output, null, 2)

  writeOptionalFiles(io, context, result, jsonOutput, options)

  io.log(jsonOutput)

  io.exit(0)
}
