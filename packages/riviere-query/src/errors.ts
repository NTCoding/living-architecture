export class ComponentNotFoundError extends Error {
  readonly componentId: string;
  readonly suggestions: string[];

  constructor(componentId: string, suggestions: string[] = []) {
    super(`Component '${componentId}' not found`);
    this.name = 'ComponentNotFoundError';
    this.componentId = componentId;
    this.suggestions = suggestions;
  }
}
