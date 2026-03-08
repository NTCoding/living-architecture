import type { RoleTargetKind } from '../../../platform/domain/role-enforcement-config'

export interface TargetSymbol {
  kind: RoleTargetKind
  name: string
  relativeFilePath: string
  publicMethodNames: readonly string[]
}
