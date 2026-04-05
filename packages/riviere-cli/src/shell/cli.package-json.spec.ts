import {
  afterEach, describe, expect, it, vi 
} from 'vitest'

async function importCliWithPackageJson(packageJson: unknown): Promise<typeof import('./cli')> {
  vi.resetModules()
  vi.doMock('module', () => ({ createRequire: () => () => packageJson }))

  return import('./cli')
}

describe('cli package.json parsing', () => {
  afterEach(() => {
    vi.resetModules()
    vi.doUnmock('module')
  })

  it('throws when package.json is null', async () => {
    await expect(importCliWithPackageJson(null)).rejects.toThrow(
      'Invalid package.json: missing version field',
    )
  })

  it('throws when package.json is missing version', async () => {
    await expect(importCliWithPackageJson({ name: 'riviere-cli' })).rejects.toThrow(
      'Invalid package.json: missing version field',
    )
  })

  it('throws when package.json version is not a string', async () => {
    await expect(importCliWithPackageJson({ version: 123 })).rejects.toThrow(
      'Invalid package.json: version must be a string',
    )
  })
})
