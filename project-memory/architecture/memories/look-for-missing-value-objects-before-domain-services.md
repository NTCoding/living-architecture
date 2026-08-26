---
status: approved
dateAdded: 2026-08-26
systemAreas:
  - global
architectureConcepts:
  - component-responsibility
  - riviere-role-understanding
  - domain-service
  - value-object
  - domain-modeling
source: conversation: finding missing value objects in role enforcement configuration
---

# Look for missing value objects before defaulting to domain services

## Memory

### Start with the actual service chain

The role check reported three dependencies from one domain service to other
domain services:

```text
roleEnforcementConfiguration (domain-service)
  -> assignPackageConfigurations (domain-service)
  -> validateNoRepeatedInheritedImports (domain-service)
  -> validateRoleConfiguration (domain-service)
```

The coordinating code showed the values and rules involved:

```ts
const assignedConfigurations = assignPackageConfigurations(input.configurations)

const locationHierarchy = assignedConfigurations.flatMap(
  ([packagePattern, configuration]) =>
    buildFluentLocationHierarchy(packagePattern, configuration.locations),
)

validateNoRepeatedInheritedImports(locationHierarchy)
validateRoleConfiguration(input.roles, locationHierarchy)

return RoleEnforcementConfiguration.parse({
  assignedPackages,
  locationHierarchy,
  roles: input.roles,
  // other immutable configuration values
}).data
```

The important question was not how to permit the service chain. It was why
immutable configuration values needed several free services to construct and
validate them.

### Follow the missing ownership

The code contained three meaningful immutable concepts:

- package configuration assignments;
- location hierarchy;
- role catalogue.

They were represented by arrays, records, and interfaces. Because the values
had no behavioural owners, their normalisation and invariants became free
domain services. `roleEnforcementConfiguration` then became another domain
service solely to coordinate them.

The approved modelling direction is to test each concept as a value object:

```ts
const packageAssignments =
  PackageConfigurationAssignments.parse(input.configurations)

const locationHierarchy = LocationHierarchy.parse(packageAssignments)

const roleCatalogue = RoleCatalogue.parse({
  roles: input.roles,
  locations: locationHierarchy,
})

return RoleEnforcementConfiguration.parse({
  packageAssignments,
  locationHierarchy,
  roleCatalogue,
  // other immutable configuration values
})
```

This example shows structural ownership. It is not a requirement to use these
exact method signatures in every implementation.

### Use evidence to identify a missing value object

Before classifying pure behaviour as a domain service, look for this evidence:

1. The same immutable value is passed through several normalisation or
   validation functions.
2. The functions answer what the value means, contains, or permits.
3. The rules determine whether that value is valid.
4. The intermediate or resulting value has a precise domain name.
5. A domain expert would care about that name because it makes the model easier
   to understand or change correctly.
6. The concept has no identity, mutable lifecycle, repository, or external side
   effects.

When that evidence is present, the value object should usually own its parsing,
normalisation, and invariants.

A domain service remains appropriate when the behaviour genuinely spans domain
concepts and no single aggregate or value object naturally owns it. Do not turn
an arbitrary algorithm into a value object merely to remove a forbidden
dependency.

### Trace when construction happens

In this example, all configuration construction happens during aggregate load:

```text
RunRoleEnforcement.execute
  -> RoleEnforcementProjectRepository.load
       -> load the TypeScript configuration module
            -> roleEnforcementConfiguration
                 -> construct and validate immutable configuration values
       -> construct RoleEnforcementProject
```

The TypeScript configuration file calls `roleEnforcementConfiguration` at
module scope. The call therefore runs while the repository loads that module,
not when `RoleEnforcementProject.execute` performs role enforcement.

### Treat file size as supporting evidence

`role-enforcement-builder.ts` contained 434 lines. The file mixed the public
configuration language, role construction, configuration construction,
location hierarchy construction, and validation. The 400 line rule reinforced
the ownership finding: the file contained domain concepts that had not been
made explicit.

The line count alone does not identify the missing concepts. Follow the data,
names, invariants, and lifecycle to find them.

## Why this matters

Defaulting pure functions to `domain-service` can produce a procedural domain
model made of stateless services calling other stateless services. Role
enforcement then exposes the missing ownership but does not create the design
problem.

Looking for values and their invariants first produces clearer domain language,
keeps rules beside the values they define, and avoids inventing orchestration
roles as dependency escape hatches.

## Consider this when

- a domain service imports or calls several other domain services;
- several pure functions normalise or validate the same immutable data;
- arrays, maps, records, or interfaces carry data whose validity is enforced
  elsewhere;
- an intermediate result has a precise domain name but no behavioural owner;
- a coordinating domain file approaches or exceeds 400 lines.

## Do not apply automatically when

- the concept has identity and a lifecycle, which may indicate an aggregate or
  aggregate entity;
- the operation changes aggregate state;
- the proposed value merely describes a temporary technical step;
- the logic performs a process such as source analysis and the value object is
  only its result;
- the behaviour genuinely spans several domain concepts and has no natural
  owner.

## Clarify with the user when

- it is unclear whether a domain expert would recognise the proposed value;
- it is unclear whether the rules define the value or describe a separate
  process;
- moving the rules would change when configuration is validated or loaded;
- several plausible value object boundaries fit the same data.

## Related references

- `.riviere/role-definitions/domain-service.md`
- `.riviere/role-definitions/value-object.md`
- `packages/riviere-role-enforcement/domain-model/src/domain/role-enforcement-builder.ts`
- `packages/riviere-role-enforcement/domain-model/src/domain/package-configuration-assignments.ts`
- `packages/riviere-role-enforcement/domain-model/src/domain/location-hierarchy.ts`
- `packages/riviere-role-enforcement/domain-model/src/domain/role-catalogue.ts`
- `packages/riviere-role-enforcement/use-cases/src/features/enforcement/data-access/role-enforcement/role-enforcement-project-repository.ts`
