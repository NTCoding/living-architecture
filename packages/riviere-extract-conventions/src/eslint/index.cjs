const requireComponentDecorator = require('./require-component-decorator.cjs')
const apiControllerRequiresRouteAndMethod = require('./api-controller-requires-route-and-method.cjs')
const eventRequiresTypeProperty = require('./event-requires-type-property.cjs')
const eventHandlerRequiresSubscribedEvents = require('./event-handler-requires-subscribed-events.cjs')
const uiPageRequiresRoute = require('./ui-page-requires-route.cjs')

module.exports = {
  rules: {
    'require-component-decorator': requireComponentDecorator,
    'api-controller-requires-route-and-method': apiControllerRequiresRouteAndMethod,
    'event-requires-type-property': eventRequiresTypeProperty,
    'event-handler-requires-subscribed-events': eventHandlerRequiresSubscribedEvents,
    'ui-page-requires-route': uiPageRequiresRoute,
  },
}
