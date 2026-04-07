export {
  createRoleFactory,
  location,
  role,
  roleEnforcement,
} from './features/enforcement/domain/role-enforcement-builder'
export type {
  BuiltLocation,
  BuiltRole,
  LocationBuilder,
  RoleEnforcementResult,
  RoleTarget,
} from './features/enforcement/domain/role-enforcement-builder'
export {
  filterConfigByPackage,
  PackageFilterError,
} from './features/enforcement/domain/filter-config-by-package'
export {
  formatRoleEnforcementFailure,
  RoleEnforcementExecutionError,
  runRoleEnforcement,
  type RoleEnforcementRunResult,
} from './features/enforcement/infra/external-clients/oxlint/run-role-enforcement'
