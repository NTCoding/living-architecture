import { createProgram as createProgramFromFeatureShim } from './cli'
import { createProgram as createProgramFromShell } from '../../shell/cli'

describe('features shell cli compat shim', () => {
  it('re-exports the root createProgram function', () => {
    expect(createProgramFromFeatureShim).toBe(createProgramFromShell)
  })
})
