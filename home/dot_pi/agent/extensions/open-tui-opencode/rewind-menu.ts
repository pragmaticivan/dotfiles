import { background, bold, foreground } from "./ansi.ts"
import { color } from "./format.ts"
import type { RewindAction } from "./rewind-interaction.ts"

export type RewindMenuItem = {
  readonly value: RewindAction
  readonly label: string
  readonly description: string
}

const firstItemRow = 2
const labelWidth = 22

function fit(value: string, width: number): string {
  if (width <= 0) return ""
  const text = value.length > width ? `${value.slice(0, Math.max(0, width - 1))}…` : value
  return text.padEnd(width)
}

function panelLine(content: string, width: number): string {
  return background(color.panel, fit(content, width))
}

function titleLine(width: number): string {
  const right = "esc   "
  if (width <= right.length + 1) {
    return background(color.panel, foreground(color.text, bold(fit(" Message Actions", width))))
  }
  const left = fit("    Message Actions", width - right.length)
  return background(
    color.panel,
    `${foreground(color.text, bold(left))}${foreground(color.overlay, right)}`,
  )
}

function itemLine(item: RewindMenuItem, selected: boolean, width: number): string {
  const leftPadding = " ".repeat(Math.min(4, width))
  const primaryWidth = Math.min(labelWidth, Math.max(0, width - leftPadding.length))
  const label = fit(item.label, primaryWidth)
  const description = fit(item.description, Math.max(0, width - leftPadding.length - primaryWidth))
  const content = `${leftPadding}${label}${description}`
  if (selected) {
    return background(color.pink, foreground(color.element, bold(fit(content, width))))
  }
  return background(
    color.panel,
    `${leftPadding}${foreground(color.text, label)}${foreground(color.overlay, description)}`,
  )
}

export function renderRewindMenu(
  items: readonly RewindMenuItem[],
  selectedIndex: number,
  width: number,
): string[] {
  const safeWidth = Math.max(1, width)
  return [
    panelLine("", safeWidth),
    titleLine(safeWidth),
    panelLine("", safeWidth),
    ...items.map((item, index) => itemLine(item, index === selectedIndex, safeWidth)),
    panelLine("", safeWidth),
  ]
}

export function rewindMenuIndexAtRow(row: number, itemCount: number): number | undefined {
  const index = row - firstItemRow
  return index >= 0 && index < itemCount ? index : undefined
}
