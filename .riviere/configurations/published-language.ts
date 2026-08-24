import {
  location,
  locationConfiguration,
} from '@living-architecture/riviere-role-enforcement-domain-model'
import { publishedLanguageRoles, type RoleName } from '../roles'

export const publishedLanguage = {
  locations: locationConfiguration<RoleName>(
    location('/published-language', publishedLanguageRoles, {
      'eslint-plugin': { roleEnforcement: false },
      importRules: { allow: {} },
    }),
  ),
  packageManifest: {
    requiredNonEmptyStringProperties: ['description'],
  },
}
