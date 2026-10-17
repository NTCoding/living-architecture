# dev-workflow-v3 domain model

Models the software factory workflow, from a GitHub issue through planning,
implementation, verification and the review cycle to a pull request ready for a
person.

The workflow itself is deterministic. A model is called only where the result
cannot be computed, so the value objects here carry the data each step hands on,
and the rules that must not change from `dev-workflow-v2`, namely leaving out a
reviewer that already approved and stopping after three review cycles.
