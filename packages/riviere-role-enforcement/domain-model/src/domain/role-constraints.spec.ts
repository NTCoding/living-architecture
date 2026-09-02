import { describe, expect, it } from 'vitest'
import { InvalidRoleDefinitionError } from './role-configuration-errors'
import { ApprovedInstance, RoleConstraints, RoleTarget } from './role-constraints'

describe('role constraint value objects', () => {
  it('represents a permitted role target', () => {
    expect(RoleTarget.parse('class').value).toBe('class')
  })

  it('represents an explicitly approved role instance', () => {
    const approved = ApprovedInstance.parse({
      name: 'RiviereProject',
      userHasApproved: true,
    })

    expect(approved.name).toBe('RiviereProject')
    expect(approved.userHasApproved).toBe(true)
  })

  it('rejects a role instance without explicit user approval', () => {
    expect(() =>
      ApprovedInstance.parse({
        name: 'RiviereProject',
        userHasApproved: false,
      }),
    ).toThrowError(InvalidRoleDefinitionError)
  })

  it('parses approved instances as value objects within role constraints', () => {
    const constraints = RoleConstraints.parse({
      approvedInstances: [{ name: 'RiviereProject', userHasApproved: true }],
    })

    expect(constraints.approvedInstances?.[0]).toBeInstanceOf(ApprovedInstance)
  })

  it.each(['outputMethodNameMatches', 'forbiddenOutputMethodNameMatches'] as const)(
    'rejects an invalid %s regular expression',
    (constraint) => {
      expect(() => RoleConstraints.parse({ [constraint]: '[' })).toThrowError(
        InvalidRoleDefinitionError,
      )
    },
  )
})
