import { CliErrorCode } from './error-codes'

/** @riviere-role cli-response */
export interface SuccessOutput<T> {
  success: true
  data: T
  warnings: string[]
}

/** @riviere-role cli-response */
export interface ErrorOutput {
  success: false
  error: {
    code: string
    message: string
    suggestions: string[]
  }
}

/**
 * @riviere-role cli-response-formatter
 * Formats a successful command result.
 * @param data - The result data.
 * @param warnings - Optional warnings to include.
 * @returns Formatted success output.
 */
export function formatSuccess<T>(data: T, warnings: string[] = []): SuccessOutput<T> {
  return {
    success: true,
    data,
    warnings,
  }
}

/**
 * @riviere-role cli-response-formatter
 * Formats a failed command result.
 * @param code - Error code identifying the failure type.
 * @param message - Human-readable error message.
 * @param suggestions - Optional suggestions for fixing the error.
 * @returns Formatted error output.
 */
export function formatError(
  code: CliErrorCode,
  message: string,
  suggestions: string[] = [],
): ErrorOutput {
  return {
    success: false,
    error: {
      code,
      message,
      suggestions,
    },
  }
}
