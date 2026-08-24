export type RoleTarget = 'class' | 'function' | 'interface' | 'type-alias' | 'variable'

export interface ApprovedInstance {
  readonly name: string
  readonly userHasApproved: true
}

export interface RoleConstraints<R extends string = string> {
  readonly allowedInputs?: readonly R[]
  readonly allowedNames?: readonly string[]
  readonly allowedOutputs?: readonly R[]
  readonly approvedInstances?: readonly ApprovedInstance[]
  readonly forbiddenCallableDataMembers?: true
  readonly forbiddenInlineCallableMembers?: true
  readonly forbiddenInlineFunctionImplementations?: true
  readonly requiresRoleDependencies?: true
  readonly forbiddenSupertypes?: readonly string[] | true
  readonly forbiddenDependencies?: readonly R[]
  readonly allowedDependencyRoles?: readonly R[]
  readonly allowedDependentRoles?: readonly R[]
  readonly allowedCollaboratorRoles?: readonly R[]
  readonly allowsUnclassifiedInputs?: true
  readonly forbiddenImportedFunctionCalls?: true
  readonly forbiddenMethodCalls?: readonly R[]
  readonly requiredPrivateMembers?: readonly string[]
  readonly requiresPrivateConstructor?: true
  readonly requiredStaticMethodNamePrefix?: string
  readonly requiresDataMembers?: true
  readonly requiresPrivateDataMembers?: true
  readonly requiresReadonlyDataMembers?: true
  readonly requiresJustification?: string
  readonly nameMatches?: string
  readonly maxPublicMethods?: number
  readonly minPublicMethods?: number
}
