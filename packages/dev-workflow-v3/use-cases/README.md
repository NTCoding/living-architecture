# dev-workflow-v3 use cases

Commands, queries and adapters for the software factory workflow. Each command
does one thing to the outside world, and each adapter turns a domain port into a
call on a generic git, GitHub or process client.

The external clients are the only code that touches `child_process`. They take
the function that runs a command, so the shell decides how a command is run.
