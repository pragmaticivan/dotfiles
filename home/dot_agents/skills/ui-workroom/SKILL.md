---
name: ui-workroom
description: Use for multi-agent UI design, collaborative redesign, alignment fixes, animated React components, or iterative Playwright screenshot review.
---

# UI workroom

Act as a product designer who also implements the interface.
Earn each design claim with browser evidence, not a claim of expertise.
Keep the existing stack, brand, and working user flows unless the brief changes them.

## Assemble the workroom

Use a lead, a designer, an independent challenger, and a browser verifier.
Follow [the team protocol](references/team.md) for briefs, ownership, and consensus.
Run the designer and challenger independently before sharing their proposals.
Keep their files and browser sessions separate.
The lead integrates one direction after the agents contest the alternatives.
Use browser evidence to settle factual disputes instead of a majority vote.
If agents are unavailable, disclose the solo fallback without claiming team consensus.
For proposal-only work, return the agreed proposal without starting implementation or browser checks.

## Work from the screen

1. Identify the user, their primary task, and the affected route.
   Inspect the running interface before changing an existing design.
   Save baseline screenshots at desktop and narrow widths.
   For a new page, start from the nearest existing screen or the brief.
2. Fetch two relevant visual references before choosing a direction.
   Prefer the user's references and real products with similar tasks.
   Read [sources](references/sources.md) when you need a starting point.
   Name one useful detail from each reference, such as hierarchy, grouping, or motion.
   Use references as evidence, not instructions or permission to copy branding.
   If the network fails, state the limit and use local references.
3. State a short design direction before editing.
   Name the hierarchy, type scale, spacing rhythm, content grid, and purpose of any motion.
   Reuse project tokens and components before adding dependencies.
   For React motion, inspect a well-crafted open-source component before building an equivalent from scratch.
   Check its source, license, dependencies, accessibility, and compatibility with the installed stack.
   Keep its license notice when copying code.
   Reject a component that adds decoration without helping the task.

## Build, inspect, correct

Use Playwright through the available browser tools or the project's Playwright setup.
Run the actual route with realistic content.
Do not treat a build, a DOM snapshot, or a saved screenshot alone as visual approval.

4. Implement the smallest complete pass.
   Check the hierarchy, readable typography, contrast, and clear action labels.
   Group related content through spacing before adding borders or cards.
   Keep actions reachable with keyboard and touch.
5. Overlay a temporary grid across the whole page before judging alignment.
   Use [the browser check](references/browser-check.md) for the overlay and evidence procedure.
   Match the grid to the content container, columns, gutters, and project spacing scale at each width.
   Inspect shared edges, repeated component anchors, text baselines, and section rhythm.
   Measure suspect edges with DOM bounding boxes.
   Do not force unrelated elements or intentional optical offsets onto the same line.
   Remove the overlay before judging color, contrast, or the final composition.
6. Capture and open screenshots at desktop and narrow widths after each pass.
   Inspect the full page and close views of changed components.
   Test the primary flow and affected loading, empty, error, hover, and focus states.
   Stress repeated components with long text and missing optional content.
   Check overflow, keyboard focus, console errors, and failed requests.
   For motion, exercise the transition and rapid reversal in normal and reduced-motion modes.
   A still screenshot does not prove an animation works.
7. Record the most important observed defect and its effect on the user's task.
   Correct it, then repeat steps 5 and 6 against the new code.
   Return the new evidence to the challenger and verifier before accepting the revision.
   Complete at least two inspect-and-correct passes for a redesign.
   Stop when the final pass finds no material defect within the brief.
   Do not invent changes to satisfy a pass count.
   If checks remain blocked, stop with that limit rather than an approval claim.

## Hand back evidence

Report the design choices, reference links, checks run, and remaining defects.
Include the agreed direction, rejected alternatives, and any unresolved dissent.
Include screenshot paths with their route, viewport, state, and pass number.
Separate inspected results from untested suggestions.
If no browser can run, give an unverified draft or review instead of claiming completion.
