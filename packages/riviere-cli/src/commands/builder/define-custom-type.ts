import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import type {
  CustomPropertyDefinition,
  CustomPropertyType,
} from '@living-architecture/riviere-schema';
import { getDefaultGraphPathDescription } from '../../graph-path';
import { withGraphBuilder } from './link-infrastructure';
import {
  formatError, formatSuccess 
} from '../../output';
import { CliErrorCode } from '../../error-codes';

const VALID_PROPERTY_TYPES: readonly CustomPropertyType[] = [
  'string',
  'number',
  'boolean',
  'array',
  'object',
];

function isValidPropertyType(value: string): value is CustomPropertyType {
  return VALID_PROPERTY_TYPES.some((t) => t === value);
}

interface DefineCustomTypeOptions {
  name: string;
  description?: string;
  requiredProperty?: string[];
  optionalProperty?: string[];
  graph?: string;
  json?: boolean;
}

function parsePropertySpec(
  spec: string,
): {
  name: string;
  definition: CustomPropertyDefinition 
} | { error: string } {
  const parts = spec.split(':');
  if (parts.length < 2 || parts.length > 3) {
    return {error: `Invalid property format: "${spec}". Expected "name:type" or "name:type:description"`,};
  }

  const [name, type, description] = parts;
  if (!name || name.trim() === '') {
    return { error: 'Property name cannot be empty' };
  }

  if (!type || !isValidPropertyType(type)) {
    return {error: `Invalid property type: "${type}". Valid types: ${VALID_PROPERTY_TYPES.join(', ')}`,};
  }

  const definition: CustomPropertyDefinition = { type };
  if (description && description.trim() !== '') {
    definition.description = description;
  }

  return {
    name: name.trim(),
    definition 
  };
}

interface ParsePropertiesSuccess {
  success: true;
  properties: Record<string, CustomPropertyDefinition>;
}

interface ParsePropertiesError {
  success: false;
  error: string;
}

type ParsePropertiesResult = ParsePropertiesSuccess | ParsePropertiesError;

function parsePropertySpecs(
  specs: string[] | undefined,
): ParsePropertiesResult {
  if (specs === undefined || specs.length === 0) {
    return {
      success: true,
      properties: {} 
    };
  }

  const properties: Record<string, CustomPropertyDefinition> = {};
  for (const spec of specs) {
    const result = parsePropertySpec(spec);
    if ('error' in result) {
      return {
        success: false,
        error: result.error 
      };
    }
    if (properties[result.name] !== undefined) {
      return {
        success: false,
        error: `Duplicate property name: "${result.name}"`,
      };
    }
    properties[result.name] = result.definition;
  }

  return {
    success: true,
    properties 
  };
}

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

export function createDefineCustomTypeCommand(): Command {
  return new Command('define-custom-type')
    .description('Define a custom component type')
    .requiredOption('--name <name>', 'Custom type name')
    .option('--description <desc>', 'Custom type description')
    .option(
      '--required-property <spec>',
      'Required property (format: name:type[:description])',
      collect,
      [],
    )
    .option(
      '--optional-property <spec>',
      'Optional property (format: name:type[:description])',
      collect,
      [],
    )
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: DefineCustomTypeOptions) => {
      const requiredResult = parsePropertySpecs(options.requiredProperty);
      if (!requiredResult.success) {
        console.log(
          JSON.stringify(
            formatError(CliErrorCode.ValidationError, requiredResult.error, []),
          ),
        );
        return;
      }

      const optionalResult = parsePropertySpecs(options.optionalProperty);
      if (!optionalResult.success) {
        console.log(
          JSON.stringify(
            formatError(CliErrorCode.ValidationError, optionalResult.error, []),
          ),
        );
        return;
      }

      await withGraphBuilder(options.graph, async (builder, graphPath) => {
        builder.defineCustomType({
          name: options.name,
          ...(options.description !== undefined && {description: options.description,}),
          ...(Object.keys(requiredResult.properties).length > 0 && {requiredProperties: requiredResult.properties,}),
          ...(Object.keys(optionalResult.properties).length > 0 && {optionalProperties: optionalResult.properties,}),
        });
        await writeFile(graphPath, builder.serialize(), 'utf-8');

        if (options.json === true) {
          console.log(
            JSON.stringify(
              formatSuccess({
                name: options.name,
                ...(options.description !== undefined && {description: options.description,}),
                ...(Object.keys(requiredResult.properties).length > 0 && {requiredProperties: requiredResult.properties,}),
                ...(Object.keys(optionalResult.properties).length > 0 && {optionalProperties: optionalResult.properties,}),
              }),
            ),
          );
        }
      });
    });
}
