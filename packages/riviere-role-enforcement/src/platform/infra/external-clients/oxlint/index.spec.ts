import {
  expect, it 
} from 'vitest'
import {
  createOxlintImportSpecifier, OxlintExecutionError, runOxlint 
} from './index'

it('exposes the complete Oxlint client capability', () => {
  expect(runOxlint).toBeTypeOf('function')
  expect(createOxlintImportSpecifier).toBeTypeOf('function')
  expect(new OxlintExecutionError('failure')).toBeInstanceOf(Error)
})
