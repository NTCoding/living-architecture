import { location, locationConfiguration } from '@living-architecture/riviere-role-enforcement'
import type { RoleName } from '../roles'

// #region Roles
const publishedLanguageRoles: RoleName[] = [
  'published-language-annotation',
  'published-language-schema',
  'published-language-data-structure',
  'published-language-union',
  'published-language-parser',
  'published-language-field-name',
  'value-object',
]
// #endregion

export const publishedLanguage = {
  locations: locationConfiguration<RoleName>(
    location('/published-language', publishedLanguageRoles, {
      'eslint-plugin': { roleEnforcement: false },
      importRules: { allow: {} },
    }),
  ),
}
