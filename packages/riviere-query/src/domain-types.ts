import type {
  Component,
  Link,
  ExternalLink,
} from '@living-architecture/riviere-schema';
import { z } from 'zod';

/** @internal */
const componentIdSchema = z.string().brand<'ComponentId'>();
/** @internal */
const linkIdSchema = z.string().brand<'LinkId'>();
/** @internal */
const entityNameSchema = z.string().brand<'EntityName'>();
/** @internal */
const domainNameSchema = z.string().brand<'DomainName'>();
/** @internal */
const stateSchema = z.string().brand<'State'>();
/** @internal */
const operationNameSchema = z.string().brand<'OperationName'>();
/** @internal */
const eventIdSchema = z.string().brand<'EventId'>();
/** @internal */
const eventNameSchema = z.string().brand<'EventName'>();
/** @internal */
const handlerIdSchema = z.string().brand<'HandlerId'>();
/** @internal */
const handlerNameSchema = z.string().brand<'HandlerName'>();

/** Branded type for component identifiers. */
export type ComponentId = z.infer<typeof componentIdSchema>;

/** Branded type for link identifiers. */
export type LinkId = z.infer<typeof linkIdSchema>;

/** Branded type for entity names. */
export type EntityName = z.infer<typeof entityNameSchema>;

/** Branded type for domain names. */
export type DomainName = z.infer<typeof domainNameSchema>;

/** Branded type for state names in entity state machines. */
export type State = z.infer<typeof stateSchema>;

/** Branded type for operation names. */
export type OperationName = z.infer<typeof operationNameSchema>;

/** Branded type for event identifiers. */
export type EventId = z.infer<typeof eventIdSchema>;

/** Branded type for event names. */
export type EventName = z.infer<typeof eventNameSchema>;

/** Branded type for event handler identifiers. */
export type HandlerId = z.infer<typeof handlerIdSchema>;

/** Branded type for event handler names. */
export type HandlerName = z.infer<typeof handlerNameSchema>;

/** Error codes for graph validation failures. */
export type ValidationErrorCode =
  | 'INVALID_LINK_SOURCE'
  | 'INVALID_LINK_TARGET'
  | 'INVALID_TYPE';

/**
 * A validation error found in the graph.
 */
export interface ValidationError {
  /** JSON path to the error location. */
  path: string;
  /** Human-readable error description. */
  message: string;
  /** Machine-readable error code. */
  code: ValidationErrorCode;
}

/**
 * Result of graph validation.
 */
export interface ValidationResult {
  /** Whether the graph passed validation. */
  valid: boolean;
  /** List of validation errors (empty if valid). */
  errors: ValidationError[];
}

/**
 * Component counts by type within a domain.
 */
export interface ComponentCounts {
  /** Number of UI components. */
  UI: number;
  /** Number of API components. */
  API: number;
  /** Number of UseCase components. */
  UseCase: number;
  /** Number of DomainOp components. */
  DomainOp: number;
  /** Number of Event components. */
  Event: number;
  /** Number of EventHandler components. */
  EventHandler: number;
  /** Number of Custom components. */
  Custom: number;
  /** Total number of components. */
  total: number;
}

/**
 * Domain information with metadata and component counts.
 */
export interface Domain {
  /** Domain name. */
  name: string;
  /** Domain description from graph metadata. */
  description: string;
  /** System type classification. */
  systemType: 'domain' | 'bff' | 'ui' | 'other';
  /** Counts of components by type. */
  componentCounts: ComponentCounts;
}

/**
 * A component that was modified between graph versions.
 */
export interface ComponentModification {
  /** The component ID. */
  id: ComponentId;
  /** The component state before modification. */
  before: Component;
  /** The component state after modification. */
  after: Component;
  /** List of field names that changed. */
  changedFields: string[];
}

/**
 * Summary statistics of differences between graphs.
 */
export interface DiffStats {
  /** Number of components added. */
  componentsAdded: number;
  /** Number of components removed. */
  componentsRemoved: number;
  /** Number of components modified. */
  componentsModified: number;
  /** Number of links added. */
  linksAdded: number;
  /** Number of links removed. */
  linksRemoved: number;
}

/**
 * Complete diff between two graph versions.
 */
export interface GraphDiff {
  /** Component changes. */
  components: {
    /** Components present in new graph but not old. */
    added: Component[];
    /** Components present in old graph but not new. */
    removed: Component[];
    /** Components present in both with different values. */
    modified: ComponentModification[];
  };
  /** Link changes. */
  links: {
    /** Links present in new graph but not old. */
    added: Link[];
    /** Links present in old graph but not new. */
    removed: Link[];
  };
  /** Summary statistics. */
  stats: DiffStats;
}

/** Type of link between components. */
export type LinkType = 'sync' | 'async';

/**
 * A step in an execution flow.
 */
export interface FlowStep {
  /** The component at this step. */
  component: Component;
  /** Type of link leading to this step (undefined for entry point). */
  linkType: LinkType | undefined;
  /** Depth from entry point (0 = entry point). */
  depth: number;
  /** External links from this component to external systems. */
  externalLinks: ExternalLink[];
}

/**
 * An execution flow from entry point through the graph.
 */
export interface Flow {
  /** The entry point component. */
  entryPoint: Component;
  /** Steps in the flow including entry point. */
  steps: FlowStep[];
}

/**
 * Result of searchWithFlow containing matches and their flow context.
 */
export interface SearchWithFlowResult {
  /** IDs of components that matched the search. */
  matchingIds: ComponentId[];
  /** IDs of all components visible in the matching flows. */
  visibleIds: ComponentId[];
}

/**
 * A link that crosses domain boundaries.
 */
export interface CrossDomainLink {
  /** The target domain name. */
  targetDomain: DomainName;
  /** Type of the cross-domain link. */
  linkType: LinkType | undefined;
}

/**
 * Summary of connections between domains.
 */
export interface DomainConnection {
  /** The connected domain name. */
  targetDomain: DomainName;
  /** Direction relative to the queried domain. */
  direction: 'outgoing' | 'incoming';
  /** Number of API-based connections. */
  apiCount: number;
  /** Number of event-based connections. */
  eventCount: number;
}

/**
 * Aggregate statistics about a graph.
 */
export interface GraphStats {
  /** Total number of components. */
  componentCount: number;
  /** Total number of links. */
  linkCount: number;
  /** Number of domains. */
  domainCount: number;
  /** Number of API components. */
  apiCount: number;
  /** Number of unique entities. */
  entityCount: number;
  /** Number of Event components. */
  eventCount: number;
}

/**
 * An external domain that components connect to.
 *
 * External domains are any systems not represented in the graph—third-party
 * services (Stripe, Twilio) or internal domains outside the current scope.
 */
export interface ExternalDomain {
  /** Name of the external domain (e.g., "Stripe", "Twilio"). */
  name: string;
  /** Domains that have connections to this external domain. */
  sourceDomains: DomainName[];
  /** Total number of connections to this external domain. */
  connectionCount: number;
}

/**
 * Parses a string as a ComponentId.
 *
 * @param id - The string to parse
 * @returns A branded ComponentId
 */
export function parseComponentId(id: string): ComponentId {
  return componentIdSchema.parse(id);
}

/**
 * Parses a string as a LinkId.
 *
 * @param id - The string to parse
 * @returns A branded LinkId
 */
export function parseLinkId(id: string): LinkId {
  return linkIdSchema.parse(id);
}

/**
 * Parses a string as an EntityName.
 *
 * @param value - The string to parse
 * @returns A branded EntityName
 */
export function parseEntityName(value: string): EntityName {
  return entityNameSchema.parse(value);
}

/**
 * Parses a string as a DomainName.
 *
 * @param value - The string to parse
 * @returns A branded DomainName
 */
export function parseDomainName(value: string): DomainName {
  return domainNameSchema.parse(value);
}

/**
 * Parses a string as a State.
 *
 * @param value - The string to parse
 * @returns A branded State
 */
export function parseState(value: string): State {
  return stateSchema.parse(value);
}

/**
 * Parses a string as an OperationName.
 *
 * @param value - The string to parse
 * @returns A branded OperationName
 */
export function parseOperationName(value: string): OperationName {
  return operationNameSchema.parse(value);
}

/**
 * Parses a string as an EventId.
 *
 * @param value - The string to parse
 * @returns A branded EventId
 */
export function parseEventId(value: string): EventId {
  return eventIdSchema.parse(value);
}

/**
 * Parses a string as an EventName.
 *
 * @param value - The string to parse
 * @returns A branded EventName
 */
export function parseEventName(value: string): EventName {
  return eventNameSchema.parse(value);
}

/**
 * Parses a string as a HandlerId.
 *
 * @param value - The string to parse
 * @returns A branded HandlerId
 */
export function parseHandlerId(value: string): HandlerId {
  return handlerIdSchema.parse(value);
}

/**
 * Parses a string as a HandlerName.
 *
 * @param value - The string to parse
 * @returns A branded HandlerName
 */
export function parseHandlerName(value: string): HandlerName {
  return handlerNameSchema.parse(value);
}
