# command-input-factory-dependencies

## Purpose
Supplies the dependencies a command-input-factory needs in order to build the command input. In most cases, this should be side-effect free parsing, converting the raw inputs into the types required on the command input object.

## Anti-Patterns

1. I/O — if you're providing a dependency that reads the filesystem, makes API calls, interacts with databases or similar side effects, that's going beyond parsing. More appropriate options are:

   - `command-use-case`: responsible for orchestrating the various operations in a use case like I/O. See .riviere/role-definitions/command-use-case.md
   - `external-client-service`: wrappers for dealing with frameworks, libraries, and APIs not part of this project like git or filesystem access. See .riviere/role-definitions/external-client-service.md
   - `domain-port-adapter`: wires up I/O operations that need to be orchestrated by the domain model. See .riviere/role-definitions/domain-port-adapter.md
