import type { SourceLocation } from '@living-architecture/riviere-schema'

interface LinkSourceLocationOptions {
  repository?: string
  filePath?: string
  lineNumber?: string
  columnNumber?: string
}

type LinkSourceLocationResult =
  | {
    success: true
    sourceLocation: SourceLocation | undefined
  }
  | {
    success: false
    message: string
  }

/** @riviere-role cli-input-validator */
export function parseLinkSourceLocation(
  options: LinkSourceLocationOptions,
): LinkSourceLocationResult {
  const hasLocationOption =
    options.repository !== undefined ||
    options.filePath !== undefined ||
    options.lineNumber !== undefined ||
    options.columnNumber !== undefined
  if (!hasLocationOption) {
    return {
      success: true,
      sourceLocation: undefined,
    }
  }
  if (options.repository === undefined || options.filePath === undefined) {
    return {
      success: false,
      message: '--repository and --file-path are required when supplying a Link source location',
    }
  }

  const lineNumber = parsePositiveInteger(options.lineNumber, '--line-number')
  if (!lineNumber.success) {
    return lineNumber
  }
  const columnNumber = parsePositiveInteger(options.columnNumber, '--column-number')
  if (!columnNumber.success) {
    return columnNumber
  }

  return {
    success: true,
    sourceLocation: {
      repository: options.repository,
      filePath: options.filePath,
      ...(lineNumber.value !== undefined && { lineNumber: lineNumber.value }),
      ...(columnNumber.value !== undefined && { columnNumber: columnNumber.value }),
    },
  }
}

function parsePositiveInteger(
  raw: string | undefined,
  optionName: string,
):
  | {
    success: true
    value: number | undefined
  }
  | {
    success: false
    message: string
  } {
  if (raw === undefined) {
    return {
      success: true,
      value: undefined,
    }
  }
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) {
    return {
      success: false,
      message: `${optionName} must be a positive integer`,
    }
  }
  return {
    success: true,
    value,
  }
}
