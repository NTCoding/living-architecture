import { InvalidRoleDefinitionError } from './role-configuration-errors'

type RoleTargetValue = 'class' | 'function' | 'interface' | 'type-alias' | 'variable'

/** @riviere-role value-object */
export class RoleTarget {
  declare private readonly brand: 'RoleTarget'

  private constructor(readonly value: RoleTargetValue) {}

  static parse(value: RoleTargetValue): RoleTarget {
    return new RoleTarget(value)
  }
}

interface ApprovedInstanceInput {
  readonly name: string
  readonly userHasApproved: true
}

interface ApprovedInstanceCandidate {
  readonly name: string
  readonly userHasApproved: boolean
}

/** @riviere-role value-object */
export class ApprovedInstance {
  declare private readonly brand: 'ApprovedInstance'

  private constructor(
    readonly name: string,
    readonly userHasApproved: true,
  ) {}

  static parse(input: ApprovedInstanceCandidate): ApprovedInstance {
    if (input.userHasApproved !== true) {
      throw new InvalidRoleDefinitionError(
        `Role instance '${input.name}' must include explicit user approval.`,
      )
    }
    return new ApprovedInstance(input.name, input.userHasApproved)
  }
}

interface RoleConstraintsInput<R extends string = string> {
  readonly allowedInputs?: readonly R[]
  readonly allowedNames?: readonly string[]
  readonly allowedOutputs?: readonly R[]
  readonly approvedInstances?: readonly ApprovedInstanceInput[]
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

/** @riviere-role value-object */
export class RoleConstraints<R extends string = string> {
  declare private readonly brand: 'RoleConstraints'

  declare readonly allowedInputs?: readonly R[]
  declare readonly allowedNames?: readonly string[]
  declare readonly allowedOutputs?: readonly R[]
  declare readonly approvedInstances?: readonly ApprovedInstance[]
  declare readonly forbiddenCallableDataMembers?: true
  declare readonly forbiddenInlineCallableMembers?: true
  declare readonly forbiddenInlineFunctionImplementations?: true
  declare readonly requiresRoleDependencies?: true
  declare readonly forbiddenSupertypes?: readonly string[] | true
  declare readonly forbiddenDependencies?: readonly R[]
  declare readonly allowedDependencyRoles?: readonly R[]
  declare readonly allowedDependentRoles?: readonly R[]
  declare readonly allowedCollaboratorRoles?: readonly R[]
  declare readonly allowsUnclassifiedInputs?: true
  declare readonly forbiddenImportedFunctionCalls?: true
  declare readonly forbiddenMethodCalls?: readonly R[]
  declare readonly requiredPrivateMembers?: readonly string[]
  declare readonly requiresPrivateConstructor?: true
  declare readonly requiredStaticMethodNamePrefix?: string
  declare readonly requiresDataMembers?: true
  declare readonly requiresPrivateDataMembers?: true
  declare readonly requiresReadonlyDataMembers?: true
  declare readonly requiresJustification?: string
  declare readonly nameMatches?: string
  declare readonly maxPublicMethods?: number
  declare readonly minPublicMethods?: number

  private constructor(input: RoleConstraintsInput<R>) {
    Object.assign(this, input, {
      ...(input.approvedInstances === undefined
        ? {}
        : {
            approvedInstances: input.approvedInstances.map((instance) =>
              ApprovedInstance.parse(instance),
            ),
          }),
    })
  }

  static parse<R extends string>(input: RoleConstraintsInput<R>): RoleConstraints<R> {
    return new RoleConstraints(input)
  }
}
