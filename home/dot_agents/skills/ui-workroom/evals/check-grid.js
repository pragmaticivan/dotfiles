async (page) => {
	const origin = new URL(page.url()).origin
	const response = await page.request.get(`${origin}/scripts/grid.js`)
	if (!response.ok()) throw new Error('Serve the ui-workroom directory before the grid check')
	const source = await response.text()
	const results = []
	for (const [width, height, columns] of [[1440, 900, 12], [390, 844, 4]]) {
		await page.setViewportSize({ width, height })
		await page.goto(`${origin}/evals/fixtures/plans/`)
		await page.evaluate(() => scrollTo(0, 0))
		const before = await page.locator('main').boundingBox()
		const dimensions = await page.evaluate(() => ({
			width: document.documentElement.scrollWidth,
			height: document.documentElement.scrollHeight,
		}))
		const options = JSON.stringify({ selector: 'main', columns, gap: 24, step: 8 })
		await page.evaluate(`(${source})(${options})`)
		await page.evaluate(`(${source})(${options})`)
		if (await page.locator('[data-ui-workroom-grid]').count() !== 1) {
			throw new Error('A repeated grid check must leave one overlay')
		}
		const actual = await page.locator('[data-ui-workroom-grid]').evaluate((overlay) => ({
			left: overlay.getBoundingClientRect().left,
			width: overlay.getBoundingClientRect().width,
			height: overlay.getBoundingClientRect().height,
			columns: overlay.children.length,
			pointerEvents: getComputedStyle(overlay).pointerEvents,
			hidden: overlay.getAttribute('aria-hidden'),
		}))
		if (actual.left !== before.x + 24 || actual.width !== before.width - 48) {
			throw new Error('The grid must match the content edges, not the viewport')
		}
		if (actual.columns !== columns || actual.height < dimensions.height) {
			throw new Error('The grid must cover the page with the requested columns')
		}
		if (actual.pointerEvents !== 'none' || actual.hidden !== 'true') {
			throw new Error('The grid must not intercept input or enter the accessibility tree')
		}
		await page.screenshot({ fullPage: true, style: ':root { scrollbar-gutter: stable !important; }' })
		const capturedEdges = await page.evaluate(() => ({
			content: document.querySelector('.eyebrow').getBoundingClientRect().left,
			grid: document.querySelector('[data-ui-workroom-grid]').getBoundingClientRect().left,
		}))
		if (capturedEdges.content !== capturedEdges.grid) {
			throw new Error('Screenshot capture must keep the grid on the content edge')
		}
		await page.getByText('Can I change my plan?', { exact: true }).click()
		if (!await page.locator('details').evaluate((details) => details.open)) {
			throw new Error('The grid must permit the real pointer interaction')
		}
		await page.getByText('Can I change my plan?', { exact: true }).click()
		await page.evaluate(() => scrollTo(0, 0))
		const after = await page.locator('main').boundingBox()
		const afterDimensions = await page.evaluate(() => ({
			width: document.documentElement.scrollWidth,
			height: document.documentElement.scrollHeight,
		}))
		if (JSON.stringify(before) !== JSON.stringify(after) || JSON.stringify(dimensions) !== JSON.stringify(afterDimensions)) {
			throw new Error(`The grid changed geometry: ${JSON.stringify({ before, after, dimensions, afterDimensions })}`)
		}
		await page.evaluate(() => document.querySelector('[data-ui-workroom-grid]').remove())
		if (await page.locator('[data-ui-workroom-grid]').count() !== 0) {
			throw new Error('The clean page must have no overlay')
		}
		results.push({ width, height, columns, passed: true })
	}
	return results
}
