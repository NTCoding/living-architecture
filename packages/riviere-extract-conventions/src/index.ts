export {
  // Container decorators
  DomainOpContainer,
  APIContainer,
  EventHandlerContainer,
  EventPublisherContainer,
  // Class-as-component decorators
  UseCase,
  Event,
  UI,
  // Method-level decorators
  DomainOp,
  APIEndpoint,
  EventHandler,
  // Other decorators
  Custom,
  Ignore,
  // Utilities
  getCustomType,
} from './decorators'

// Component definition interfaces
export type {
  HttpMethod,
  APIControllerDef,
  EventDef,
  EventHandlerDef,
  IEventHandler,
  UIPageDef,
  DomainOpContainerDef,
  EventPublisherDef,
} from './component-contracts'
