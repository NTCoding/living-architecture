import { expect, it } from 'vitest'
import { validateNoRepeatedInheritedImports } from './validate-location-import-rules'

it('allows a child to add an import its parent does not allow', () => {
  expect(() =>
    validateNoRepeatedInheritedImports([
      node('parent', '/parent'),
      node('child', '/child', 'parent', { allow: { sibling: ['records'] } }),
    ]),
  ).not.toThrow()
})

it('allows a child to replace inherited rules explicitly', () => {
  expect(() =>
    validateNoRepeatedInheritedImports([
      node('parent', '/parent', undefined, { allow: { root: ['utilities'] } }),
      node('child', '/child', 'parent', {
        allow: { root: ['utilities'] },
        inheritParentImportRules: false,
      }),
    ]),
  ).not.toThrow()
})

it('rejects an import inherited through more than one parent', () => {
  expect(() =>
    validateNoRepeatedInheritedImports([
      node('grandparent', '/grandparent', undefined, {
        allow: { ownSubdomain: ['api'] },
      }),
      node('parent', '/parent', 'grandparent'),
      node('child', '/child', 'parent', { allow: { ownSubdomain: ['api'] } }),
    ]),
  ).toThrow("Location '/child' repeats inherited ownSubdomain import 'api'.")
})

it('stops inheriting beyond a parent that replaces its inherited rules', () => {
  expect(() =>
    validateNoRepeatedInheritedImports([
      node('grandparent', '/grandparent', undefined, { allow: { root: ['utilities'] } }),
      node('parent', '/parent', 'grandparent', {
        allow: { sibling: ['records'] },
        inheritParentImportRules: false,
      }),
      node('child', '/child', 'parent', { allow: { root: ['utilities'] } }),
    ]),
  ).not.toThrow()
})

it('rejects the same role-filtered import inherited from a parent', () => {
  expect(() =>
    validateNoRepeatedInheritedImports([
      node('parent', '/parent', undefined, {
        allow: { anySubdomain: [{ api: ['request', 'response'] }] },
      }),
      node('child', '/child', 'parent', {
        allow: { anySubdomain: [{ api: ['request', 'response'] }] },
      }),
    ]),
  ).toThrow("Location '/child' repeats inherited anySubdomain import 'api'.")
})

it('allows a different role filter for the same location', () => {
  expect(() =>
    validateNoRepeatedInheritedImports([
      node('parent', '/parent', undefined, {
        allow: { sibling: [{ records: ['summary'] }] },
      }),
      node('child', '/child', 'parent', {
        allow: { sibling: [{ records: ['details'] }] },
      }),
    ]),
  ).not.toThrow()
})

it('rejects a role filter when the parent already allows every role from that location', () => {
  expect(() =>
    validateNoRepeatedInheritedImports([
      node('parent', '/parent', undefined, { allow: { sibling: ['records'] } }),
      node('child', '/child', 'parent', {
        allow: { sibling: [{ records: ['summary'] }] },
      }),
    ]),
  ).toThrow("Location '/child' repeats inherited sibling import 'records'.")
})

it('allows a child to broaden a role-filtered parent import', () => {
  expect(() =>
    validateNoRepeatedInheritedImports([
      node('parent', '/parent', undefined, {
        allow: { sibling: [{ records: ['summary'] }] },
      }),
      node('child', '/child', 'parent', { allow: { sibling: ['records'] } }),
    ]),
  ).not.toThrow()
})

it('rejects an empty role-filtered import', () => {
  expect(() =>
    validateNoRepeatedInheritedImports([
      node('parent', '/parent'),
      node('child', '/child', 'parent', { allow: { sibling: [{}] } }),
    ]),
  ).toThrow('A role-filtered import must name a location.')
})

function node(
  id: string,
  name: string,
  parentId?: string,
  importRules?: {
    readonly allow?: Partial<
      Record<
        'sibling' | 'root' | 'ownSubdomain' | 'anySubdomain',
        readonly (string | Readonly<Record<string, readonly string[]>>)[]
      >
    >
    readonly inheritParentImportRules?: false
  },
) {
  return {
    id,
    name,
    ...(parentId === undefined ? {} : { parentId }),
    ...(importRules === undefined ? {} : { importRules }),
  }
}
