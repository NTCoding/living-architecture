export const VALID_COMPONENT_TYPES = ['UI', 'API', 'UseCase', 'DomainOp', 'Event', 'EventHandler', 'Custom'] as const;
export type ComponentTypeFlag = (typeof VALID_COMPONENT_TYPES)[number];

export function isValidComponentType(value: string): value is ComponentTypeFlag {
  return VALID_COMPONENT_TYPES.some((t) => t.toLowerCase() === value.toLowerCase());
}

export function normalizeComponentType(value: string): string {
  const typeMap: Record<string, string> = {
    ui: 'ui',
    api: 'api',
    usecase: 'usecase',
    domainop: 'domainop',
    event: 'event',
    eventhandler: 'eventhandler',
    custom: 'custom',
  };
  const normalized = typeMap[value.toLowerCase()];
  if (normalized === undefined) {
    throw new Error(`Invalid component type: ${value}. Valid types: ${Object.keys(typeMap).join(', ')}`);
  }
  return normalized;
}

export const VALID_LINK_TYPES = ['sync', 'async'] as const;
export type LinkType = (typeof VALID_LINK_TYPES)[number];

export function isValidLinkType(value: string): value is LinkType {
  return VALID_LINK_TYPES.some((t) => t === value);
}
