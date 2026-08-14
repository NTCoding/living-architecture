import { expect, it } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  roleEnforcementConfiguration,
} from '@living-architecture/riviere-role-enforcement-domain-model'
import { runTestRoleEnforcement, withWorkspaceFixture } from './__fixtures__/test-fixture-workspace'

const annotationRole = role('annotation', {
  requiresDecoratorSignature: true,
})

const config = roleEnforcementConfiguration({
  configurations: {
    'packages/pkg-a': {
      locations: locationConfiguration(
        location<'annotation'>('/published-language', ['annotation']),
      ),
    },
  },
  ignorePatterns: ['**/*.spec.ts'],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: [annotationRole],
})

function runWith(source: string) {
  return withWorkspaceFixture(
    {
      prefix: 'role-enforcement-decorator-',
      roles: [annotationRole],
      files: {
        'packages/pkg-a/src/published-language/annotation.ts': source,
      },
    },
    (workspaceDir) => {
      return runTestRoleEnforcement(config, workspaceDir)
    },
  )
}

it('allows an annotation implemented as a direct decorator', () => {
  const result = runWith(`/** @riviere-role annotation */
export function Mark<T>(target: T, context: ClassDecoratorContext): T {
  return target
}
`)

  expect(result.exitCode).toBe(0)
})

it('allows an annotation implemented as a decorator factory', () => {
  const result = runWith(`/** @riviere-role annotation */
export function Named(name: string): <T>(target: T, context: ClassDecoratorContext) => T {
  return function <T>(target: T, context: ClassDecoratorContext): T {
    return target
  }
}
`)

  expect(result.exitCode).toBe(0)
})

it('rejects an ordinary function labelled as an annotation', () => {
  const result = runWith(`/** @riviere-role annotation */
export function formatName(value: string): string {
  return value.trim()
}
`)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain(
    "Role 'annotation' requires a decorator signature on 'formatName'.",
  )
})
