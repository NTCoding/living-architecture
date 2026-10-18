import { describe, expect, it } from 'vitest'
import type { RunWorkflowResult } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/run-workflow-result'
import type { ValidateWorkflowResult } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/validate-workflow-result'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'
import { formatRunWorkflowResult, formatValidateWorkflowResult } from './workflow-output-formatter'

function successfulRunResult(): RunWorkflowResult {
  return {
    result: {
      success: true,
      graph: { version: '1.0', metadata: { domains: {} }, components: [], links: [] },
      outputPath: '/project/.riviere/graph.json',
      runLogDirectory: '/project/.riviere',
      events: [],
      warnings: [],
    },
  }
}

describe('formatValidateWorkflowResult', () => {
  it('formats a successful validation as success output', () => {
    expect(formatValidateWorkflowResult({ result: { success: true } })).toStrictEqual({
      success: true,
      data: 'Workflow is valid',
      warnings: [],
    })
  })

  it('formats an unavailable AI CLI error by its CLI error code', () => {
    const result: ValidateWorkflowResult = {
      result: {
        success: false,
        errorCode: 'AI_CLI_UNAVAILABLE',
        reason: 'AI CLI is unavailable',
      },
    }

    expect(formatValidateWorkflowResult(result)).toStrictEqual({
      success: false,
      error: {
        code: CliErrorCode.AiCliUnavailable,
        message: 'AI CLI is unavailable',
        suggestions: [],
      },
    })
  })

  it('formats a validation error by its CLI error code', () => {
    const result: ValidateWorkflowResult = {
      result: { success: false, errorCode: 'VALIDATION_ERROR', reason: 'Invalid workflow' },
    }

    expect(formatValidateWorkflowResult(result).success).toBe(false)
    expect(formatValidateWorkflowResult(result)).toMatchObject({
      error: { code: CliErrorCode.ValidationError },
    })
  })

  it('formats an unknown failure as a runtime error', () => {
    const result: ValidateWorkflowResult = {
      result: { success: false, errorCode: 'FILE_READ_ERROR', reason: 'Cannot read file' },
    }

    expect(formatValidateWorkflowResult(result)).toMatchObject({
      error: { code: CliErrorCode.RuntimeError },
    })
  })
})

describe('formatRunWorkflowResult', () => {
  it('formats a successful run with the completed output path', () => {
    expect(formatRunWorkflowResult(successfulRunResult())).toStrictEqual({
      success: true,
      data: 'Workflow completed: /project/.riviere/graph.json',
      warnings: [],
    })
  })

  it('formats a failed run with its CLI error code', () => {
    const result: RunWorkflowResult = {
      result: {
        success: false,
        errorCode: 'AI_CLI_UNAVAILABLE',
        reason: 'AI CLI is unavailable',
        events: [],
        warnings: [],
      },
    }

    expect(formatRunWorkflowResult(result)).toStrictEqual({
      success: false,
      error: {
        code: CliErrorCode.AiCliUnavailable,
        message: 'AI CLI is unavailable',
        suggestions: [],
      },
    })
  })
})
