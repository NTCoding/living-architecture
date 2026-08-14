import { expect, it } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  roleEnforcementConfiguration,
} from '@living-architecture/riviere-role-enforcement-domain-model'
import { runTestRoleEnforcement, withWorkspaceFixture } from './__fixtures__/test-fixture-workspace'

type TestRole = 'parser' | 'schema'

const schemaRole = role('schema', {
  mustBeDataStructure: true,
})
const parserRole = role('parser', {
  returns: [
    { success: true, '*': 'schema' },
    { success: false, '*': '*' },
  ],
})

const config = roleEnforcementConfiguration({
  configurations: {
    'packages/pkg-a': {
      locations: locationConfiguration(
        location<TestRole>('/published-language', ['parser', 'schema']),
      ),
    },
  },
  ignorePatterns: ['**/*.spec.ts'],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: [schemaRole, parserRole],
})

function runWith(parserSource: string) {
  return withWorkspaceFixture(
    {
      prefix: 'role-enforcement-parser-',
      roles: [schemaRole, parserRole],
      files: {
        'packages/pkg-a/src/published-language/schema.ts': `/** @riviere-role schema */
export interface Graph {
  version: string
}
`,
        'packages/pkg-a/src/published-language/parser.ts': parserSource,
      },
    },
    (workspaceDir) => runTestRoleEnforcement(config, workspaceDir),
  )
}

it('allows a parser returning the schema or failure details', () => {
  const result = runWith(`import type { Graph } from './schema'

/** @riviere-role parser */
export function parseGraph(value: string):
  | { success: true; graph: Graph }
  | { success: false; issues: string[] } {
  return { success: false, issues: [] }
}
`)

  expect(result.exitCode).toBe(0)
})

it('rejects a parser whose success branch does not return the schema', () => {
  const result = runWith(`/** @riviere-role parser */
export function parseGraph(value: string):
  | { success: true; graph: string }
  | { success: false; issues: string[] } {
  return { success: false, issues: [] }
}
`)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain(
    "Role 'parser' requires its success branch to return role 'schema'",
  )
})

it('rejects a parser without an explicit failure branch', () => {
  const result = runWith(`import type { Graph } from './schema'

/** @riviere-role parser */
export function parseGraph(value: string): { success: true; graph: Graph } {
  throw new Error(value)
}
`)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain(
    "Role 'parser' requires explicit success and failure return branches",
  )
})
