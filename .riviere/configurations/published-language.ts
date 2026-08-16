import {
  location,
  locationConfiguration,
} from '@living-architecture/riviere-role-enforcement-domain-model'
import type { RoleName } from '../roles'

const publishedLanguageRoles: RoleName[] = [
  'published-language-annotation',
  'published-language-schema',
  'published-language-data-structure',
  'published-language-union',
  'published-language-parser',
  'published-language-field-name',
  'domain-error',
  'value-object',
]

export const publishedLanguage = {
  locations: locationConfiguration<RoleName>(
    location('/published-language', publishedLanguageRoles, {
      'eslint-plugin': { roleEnforcement: false },
      importRules: { allow: {} },
    }),
  ),
}
