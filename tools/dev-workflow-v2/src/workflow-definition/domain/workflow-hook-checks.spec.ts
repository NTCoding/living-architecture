import { checkWriteAllowed } from './workflow-predicates'

describe('checkWriteAllowed predicate', () => {
  it('allows writes to normal files', () => {
    const result = checkWriteAllowed('/src/foo.ts')
    expect(result).toStrictEqual({ pass: true })
  })

  it('blocks writes to nx.json', () => {
    const result = checkWriteAllowed('/project/nx.json')
    expect(result.pass).toBe(false)
    expect(result).toMatchObject({ reason: expect.stringContaining('nx.json') })
  })

  it('blocks writes to tsconfig.base.json', () => {
    const result = checkWriteAllowed('/project/tsconfig.base.json')
    expect(result.pass).toBe(false)
  })

  it('blocks writes to eslint.config.mjs', () => {
    const result = checkWriteAllowed('/project/eslint.config.mjs')
    expect(result.pass).toBe(false)
  })

  it('blocks writes to vitest.config.ts', () => {
    const result = checkWriteAllowed('/project/vitest.config.ts')
    expect(result.pass).toBe(false)
  })

  it('blocks writes to vite.config.ts', () => {
    const result = checkWriteAllowed('/project/vite.config.ts')
    expect(result.pass).toBe(false)
  })

  it('allows writes to project-level tsconfig.json', () => {
    const result = checkWriteAllowed('/project/packages/foo/tsconfig.json')
    expect(result).toStrictEqual({ pass: true })
  })
})
