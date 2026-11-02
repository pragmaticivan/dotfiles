({ selector = 'main', columns = 12, gap = 24, step = 8 } = {}) => {
	const container = document.querySelector(selector)
	if (!container) throw new Error(`Grid container not found: ${selector}`)
	if (!Number.isInteger(columns) || columns < 1 || gap < 0 || step <= 0) {
		throw new Error('Use positive columns and step, and a nonnegative gap')
	}
	document.querySelector('[data-ui-workroom-grid]')?.remove()
	const rect = container.getBoundingClientRect()
	const style = getComputedStyle(container)
	const left = rect.left + scrollX + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft)
	const width = container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
	const height = document.documentElement.scrollHeight
	const overlay = document.createElement('div')
	overlay.setAttribute('data-ui-workroom-grid', '')
	overlay.setAttribute('aria-hidden', 'true')
	Object.assign(overlay.style, {
		all: 'initial', position: 'absolute', top: '0', left: `${left}px`,
		width: `${width}px`, height: `${height}px`, zIndex: '2147483647',
		pointerEvents: 'none', display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
		gap: `${gap}px`, backgroundImage: 'linear-gradient(to bottom, #e11d4866 1px, transparent 1px)',
		backgroundSize: `100% ${step}px`,
	})
	for (let index = 0; index < columns; index += 1) {
		const column = document.createElement('div')
		Object.assign(column.style, { all: 'initial', background: '#0891b233' })
		overlay.append(column)
	}
	document.documentElement.append(overlay)
	return { left, width, height, columns, gap, step }
}
