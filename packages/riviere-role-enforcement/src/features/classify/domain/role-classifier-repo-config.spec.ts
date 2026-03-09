import { fileURLToPath } from 'node:url'
import { findRoleClassifierResult } from './role-classifier-result'
import { loadRoleEnforcementConfig } from '../../../platform/infra/load-role-enforcement-config'

describe('role classifier repository config', () => {
  it('resolves new Phase 3 catalog roles from the repository config', () => {
    const config = loadRoleEnforcementConfig(
      fileURLToPath(new URL('../../../../../../riviere-role-enforcement.yaml', import.meta.url)),
    )

    expect(
      findRoleClassifierResult(
        'role-config-loader',
        config,
        ['Load repository role config from YAML.'],
        'Use the repository config loader role.',
      ),
    ).toMatchObject({
      role: 'role-config-loader',
      markdownSpec: 'docs/roles/role-config-loader.md',
    })
    expect(
      findRoleClassifierResult(
        'component-extractor',
        config,
        ['Extract components from TypeScript source files.'],
        'Use the component extractor role.',
      ),
    ).toMatchObject({
      role: 'component-extractor',
      markdownSpec: 'docs/roles/component-extractor.md',
    })
  })
})
