const requireComponentDecorator = require('./require-component-decorator.cjs')
const apiControllerRequiresRouteAndMethod = require('./api-controller-requires-route-and-method.cjs')
const eventRequiresTypeProperty = require('./event-requires-type-property.cjs')
const eventHandlerRequiresSubscribedEvents = require('./event-handler-requires-subscribed-events.cjs')
const uiPageRequiresRoute = require('./ui-page-requires-route.cjs')
const eventPublisherMethodSignature = require('./event-publisher-method-signature.cjs')
const httpClientRequiresRemoteName = require('./http-client-requires-remote-name.cjs')
const httpCallRequiresRoute = require('./http-call-requires-route.cjs')
const httpCallRequiresHttpClientContainer = require('./http-call-requires-http-client-container.cjs')
const httpClientPublicMethodsRequireHttpCall = require('./http-client-public-methods-require-http-call.cjs')
const noFetchOutsideHttpClient = require('./no-fetch-outside-http-client.cjs')

const restrictedHttpClientImports = [
  'axios',
  'got',
  'node-fetch',
  'undici',
  'superagent',
  'node:http',
  'node:https',
]

function toRestrictedImportPath(packageName) {
  return {
    name: packageName,
    message: `Do not import '${packageName}' directly. Use @HttpClient/@HttpCall conventions for HTTP boundary code.`,
  }
}

function toRestrictedImportPattern(packageName) {
  return {
    group: [`${packageName}/*`],
    message: `Do not import subpaths from '${packageName}'. Use @HttpClient/@HttpCall conventions for HTTP boundary code.`,
  }
}

module.exports = {
  rules: {
    'require-component-decorator': requireComponentDecorator,
    'api-controller-requires-route-and-method': apiControllerRequiresRouteAndMethod,
    'event-requires-type-property': eventRequiresTypeProperty,
    'event-handler-requires-subscribed-events': eventHandlerRequiresSubscribedEvents,
    'ui-page-requires-route': uiPageRequiresRoute,
    'event-publisher-method-signature': eventPublisherMethodSignature,
    'http-client-requires-service-name': httpClientRequiresRemoteName,
    'http-call-requires-route': httpCallRequiresRoute,
    'http-call-requires-http-client-container': httpCallRequiresHttpClientContainer,
    'http-client-public-methods-require-http-call': httpClientPublicMethodsRequireHttpCall,
    'no-fetch-outside-http-client': noFetchOutsideHttpClient,
  },
  configs: {
    'http-client-import-boundary': {
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: restrictedHttpClientImports.map(toRestrictedImportPath),
            patterns: restrictedHttpClientImports.map(toRestrictedImportPattern),
          },
        ],
      },
    },
  },
}
