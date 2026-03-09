import * as roleEnforcement from './index'

describe('index exports', () => {
  it('re-exports the public runtime surface', () => {
    expect({
      RoleEnforcementConfigError: roleEnforcement.RoleEnforcementConfigError,
      compileRoleEnforcementConfig: roleEnforcement.compileRoleEnforcementConfig,
      loadRoleEnforcementConfig: roleEnforcement.loadRoleEnforcementConfig,
      normalizePath: roleEnforcement.normalizePath,
      checkTargetSymbol: roleEnforcement.checkTargetSymbol,
      findAssignedRoleDefinition: roleEnforcement.findAssignedRoleDefinition,
      isFileInScope: roleEnforcement.isFileInScope,
      createRoleClassifierResult: roleEnforcement.createRoleClassifierResult,
      findRoleClassifierResult: roleEnforcement.findRoleClassifierResult,
      roleEnforcementOxlintPlugin: roleEnforcement.roleEnforcementOxlintPlugin,
    }).toStrictEqual({
      RoleEnforcementConfigError: expect.any(Function),
      compileRoleEnforcementConfig: expect.any(Function),
      loadRoleEnforcementConfig: expect.any(Function),
      normalizePath: expect.any(Function),
      checkTargetSymbol: expect.any(Function),
      findAssignedRoleDefinition: expect.any(Function),
      isFileInScope: expect.any(Function),
      createRoleClassifierResult: expect.any(Function),
      findRoleClassifierResult: expect.any(Function),
      roleEnforcementOxlintPlugin: expect.any(Object),
    })
  })
})
