# Design red flags

Screen every candidate before synthesis. A red flag is a reason to revise or reject the shape.

## Shallow module

A shallow module exposes a large interface while hiding little complexity. Judge depth by the capability and policy hidden behind the public surface relative to the size of that surface. Prefer a simple interface backed by substantial behavior.

Do not confuse a deep module with a deep call chain. A deep call chain scatters understanding across layers. A deep module concentrates capability behind one interface.

Look for these signs:

- Callers coordinate several methods to complete one operation.
- Public options expose internal stages or implementation choices.
- Learning the interface does not save the caller from learning the implementation.

## Information leakage

Information leakage makes multiple modules depend on the same internal decision. A representation, policy, or protocol detail appears in more than one place, so changing it requires coordinated edits.

Public re-exports of transport or wire types are leakage. Parse external data into domain types behind the interface. Keep storage schemas, framework objects, and protocol details private.

## Temporal decomposition

Temporal decomposition organizes modules by execution order instead of the knowledge they own. Separate load, validate, transform, and save stages often repeat one representation and its invariants across several boundaries.

Group code around domain knowledge and ownership. Methods that run at different times can still belong to one module when they protect the same decisions.

## Pass-through method

A pass-through method forwards the same arguments to another method with the same shape. It adds a layer without hiding complexity.

Remove it or move responsibility to the module that can complete the operation. Keep a forwarding boundary only when it adds policy, adaptation, or a distinct abstraction.

## Unbounded observable surface (Hyrum's Law)

With enough callers, every observable behavior becomes a contract, whatever the documentation promises. Undocumented quirks, error message text, ordering, and timing all get depended on.

Screen for what the candidate exposes beyond its stated interface. Be deliberate about each observable behavior, because each one is a commitment. Contract tests do not save you here, so a change that looks safe can still break a caller that depended on something you never meant to promise.

## No deprecation path

A design that cannot remove anything is a design that only grows. Plan removal when you add the surface, not when it hurts.

Ask how a caller migrates off each part of the interface, and what signals the removal. A candidate with no answer keeps every mistake forever.

## Version forking

Avoid a shape that makes consumers pick between two versions of the same thing. Diamond dependencies follow, where different callers need different versions at once.

Design as if one version exists. Extend the interface rather than forking it.

## Split ownership

More than one module writes the same state or keeps its own copy of it. An agent that edits one writer cannot see the others, so their rules diverge.

Give each piece of state one owner. Other modules read it or ask the owner to change it.

## Two ways to do one task

The design supports more than one way to do the same task. An agent copies the first way it finds, so each way keeps getting new callers.

Keep one way. Move callers off the others and delete them in the same change.

## Importable internals

A caller can import the internals of a module. An agent takes the shortest path that compiles, so it imports them directly and they become part of the interface.

Make internals unreachable from outside the module, so that an import from outside fails the build.

## Hand-synced list

Two or more places list the same items, and to add an item you must edit each list. An agent that sees one list updates only that list.

Keep one list and derive the others from it. If you cannot derive a list, make the build fail when the lists do not agree.
