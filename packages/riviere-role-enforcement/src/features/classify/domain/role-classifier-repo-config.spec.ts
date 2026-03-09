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
        'domain-service',
        config,
        ['Implement domain behavior that does not belong on a single entity.'],
        'Use the domain-service role.',
      ),
    ).toMatchObject({
      role: 'domain-service',
      markdownSpec: 'docs/architecture/roles/domain-service.md',
    })
  })
})
