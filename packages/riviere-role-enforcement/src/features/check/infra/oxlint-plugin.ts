import path from 'node:path'
import { eslintCompatPlugin } from '@oxlint/plugins'
import { checkTargetSymbol } from '../domain/check-role-target'
import { RoleEnforcementConfigError } from '../../../platform/domain/role-enforcement-config-error'
import type { CompiledRoleEnforcementConfig } from '../../../platform/domain/role-enforcement-config'
import { loadRoleEnforcementConfig } from '../../../platform/infra/load-role-enforcement-config'
import { normalizePath } from '../../../platform/infra/path-patterns'
import {
  extractRoleTargets, isProgramNode, type BaseNode 
} from './role-target-extraction'

interface RoleRuleOptions {configPath?: string}

function getRuleOptions(context: { options?: readonly unknown[] }): RoleRuleOptions {
  const [firstOption] = context.options ?? []

  if (typeof firstOption !== 'object' || firstOption === null) {
    return {}
  }

  if ('configPath' in firstOption && typeof firstOption.configPath === 'string') {
    return { configPath: firstOption.configPath }
  }

  return {}
}

function getFilename(context: {
  filename?: string;
  getFilename?: () => string 
}): string {
  if (typeof context.getFilename === 'function') {
    return context.getFilename()
  }

  return context.filename ?? '<unknown>'
}

function shouldInspectFile(filename: string): boolean {
  return filename.endsWith('.ts') || filename.endsWith('.tsx')
}

function loadCompiledConfig(configPath: string): {
  config: CompiledRoleEnforcementConfig | null
  error: RoleEnforcementConfigError | null
} {
  try {
    return {
      config: loadRoleEnforcementConfig(configPath),
      error: null,
    }
  } catch (error) {
    return {
      config: null,
      error:
        error instanceof RoleEnforcementConfigError
          ? error
          : new RoleEnforcementConfigError('Unknown role enforcement config error'),
    }
  }
}

const plugin = eslintCompatPlugin({
  meta: { name: 'riviere-role' },
  rules: {
    'enforce-role-definitions': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Enforce repository role definitions for explicitly annotated exported classes and functions',
        },
        schema: [
          {
            type: 'object',
            properties: { configPath: { type: 'string' } },
            additionalProperties: false,
          },
        ],
      },
      create(context) {
        const options = getRuleOptions(context)

        return {
          Program(node: BaseNode) {
            if (!isProgramNode(node)) {
              return
            }

            const filename = getFilename(context)

            if (!shouldInspectFile(filename)) {
              return
            }

            const configPath = options.configPath ?? './riviere-role-enforcement.yaml'
            const configResult = loadCompiledConfig(configPath)
            const config = configResult.config

            if (config === null) {
              if (configResult.error !== null) {
                context.report({
                  node,
                  message: `Role enforcement config error: ${configResult.error.message}`,
                })
              }
              return
            }

            const relativeFilePath = normalizePath(path.relative(process.cwd(), filename))
            const extractionResult = extractRoleTargets(node, context.sourceCode, relativeFilePath)

            for (const issue of extractionResult.issues) {
              context.report({
                node: issue.reportNode,
                message: issue.message,
              })
            }

            for (const target of extractionResult.targets) {
              const violations = checkTargetSymbol(target, config)

              for (const violation of violations) {
                context.report({
                  node: target.reportNode,
                  message: violation.message,
                })
              }
            }
          },
        }
      },
    },
  },
})

export default plugin
