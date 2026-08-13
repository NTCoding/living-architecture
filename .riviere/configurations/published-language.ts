import { location, locationConfiguration } from '@living-architecture/riviere-role-enforcement'
import type { RoleName } from '../roles'
import { publishedLanguageRoles } from './location-roles'

export const publishedLanguage = {
  packageType: 'published-language',
  locations: locationConfiguration<RoleName>(
    location('/published-language', publishedLanguageRoles, {
      'eslint-plugin': { roleEnforcement: false },
      importRules: { allow: {} },
    }),
  ),
}
