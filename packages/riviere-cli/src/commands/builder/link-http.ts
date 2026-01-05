import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import { ComponentId } from '@living-architecture/riviere-builder';
import { RiviereQuery } from '@living-architecture/riviere-query';
import type {
  Component, HttpMethod, RiviereGraph 
} from '@living-architecture/riviere-schema';
import {
  getDefaultGraphPathDescription, resolveGraphPath 
} from '../../graph-path';
import { fileExists } from '../../file-existence';
import {
  formatError, formatSuccess 
} from '../../output';
import { CliErrorCode } from '../../error-codes';
import {
  isValidLinkType, normalizeComponentType 
} from '../../component-types';
import {
  isValidHttpMethod,
  validateComponentType,
  validateHttpMethod,
  validateLinkType,
} from '../../validation';
import {
  loadGraphBuilder, reportGraphNotFound 
} from './link-infrastructure';

interface ApiComponent {
  id: string;
  type: 'API';
  name: string;
  domain: string;
  path: string;
  httpMethod: HttpMethod;
}

function isRestApiWithPath(component: Component): component is Component & ApiComponent {
  return component.type === 'API' && 'path' in component && 'httpMethod' in component;
}

function findApisByPath(graph: RiviereGraph, path: string, method?: HttpMethod): ApiComponent[] {
  const query = new RiviereQuery(graph);
  const allComponents = query.componentsByType('API');
  const apis = allComponents.filter(isRestApiWithPath);
  const matchingPath = apis.filter((api) => api.path === path);

  if (method) {
    return matchingPath.filter((api) => api.httpMethod === method);
  }

  return matchingPath;
}

function getAllApiPaths(graph: RiviereGraph): string[] {
  const query = new RiviereQuery(graph);
  const allComponents = query.componentsByType('API');
  const apis = allComponents.filter(isRestApiWithPath);
  return [...new Set(apis.map((api) => api.path))];
}

interface LinkHttpOptions {
  path: string;
  toDomain: string;
  toModule: string;
  toType: string;
  toName: string;
  method?: string;
  linkType?: string;
  graph?: string;
  json?: boolean;
}

function reportNoApiFoundForPath(path: string, availablePaths: string[]): void {
  console.log(
    JSON.stringify(
      formatError(
        CliErrorCode.ComponentNotFound,
        `No API found with path '${path}'`,
        availablePaths.length > 0 ? [`Available paths: ${availablePaths.join(', ')}`] : [],
      ),
    ),
  );
}

function reportAmbiguousApiMatch(path: string, matchingApis: ApiComponent[]): void {
  const apiList = matchingApis.map((api) => `${api.id} (${api.httpMethod})`).join(', ');
  console.log(
    JSON.stringify(
      formatError(
        CliErrorCode.AmbiguousApiMatch,
        `Multiple APIs match path '${path}': ${apiList}`,
        ['Add --method flag to disambiguate'],
      ),
    ),
  );
}

function validateOptions(options: LinkHttpOptions): string | undefined {
  const componentTypeValidation = validateComponentType(options.toType);
  if (!componentTypeValidation.valid) {
    return componentTypeValidation.errorJson;
  }

  const httpMethodValidation = validateHttpMethod(options.method);
  if (!httpMethodValidation.valid) {
    return httpMethodValidation.errorJson;
  }

  const linkTypeValidation = validateLinkType(options.linkType);
  if (!linkTypeValidation.valid) {
    return linkTypeValidation.errorJson;
  }

  return undefined;
}

export function createLinkHttpCommand(): Command {
  return new Command('link-http')
    .description('Find an API by HTTP path and link to a target component')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere builder link-http \\
      --path "/orders" --method POST \\
      --to-domain orders --to-module checkout --to-type UseCase --to-name "place-order"

  $ riviere builder link-http \\
      --path "/users/{id}" --method GET \\
      --to-domain users --to-module queries --to-type UseCase --to-name "get-user" \\
      --link-type sync
`,
    )
    .requiredOption('--path <http-path>', 'HTTP path to match')
    .requiredOption('--to-domain <domain>', 'Target domain')
    .requiredOption('--to-module <module>', 'Target module')
    .requiredOption('--to-type <type>', 'Target component type')
    .requiredOption('--to-name <name>', 'Target component name')
    .option('--method <method>', 'Filter by HTTP method (GET, POST, PUT, PATCH, DELETE)')
    .option('--link-type <type>', 'Link type (sync, async)')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: LinkHttpOptions) => {
      const validationError = validateOptions(options);
      if (validationError) {
        console.log(validationError);
        return;
      }

      const graphPath = resolveGraphPath(options.graph);
      const graphExists = await fileExists(graphPath);

      if (!graphExists) {
        reportGraphNotFound(graphPath);
        return;
      }

      const builder = await loadGraphBuilder(graphPath);
      const graph = builder.build();

      const normalizedMethod = options.method?.toUpperCase();
      const httpMethod =
        normalizedMethod && isValidHttpMethod(normalizedMethod) ? normalizedMethod : undefined;
      const matchingApis = findApisByPath(graph, options.path, httpMethod);

      const [matchedApi, ...otherApis] = matchingApis;

      if (!matchedApi) {
        reportNoApiFoundForPath(options.path, getAllApiPaths(graph));
        return;
      }

      if (otherApis.length > 0) {
        reportAmbiguousApiMatch(options.path, matchingApis);
        return;
      }

      const targetId = ComponentId.create({
        domain: options.toDomain,
        module: options.toModule,
        type: normalizeComponentType(options.toType),
        name: options.toName,
      }).toString();

      const linkInput: {
        from: string;
        to: string;
        type?: 'sync' | 'async';
      } = {
        from: matchedApi.id,
        to: targetId,
      };

      if (options.linkType !== undefined && isValidLinkType(options.linkType)) {
        linkInput.type = options.linkType;
      }

      const link = builder.link(linkInput);

      await writeFile(graphPath, builder.serialize(), 'utf-8');

      if (options.json) {
        console.log(
          JSON.stringify(
            formatSuccess({
              link,
              matchedApi: {
                id: matchedApi.id,
                path: matchedApi.path,
                method: matchedApi.httpMethod,
              },
            }),
          ),
        );
      }
    });
}
