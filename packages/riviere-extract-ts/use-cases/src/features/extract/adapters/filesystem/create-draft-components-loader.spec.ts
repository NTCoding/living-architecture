import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ readJsonFile: vi.fn() }))

vi.mock('../../../../infra/external-clients/filesystem/file-reader', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../../../infra/external-clients/filesystem/file-reader')
  >()),
  readJsonFile: mocks.readJsonFile,
}))

import { FileReadError } from '../../../../infra/external-clients/filesystem/file-reader'
import { createDraftComponentsLoader } from './create-draft-components-loader'

const validDraftComponent = {
  domain: 'orders',
  location: { file: 'src/orders.ts', line: 1 },
  module: 'orders',
  name: 'Order',
  type: 'domain',
}

class UnexpectedDraftComponentsLoadingError extends Error {}

describe('createDraftComponentsLoader', () => {
  it('loads valid draft components from the file client', () => {
    mocks.readJsonFile.mockReturnValue([validDraftComponent])

    expect(createDraftComponentsLoader()('drafts.json')).toStrictEqual({
      success: true,
      draftComponents: [expect.objectContaining(validDraftComponent)],
    })
  })

  it('returns the JSON value from the file client without interpreting it', () => {
    mocks.readJsonFile.mockReturnValue({ components: [] })

    expect(createDraftComponentsLoader()('drafts.json')).toStrictEqual({
      success: true,
      draftComponents: { components: [] },
    })
  })

  it('returns a port failure when the file client cannot read the file', () => {
    mocks.readJsonFile.mockImplementation(() => {
      throw new FileReadError('Draft components not found: drafts.json')
    })

    expect(createDraftComponentsLoader()('drafts.json')).toStrictEqual({
      success: false,
      error: 'Draft components not found: drafts.json',
    })
  })

  it('preserves unexpected errors', () => {
    const error = new UnexpectedDraftComponentsLoadingError('Unexpected failure')
    mocks.readJsonFile.mockImplementation(() => {
      throw error
    })

    expect(() => createDraftComponentsLoader()('drafts.json')).toThrow(error)
  })
})
