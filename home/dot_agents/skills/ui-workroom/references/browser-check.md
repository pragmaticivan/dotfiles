# Inspect in Playwright

Use the project's browser setup when available.
Otherwise, use the available Playwright browser tools.
If neither can run, report the missing tool or server without a visual approval claim.

For an existing page, capture its original state before editing.
Use the same route, content, viewport, and scroll position for each comparison.
Wait for fonts, images, and application data before capture.
Use desktop and narrow widths appropriate to the project.
Without project sizes, start at 1440 × 900 and 390 × 844.
Check an intermediate width near a layout breakpoint.
Capture a full-page image and a close view when the full-page image makes details unreadable.
Open each image with the available image-viewing tool before judging it.

## Inspect with a temporary grid

Inject the function in [grid.js](../scripts/grid.js) only into the local page under review.
The function returns geometry, not an alignment verdict.
It replaces its previous overlay without changing the application's styles.
The user-authorized visual inspection includes this temporary DOM overlay.

With Playwright in Node, read the function as text.
Replace `skillDir` with the skill's absolute directory.

```js
const gridSource = await readFile(`${skillDir}/scripts/grid.js`, 'utf8')
const gridOptions = { selector: 'main', columns: 12, gap: 24, step: 8 }
await page.evaluate(`(${gridSource})(${JSON.stringify(gridOptions)})`)
await page.screenshot({ path: 'pass-1-desktop-grid.png', fullPage: true })
```

Import `readFile` from Node's `node:fs/promises` in a local test script.
For browser tools without file access, pass the function text to the browser evaluation tool.
Use the actual container selector, columns, gutter width, and spacing step.
Use fewer columns on narrow layouts when the project does.
Reapply the overlay after each resize, navigation, or content-height change.
After capture, compare the overlay geometry with the content edges again.
If capture hides an existing scrollbar, preserve its gutter during capture.

```js
await page.screenshot({
	path: 'pass-1-desktop-grid.png',
	fullPage: true,
	style: ':root { scrollbar-gutter: stable !important; }',
})
```

Use the same capture style for the clean comparison.
Compare content edges and repeated action anchors with `getBoundingClientRect()`.
Do not infer alignment from the grid image alone.

Remove the overlay before the clean screenshot.

```js
await page.evaluate(() => document.querySelector('[data-ui-workroom-grid]')?.remove())
await page.screenshot({ path: 'pass-1-desktop-clean.png', fullPage: true })
```

Do not commit the overlay to the application.
Confirm its removal before handing back the final screen.

## Check behavior as well as appearance

Exercise the main action with pointer and keyboard input.
Check visible focus, accessible names, and recovery from a relevant error.
Compare long and short content in repeated components.
Check text contrast with computed colors or the project's accessibility tool.
A screenshot alone cannot establish accessibility compliance.
Distinguish new console or network failures from existing failures.

For animated changes, capture a short sequence or video across the transition.
Test rapid repeated input and interruption.
Emulate `reducedMotion: 'reduce'` before repeating the flow.
Make sure that content and actions remain usable without decorative motion.

Keep an evidence row for each pass.

| Pass | Route and state | Viewport | Observed defect | Correction | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `/plans`, long titles | 390 × 844 | Action clips at the edge | Allow the label to wrap | Actual screenshot paths |

After a correction, repeat the affected checks against the current code.
Report a blocked check as untested, not passed.
