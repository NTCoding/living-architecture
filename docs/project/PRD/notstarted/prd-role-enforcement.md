# PRD: Architecture Role Enforcement

Keeping a codebase well organized is important for navigating the code and helping to keep the code well designed and maintainable. However, this is rarely the case because responsibilities get mixed and code gets added in different folders randomly.

To solve this problem we are going to create software-role-dsl. The DSL defines a list of roles. Each class in code, or static function that is not part of a class, must have a role. And the role defines where the code should live.

For example:
1. `domain-service` => must live in /src/{feature}/domain/
2. `cli-entrypiont` => must live in /src/{feature}/entrypoint/

Roles should be added as decorators like:
```
@RiviereRole(RIVIERE_ROLE.AGGREGATE)
class Loan {
   ...
}
```

Configuration should be as simple and minimal as possible:
```
{
	roles: [
		aggregate: {
		  allowedLocations: ['/src/{feature}/domain', ]
		}
		...
	]
}
```

### Objectives.
1. Build a system that allows roles to be configured and enforced
2. Tool should enforce 100% codebase compliance (every class or static method outside a class must have a role decorator)
3. Start by applying to the riviere codebase itself => 100% coverage (except schema packages)
4. In riviere our roles should be generic and reusable across codebases => roles like Aggregate are common industry terms and patterns so can be used. We should not have roles specific to our domain like 'connection-extractor'
5. Create specialist subagents that can be used to apply the rules to a given piece of code and correctly determine the role(s) of the code. It should suggest refactorings where needed, for example "this code combines domain-specific and generic logic, it should be decoupled into multiple roles and each one should be located in the relevant folder"

### Implementation requirements
1. Speed is crucial. Let's try oxlint => we need to include performance diagnostics
2. When there is an error the error should provide a clear diagnostic "{role} cannot live in {location}. See {config file for allowed roles}"
3. The config file should have a json schema and be validated before being parsed.
4. The riviere codebase may require refactoring and our architecture rules may need to evolve
5. new package in riviere riviere-role-enforcement => must follow all of our existing lint rules and 100% coverage

# Plan
We must work in small iterations. Initial we need to do discovery:
1. What is our config format?
2. Do a very small POC based on some of our real code
3. Define our roles and rules - review code together to define rules and build our expert subagent that we can rly on later. Every new role added must be approved by a human user.
4. Go through the riviere codebase in iterations (one package at a time) and identify roles and required refactoring. 

Each iteration should be a separate PR and we want PRs to be as small as possible.