import { Command } from 'commander';
import { readFile, writeFile } from 'node:fs/promises';
import {
  CustomTypeNotFoundError,
  DomainNotFoundError,
  DuplicateComponentError,
  RiviereBuilder,
} from '@living-architecture/riviere-builder';
import type { SourceLocation } from '@living-architecture/riviere-schema';
import { parseRiviereGraph } from '@living-architecture/riviere-schema';
import { getDefaultGraphPathDescription, resolveGraphPath } from '../../graph-path';
import { fileExists } from '../../file-existence';
import { formatError, formatSuccess } from '../../output';
import { CliErrorCode } from '../../error-codes';
import {
  isValidComponentType,
  isValidApiType,
  VALID_COMPONENT_TYPES,
  type ComponentTypeFlag,
} from '../../component-types';
import { isValidHttpMethod } from '../../validation';

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

interface AddComponentOptions {
  type: string;
  name: string;
  domain: string;
  module: string;
  repository: string;
  filePath: string;
  route?: string;
  apiType?: string;
  httpMethod?: string;
  httpPath?: string;
  operationName?: string;
  entity?: string;
  eventName?: string;
  eventSchema?: string;
  subscribedEvents?: string;
  customType?: string;
  customProperty?: string[];
  description?: string;
  lineNumber?: string;
  graph?: string;
  json?: boolean;
}

interface CommonInput {
  name: string;
  domain: string;
  module: string;
  sourceLocation: SourceLocation;
  description?: string;
}

function parseCustomProperties(properties: string[] | undefined): Record<string, string> | undefined {
  if (!properties || properties.length === 0) {
    return undefined;
  }
  const metadata: Record<string, string> = {};
  for (const prop of properties) {
    const colonIndex = prop.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Invalid custom property format: ${prop}. Expected 'key:value'`);
    }
    const key = prop.slice(0, colonIndex);
    const value = prop.slice(colonIndex + 1);
    metadata[key] = value;
  }
  return metadata;
}

function addUIComponent(builder: RiviereBuilder, common: CommonInput, options: AddComponentOptions): string {
  if (!options.route) {
    throw new Error('--route is required for UI component');
  }
  const component = builder.addUI({ ...common, route: options.route });
  return component.id;
}

function addAPIComponent(builder: RiviereBuilder, common: CommonInput, options: AddComponentOptions): string {
  if (!options.apiType || !isValidApiType(options.apiType)) {
    throw new Error('--api-type is required for API component');
  }
  const input: Parameters<RiviereBuilder['addApi']>[0] = {
    ...common,
    apiType: options.apiType,
  };
  if (options.httpMethod && isValidHttpMethod(options.httpMethod)) {
    input.httpMethod = options.httpMethod;
  }
  if (options.httpPath) {
    input.path = options.httpPath;
  }
  const component = builder.addApi(input);
  return component.id;
}

function addUseCaseComponent(builder: RiviereBuilder, common: CommonInput): string {
  const component = builder.addUseCase(common);
  return component.id;
}

function addDomainOpComponent(builder: RiviereBuilder, common: CommonInput, options: AddComponentOptions): string {
  if (!options.operationName) {
    throw new Error('--operation-name is required for DomainOp component');
  }
  const input = { ...common, operationName: options.operationName };
  const component = options.entity
    ? builder.addDomainOp({ ...input, entity: options.entity })
    : builder.addDomainOp(input);
  return component.id;
}

function addEventComponent(builder: RiviereBuilder, common: CommonInput, options: AddComponentOptions): string {
  if (!options.eventName) {
    throw new Error('--event-name is required for Event component');
  }
  const component = builder.addEvent({
    ...common,
    eventName: options.eventName,
    ...(options.eventSchema !== undefined && { eventSchema: options.eventSchema }),
  });
  return component.id;
}

function addEventHandlerComponent(builder: RiviereBuilder, common: CommonInput, options: AddComponentOptions): string {
  if (!options.subscribedEvents) {
    throw new Error('--subscribed-events is required for EventHandler component');
  }
  const component = builder.addEventHandler({
    ...common,
    subscribedEvents: options.subscribedEvents
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0),
  });
  return component.id;
}

type ComponentAdder = (builder: RiviereBuilder, common: CommonInput, options: AddComponentOptions) => string;

const componentAdders: Record<ComponentTypeFlag, ComponentAdder> = {
  UI: addUIComponent,
  API: addAPIComponent,
  UseCase: addUseCaseComponent,
  DomainOp: addDomainOpComponent,
  Event: addEventComponent,
  EventHandler: addEventHandlerComponent,
  Custom: (builder, common, options) => {
    if (!options.customType) {
      throw new Error('--custom-type is required for Custom component');
    }
    const metadata = parseCustomProperties(options.customProperty);
    const input = { ...common, customTypeName: options.customType, ...(metadata !== undefined && { metadata }) };
    const component = builder.addCustom(input);
    return component.id;
  },
};

function addComponentToBuilder(
  builder: RiviereBuilder,
  componentType: ComponentTypeFlag,
  options: AddComponentOptions,
  sourceLocation: SourceLocation
): string {
  const commonInput: CommonInput = {
    name: options.name,
    domain: options.domain,
    module: options.module,
    sourceLocation,
    ...(options.description ? { description: options.description } : {}),
  };

  const adder = componentAdders[componentType];
  return adder(builder, commonInput, options);
}

function tryAddComponent(
  builder: RiviereBuilder,
  componentType: ComponentTypeFlag,
  options: AddComponentOptions,
  sourceLocation: SourceLocation
): string | undefined {
  try {
    return addComponentToBuilder(builder, componentType, options, sourceLocation);
  } catch (error) {
    if (error instanceof DomainNotFoundError) {
      console.log(
        JSON.stringify(
          formatError(CliErrorCode.DomainNotFound, error.message, ['Run riviere builder add-domain first'])
        )
      );
      return undefined;
    }
    if (error instanceof CustomTypeNotFoundError) {
      console.log(
        JSON.stringify(
          formatError(CliErrorCode.CustomTypeNotFound, error.message, [
            'Run riviere builder add-custom-type first',
          ])
        )
      );
      return undefined;
    }
    if (error instanceof DuplicateComponentError) {
      console.log(JSON.stringify(formatError(CliErrorCode.DuplicateComponent, error.message, [])));
      return undefined;
    }
    const message = getErrorMessage(error);
    console.log(JSON.stringify(formatError(CliErrorCode.ValidationError, message, [])));
    return undefined;
  }
}

export function createAddComponentCommand(): Command {
  return new Command('add-component')
    .description('Add a component to the graph')
    .addHelpText(
      'after',
      `
Examples:
  # Add an API endpoint
  $ riviere builder add-component --type API --name "place-order" \\
      --domain orders --module api --repository ecommerce \\
      --file-path src/api/orders.ts --api-type REST \\
      --http-method POST --http-path /orders

  # Add a UseCase
  $ riviere builder add-component --type UseCase --name "place-order" \\
      --domain orders --module checkout --repository ecommerce \\
      --file-path src/usecases/PlaceOrder.ts

  # Add a DomainOp
  $ riviere builder add-component --type DomainOp --name "order-begin" \\
      --domain orders --module domain --repository ecommerce \\
      --file-path src/domain/Order.ts --entity Order --operation-name begin

  # Add an Event
  $ riviere builder add-component --type Event --name "order-placed" \\
      --domain orders --module events --repository ecommerce \\
      --file-path src/events/OrderPlaced.ts --event-name "order-placed" \\
      --event-schema "{ orderId: string, total: number }"
`
    )
    .requiredOption('--type <type>', 'Component type (UI, API, UseCase, DomainOp, Event, EventHandler, Custom)')
    .requiredOption('--name <name>', 'Component name')
    .requiredOption('--domain <domain>', 'Domain name')
    .requiredOption('--module <module>', 'Module name')
    .requiredOption('--repository <url>', 'Source repository URL')
    .requiredOption('--file-path <path>', 'Source file path')
    .option('--route <route>', 'UI route path')
    .option('--api-type <type>', 'API type (REST, GraphQL, other)')
    .option('--http-method <method>', 'HTTP method')
    .option('--http-path <path>', 'HTTP endpoint path')
    .option('--operation-name <name>', 'Operation name (DomainOp)')
    .option('--entity <entity>', 'Entity name (DomainOp)')
    .option('--event-name <name>', 'Event name')
    .option('--event-schema <schema>', 'Event schema definition')
    .option('--subscribed-events <events>', 'Comma-separated subscribed event names')
    .option('--custom-type <name>', 'Custom type name')
    .option('--custom-property <key:value>', 'Custom property (repeatable)', (val, acc: string[]) => [...acc, val], [])
    .option('--description <desc>', 'Component description')
    .option('--line-number <n>', 'Source line number')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: AddComponentOptions) => {
      if (!isValidComponentType(options.type)) {
        console.log(
          JSON.stringify(
            formatError(CliErrorCode.ValidationError, `Invalid component type: ${options.type}`, [
              `Valid types: ${VALID_COMPONENT_TYPES.join(', ')}`,
            ])
          )
        );
        return;
      }
      const componentType = options.type;

      const graphPath = resolveGraphPath(options.graph);
      const graphExists = await fileExists(graphPath);

      if (!graphExists) {
        console.log(
          JSON.stringify(
            formatError(CliErrorCode.GraphNotFound, `Graph not found at ${graphPath}`, [
              'Run riviere builder init first',
            ])
          )
        );
        return;
      }

      const content = await readFile(graphPath, 'utf-8');
      const parsed: unknown = JSON.parse(content);
      const graph = parseRiviereGraph(parsed);
      const builder = RiviereBuilder.resume(graph);

      const sourceLocation: SourceLocation = {
        repository: options.repository,
        filePath: options.filePath,
        ...(options.lineNumber ? { lineNumber: parseInt(options.lineNumber, 10) } : {}),
      };

      const componentId = tryAddComponent(builder, componentType, options, sourceLocation);

      if (componentId === undefined) {
        return;
      }

      await writeFile(graphPath, builder.serialize(), 'utf-8');

      if (options.json) {
        console.log(JSON.stringify(formatSuccess({ componentId })));
      }
    });
}
