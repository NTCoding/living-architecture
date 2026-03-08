export type {
  CompiledRoleDefinition,
  CompiledRoleEnforcementConfig,
  PathMatcher,
  RoleDefinition,
  RoleEnforcementConfig,
  RoleTargetKind,
} from './platform/domain/role-enforcement-config'
export { RoleEnforcementConfigError } from './platform/domain/role-enforcement-config-error'
export {
  compileRoleEnforcementConfig,
  loadRoleEnforcementConfig,
} from './platform/infra/load-role-enforcement-config'
export { normalizePath } from './platform/infra/path-patterns'
export type {
  RoleViolation, RoleViolationCode 
} from './features/check/domain/role-violation'
export type { TargetSymbol } from './features/check/domain/target-symbol'
export {
  checkTargetSymbol,
  findMatchingRoles,
  isFileInScope,
} from './features/check/domain/check-role-target'
export { default as roleEnforcementOxlintPlugin } from './features/check/infra/oxlint-plugin'
