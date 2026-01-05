import type {
  Component,
  CustomTypeDefinition,
  DomainMetadata,
  ExternalLink,
  Link,
  RiviereGraph,
  SourceInfo,
} from '@living-architecture/riviere-schema';
import {
  RiviereQuery, type ValidationResult 
} from '@living-architecture/riviere-query';
import type {
  BuilderStats, BuilderWarning 
} from './types';

interface InspectionGraph {
  version: string;
  metadata: {
    name?: string;
    description?: string;
    generated?: string;
    sources: SourceInfo[];
    domains: Record<string, DomainMetadata>;
    customTypes: Record<string, CustomTypeDefinition>;
  };
  components: Component[];
  links: Link[];
  externalLinks: ExternalLink[];
}

/**
 * Finds components with no incoming or outgoing links.
 *
 * @param graph - The graph to inspect
 * @returns Array of orphaned component IDs
 *
 * @example
 * ```typescript
 * const orphans = findOrphans(graph)
 * // ['orders:checkout:api:unused-endpoint']
 * ```
 */
export function findOrphans(graph: InspectionGraph): string[] {
  const connectedIds = new Set<string>();

  for (const link of graph.links) {
    connectedIds.add(link.source);
    connectedIds.add(link.target);
  }

  for (const externalLink of graph.externalLinks) {
    connectedIds.add(externalLink.source);
  }

  return graph.components.filter((c) => !connectedIds.has(c.id)).map((c) => c.id);
}

/**
 * Calculates statistics about the graph.
 *
 * @param graph - The graph to analyze
 * @returns Object with component counts, link counts, and domain count
 *
 * @example
 * ```typescript
 * const stats = calculateStats(graph)
 * // { componentCount: 10, linkCount: 8, domainCount: 2, ... }
 * ```
 */
export function calculateStats(graph: InspectionGraph): BuilderStats {
  const components = graph.components;
  return {
    componentCount: components.length,
    componentsByType: {
      UI: components.filter((c) => c.type === 'UI').length,
      API: components.filter((c) => c.type === 'API').length,
      UseCase: components.filter((c) => c.type === 'UseCase').length,
      DomainOp: components.filter((c) => c.type === 'DomainOp').length,
      Event: components.filter((c) => c.type === 'Event').length,
      EventHandler: components.filter((c) => c.type === 'EventHandler').length,
      Custom: components.filter((c) => c.type === 'Custom').length,
    },
    linkCount: graph.links.length,
    externalLinkCount: graph.externalLinks.length,
    domainCount: Object.keys(graph.metadata.domains).length,
  };
}

/**
 * Finds non-fatal issues in the graph.
 *
 * Detects orphaned components and unused domains.
 *
 * @param graph - The graph to inspect
 * @returns Array of warning objects
 *
 * @example
 * ```typescript
 * const warnings = findWarnings(graph)
 * // [{ code: 'ORPHAN_COMPONENT', message: '...', componentId: '...' }]
 * ```
 */
export function findWarnings(graph: InspectionGraph): BuilderWarning[] {
  const warnings: BuilderWarning[] = [];

  for (const id of findOrphans(graph)) {
    warnings.push({
      code: 'ORPHAN_COMPONENT',
      message: `Component '${id}' has no incoming or outgoing links`,
      componentId: id,
    });
  }

  const usedDomains = new Set(graph.components.map((c) => c.domain));
  for (const domain of Object.keys(graph.metadata.domains)) {
    if (!usedDomains.has(domain)) {
      warnings.push({
        code: 'UNUSED_DOMAIN',
        message: `Domain '${domain}' is declared but has no components`,
        domainName: domain,
      });
    }
  }

  return warnings;
}

/**
 * Converts builder internal graph to schema-compliant RiviereGraph.
 *
 * Removes undefined optional fields and ensures proper structure.
 *
 * @param graph - The internal builder graph
 * @returns Schema-compliant RiviereGraph
 *
 * @example
 * ```typescript
 * const output = toRiviereGraph(builderGraph)
 * JSON.stringify(output) // Valid Rivière JSON
 * ```
 */
export function toRiviereGraph(graph: InspectionGraph): RiviereGraph {
  const hasCustomTypes = Object.keys(graph.metadata.customTypes).length > 0;
  const hasExternalLinks = graph.externalLinks.length > 0;

  return {
    version: graph.version,
    metadata: {
      ...(graph.metadata.name !== undefined && { name: graph.metadata.name }),
      ...(graph.metadata.description !== undefined && { description: graph.metadata.description }),
      sources: graph.metadata.sources,
      domains: graph.metadata.domains,
      ...(hasCustomTypes && { customTypes: graph.metadata.customTypes }),
    },
    components: graph.components,
    links: graph.links,
    ...(hasExternalLinks && { externalLinks: graph.externalLinks }),
  };
}

/**
 * Validates the graph against the Rivière schema.
 *
 * @param graph - The graph to validate
 * @returns Validation result with valid flag and any errors
 *
 * @example
 * ```typescript
 * const result = validateGraph(graph)
 * if (!result.valid) {
 *   console.error(result.errors)
 * }
 * ```
 */
export function validateGraph(graph: InspectionGraph): ValidationResult {
  return new RiviereQuery(toRiviereGraph(graph)).validate();
}
