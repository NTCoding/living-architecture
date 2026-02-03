import {
  workflow,
  type Step,
  type BaseContext,
  type WorkflowResult,
  type StepTiming,
} from './workflow-runner'
import { handleWorkflowError } from './error-handler'
import {
  type DebugLog, noopDebugLog 
} from '../debug-log'
import { type WorkflowIO } from '../workflow-io'

export interface WorkflowOptions<T extends BaseContext> {
  resolveTimingsFilePath?: (ctx: T) => string
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
    process.exit(code)
  },
}

export function runWorkflow<T extends BaseContext>(
  steps: Step<T>[],
  buildContext: () => Promise<T>,
  formatResult?: (result: WorkflowResult, ctx: T) => unknown,
  options?: WorkflowOptions<T>,
): void {
  executeWorkflow(steps, buildContext, formatResult, options).catch(handleWorkflowError)
}

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`
}

export function formatTimingsMarkdown(stepTimings: StepTiming[], totalDurationMs: number): string {
  const lines = [
    '# Workflow Timing',
    '',
    '| Step | Duration |',
    '|------|----------|',
    ...stepTimings.map((t) => `| ${t.name} | ${formatDuration(t.durationMs)} |`),
    '',
    `**Total: ${formatDuration(totalDurationMs)}**`,
    '',
  ]
  return lines.join('\n')
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

  if (options?.resolveTimingsFilePath) {
    const timingsPath = options.resolveTimingsFilePath(context)
    const markdown = formatTimingsMarkdown(result.stepTimings, result.totalDurationMs)
    io.writeFile(timingsPath, markdown)
  }

  const formatted = formatResult ? formatResult(result, context) : undefined
  const output = formatted ?? result.output ?? result

  io.log(JSON.stringify(output, null, 2))

  io.exit(result.success ? 0 : 1)
}
