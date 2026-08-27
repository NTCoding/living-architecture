# aggregate-entity

## Purpose

A class with identity and a lifecycle that is owned by one aggregate. It is not
an aggregate root and consumers cannot use it independently of its aggregate.

## Behavioural contract

1. Has identity within its owning aggregate.
2. Owns state that changes through a domain lifecycle.
3. Is created and used through its owning aggregate.
4. Has a private constructor.
5. Keeps all data members private.
6. Cannot be used directly by use cases or repositories.

## Decision guidance

- Use `aggregate` when the concept is loaded and saved as an independent root.
- Use `aggregate-entity` when the concept exists only inside an aggregate boundary.
- Use `value-object` when the concept is immutable and defined only by its attributes.
- Use `domain-service` when the behaviour has no natural state owner.

## Abuse signals

- The class has no stable identity.
- The class has no owned state or lifecycle.
- A use case or repository uses the class directly.
- The class exists only to coordinate functions that could not otherwise depend on each other.
