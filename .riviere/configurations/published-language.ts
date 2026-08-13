import { location, locationConfiguration } from '@living-architecture/riviere-role-enforcement'
import type { RoleName } from '../roles'
import { publishedLanguageRoles } from './location-roles'

export const publishedLanguage = {
  packages: [
    'packages/riviere-extract-config',
    'packages/riviere-extract-conventions',
    'packages/riviere-schema',
  ],
  locations: locationConfiguration(
    location<RoleName>('/published-language', [...publishedLanguageRoles, 'value-object'], {
      dependencyRules: { locations: [] },
    }),
    location<RoleName>('/eslint', []),
  ),
}
