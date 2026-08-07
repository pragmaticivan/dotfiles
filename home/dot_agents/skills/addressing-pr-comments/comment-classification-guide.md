# Comment Classification Guide

Reference for categorizing PR review comments as obvious fixes vs. non-obvious items.

## Obvious Fixes

These can be applied mechanically with no ambiguity. The reviewer's intent is clear and there's exactly one correct response.

### Naming
- "Rename X to Y"
- "This should be called ___"
- "Typo in variable/function/class name"

### Imports & Dependencies
- "Remove unused import"
- "Add missing import"
- "This import is unused"

### Typos & Grammar
- Spelling errors in comments, docstrings, or strings
- Grammar fixes in documentation
- Copy-paste errors (wrong variable name in comment)

### Style & Formatting
- "Add a blank line here"
- "Remove trailing whitespace"
- "Use single quotes" / "Use double quotes"
- Indentation fixes
- Line length violations

### Type Annotations
- "Add type hint for return value"
- "This should be `Optional[str]`"
- Simple type annotation additions where the type is obvious from context

### Simple Code Changes
- "Add `None` check here" (when the pattern is obvious)
- "This should be `>=` not `>`" (off-by-one the reviewer identified)
- "Use `foo.bar` instead of `foo['bar']`"
- "Remove this dead code"
- "This log message should say X not Y"
- Fixing a constant value the reviewer flagged

### Documentation
- "Add docstring"
- "Update this comment to reflect the change"
- "This TODO is done, remove it"

## Non-Obvious

These require judgment, design trade-offs, or discussion. Multiple valid responses exist.

### Architecture & Design
- "Have you considered using pattern X instead?"
- "Should this be a separate class/module?"
- "This might be better as a strategy pattern"
- "Consider splitting this into smaller functions" (when unclear how to split)

### Alternative Approaches
- "What about doing X instead of Y?"
- "Another option would be..."
- "In other codebases I've seen this done with..."

### Performance & Correctness Concerns
- "This might be slow for large inputs"
- "Is this thread-safe?"
- "What happens if X fails here?"
- "Edge case: what if the list is empty?"

### Questions Seeking Clarification
- "Why did you choose X over Y?"
- "Is this intentional?"
- "What's the reasoning behind..."
- "Could you explain..."

### Scope & Follow-ups
- "Should we also handle X?"
- "This might need a migration"
- "We should add tests for this" (when which tests is unclear)

### Disagreements
- "I don't think we need this"
- "I'd prefer to keep the old behavior"
- "This changes the API contract"

## Edge Cases

When in doubt, classify as **non-obvious**. It's better to ask the user than to make a wrong assumption.

### Looks Obvious But Isn't
- "Rename X to Y" but Y conflicts with another symbol in scope → non-obvious
- "Remove this import" but it's used via side effect → non-obvious
- "Fix this typo" but it's actually a domain-specific term → non-obvious

### Looks Non-Obvious But Is
- Long-winded comment that boils down to "rename this" → obvious
- Suggestion with code snippet showing exact change → obvious
- "Nit: ..." followed by a specific mechanical fix → obvious
