import type {
  ExtractionConfig, Module 
} from './types'

export function createModuleWithoutPath(): Omit<Module, 'path'> {
  return {
    api: { notUsed: true },
    useCase: { notUsed: true },
    domainOp: { notUsed: true },
    event: { notUsed: true },
    eventHandler: { notUsed: true },
    ui: { notUsed: true },
  }
}

export function createModuleWithoutApi(): Omit<Module, 'api'> {
  return {
    path: 'src/**',
    useCase: { notUsed: true },
    domainOp: { notUsed: true },
    event: { notUsed: true },
    eventHandler: { notUsed: true },
    ui: { notUsed: true },
  }
}

export function createMinimalModule(): Module {
  return {
    path: 'src/**',
    api: { notUsed: true },
    useCase: { notUsed: true },
    domainOp: { notUsed: true },
    event: { notUsed: true },
    eventHandler: { notUsed: true },
    ui: { notUsed: true },
  }
}

export function createMinimalConfig(): ExtractionConfig {
  return { modules: [createMinimalModule()] }
}

export function createMutableConfig(): {
  config: ExtractionConfig
  module: Module
} {
  const module = createMinimalModule()
  const config = { modules: [module] }
  return {
    config,
    module,
  }
}

export function createFullConfig(): ExtractionConfig {
  return {
    modules: [
      {
        path: 'orders/**',
        api: {
          find: 'methods',
          where: {
            hasDecorator: {
              name: ['Get', 'Post', 'Put', 'Delete'],
              from: '@nestjs/common',
            },
          },
        },
        useCase: {
          find: 'classes',
          where: { hasDecorator: { name: 'UseCase' } },
        },
        domainOp: {
          find: 'functions',
          where: { hasJSDoc: { tag: 'domainOp' } },
        },
        event: {
          find: 'classes',
          where: { extendsClass: { name: 'DomainEvent' } },
        },
        eventHandler: {
          find: 'classes',
          where: { implementsInterface: { name: 'EventHandler' } },
        },
        ui: { notUsed: true },
      },
    ],
  }
}
