type GenericRuleModule = import('@typescript-eslint/utils').TSESLint.RuleModule<
  string,
  readonly unknown[]
>

declare module './api-controller-requires-route-and-method.cjs' {
  const rule: GenericRuleModule
  export default rule
}

declare module './event-handler-requires-subscribed-events.cjs' {
  const rule: GenericRuleModule
  export default rule
}

declare module './event-publisher-method-signature.cjs' {
  const rule: GenericRuleModule
  export default rule
}

declare module './event-requires-type-property.cjs' {
  const rule: GenericRuleModule
  export default rule
}

declare module './http-call-requires-http-client-container.cjs' {
  const rule: GenericRuleModule
  export default rule
}

declare module './http-call-requires-route.cjs' {
  const rule: GenericRuleModule
  export default rule
}

declare module './http-client-public-methods-require-http-call.cjs' {
  const rule: GenericRuleModule
  export default rule
}

declare module './http-client-requires-remote-name.cjs' {
  const rule: GenericRuleModule
  export default rule
}

declare module './no-fetch-outside-http-client.cjs' {
  const rule: GenericRuleModule
  export default rule
}

declare module './require-component-decorator.cjs' {
  const rule: GenericRuleModule
  export default rule
}

declare module './ui-page-requires-route.cjs' {
  const rule: GenericRuleModule
  export default rule
}
