import type { RoleTargetKind } from '../../../platform/domain/role-enforcement-config'

export interface TargetSymbol {
  kind: RoleTargetKind
  name: string
  assignedRoleName: string | null
  relativeFilePath: string
  publicMethodNames: readonly string[]
}
