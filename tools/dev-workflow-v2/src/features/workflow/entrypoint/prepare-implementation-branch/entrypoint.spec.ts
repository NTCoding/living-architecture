import { describe, expect, it, vi } from 'vitest'
import { runPrepareImplementationBranchEntrypoint } from './entrypoint'
import { formatPreparedImplementationBranch } from './prepare-implementation-branch-output'
import { parseImplementationBranchTarget } from './prepare-implementation-branch-target'
import { formatFailedCliResponse } from '../../../../infra/cli/presentation/format-cli-response'

class UnsafeBranchTestError extends Error {}

describe('prepare implementation branch entrypoint', () => {
  it('prepares and presents the requested branch', () => {
    const execute = vi.fn(() => ({
      branch: 'issue-42-example',
      remoteDefaultBranch: 'origin/trunk',
      type: 'created' as const,
    }))
    const writeCliResponse = vi.fn()
    const originalArguments = process.argv
    process.argv = ['node', 'prepare-implementation-branch', 'issue-42-example']

    try {
      runPrepareImplementationBranchEntrypoint({
        formatPreparedImplementationBranch,
        formatFailedCliResponse,
        parseImplementationBranchTarget,
        prepareImplementationBranch: { execute },
        writeCliResponse,
      })
    } finally {
      process.argv = originalArguments
    }

    expect(execute).toHaveBeenCalledWith({ targetBranch: 'issue-42-example' })
    expect(writeCliResponse).toHaveBeenCalledWith({
      message: 'Prepared issue-42-example from origin/trunk (created).\n',
      stream: 'stdout',
    })
  })

  it('prepares the requested branch when pnpm forwards its argument separator', () => {
    const execute = vi.fn(() => ({
      branch: 'issue-42-example',
      remoteDefaultBranch: 'origin/trunk',
      type: 'created' as const,
    }))
    const writeCliResponse = vi.fn()
    const originalArguments = process.argv
    process.argv = ['node', 'prepare-implementation-branch', '--', 'issue-42-example']

    try {
      runPrepareImplementationBranchEntrypoint({
        formatPreparedImplementationBranch,
        formatFailedCliResponse,
        parseImplementationBranchTarget,
        prepareImplementationBranch: { execute },
        writeCliResponse,
      })
    } finally {
      process.argv = originalArguments
    }

    expect(execute).toHaveBeenCalledWith({ targetBranch: 'issue-42-example' })
    expect(writeCliResponse).toHaveBeenCalledWith({
      message: 'Prepared issue-42-example from origin/trunk (created).\n',
      stream: 'stdout',
    })
  })

  it('presents a missing target argument as a CLI failure', () => {
    const execute = vi.fn()
    const writeCliResponse = vi.fn()
    const originalArguments = process.argv
    process.argv = ['node', 'prepare-implementation-branch']

    try {
      runPrepareImplementationBranchEntrypoint({
        formatPreparedImplementationBranch,
        formatFailedCliResponse,
        parseImplementationBranchTarget,
        prepareImplementationBranch: { execute },
        writeCliResponse,
      })
    } finally {
      process.argv = originalArguments
    }

    expect({
      commandCalls: execute.mock.calls.length,
      response: writeCliResponse.mock.calls[0]?.[0],
    }).toStrictEqual({
      commandCalls: 0,
      response: {
        exitCode: 1,
        message: 'Expected one target branch argument.\n',
        stream: 'stderr',
      },
    })
  })

  it('presents additional target arguments as a CLI failure', () => {
    const execute = vi.fn()
    const writeCliResponse = vi.fn()
    const originalArguments = process.argv
    process.argv = ['node', 'prepare-implementation-branch', 'issue-42-example', 'unexpected']

    try {
      runPrepareImplementationBranchEntrypoint({
        formatPreparedImplementationBranch,
        formatFailedCliResponse,
        parseImplementationBranchTarget,
        prepareImplementationBranch: { execute },
        writeCliResponse,
      })
    } finally {
      process.argv = originalArguments
    }

    expect({
      commandCalls: execute.mock.calls.length,
      response: writeCliResponse.mock.calls[0]?.[0],
    }).toStrictEqual({
      commandCalls: 0,
      response: {
        exitCode: 1,
        message: 'Expected one target branch argument.\n',
        stream: 'stderr',
      },
    })
  })

  it('presents a preparation exception as a CLI failure', () => {
    const writeCliResponse = vi.fn()
    const originalArguments = process.argv
    process.argv = ['node', 'prepare-implementation-branch', 'issue-42-example']

    try {
      runPrepareImplementationBranchEntrypoint({
        formatPreparedImplementationBranch,
        formatFailedCliResponse,
        parseImplementationBranchTarget,
        prepareImplementationBranch: {
          execute: () => {
            throw new UnsafeBranchTestError('unsafe branch')
          },
        },
        writeCliResponse,
      })
    } finally {
      process.argv = originalArguments
    }

    expect(writeCliResponse).toHaveBeenCalledWith({
      exitCode: 1,
      message: 'Error: unsafe branch\n',
      stream: 'stderr',
    })
  })
})
