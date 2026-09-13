import type { ExtensionAPI, ExtensionContext, KeybindingsManager } from "@earendil-works/pi-coding-agent"
import { CustomEditor } from "@earendil-works/pi-coding-agent"
import type { EditorTheme, TUI, TuiMouseEvent } from "@earendil-works/pi-tui"
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui"
import { background, bold, foreground } from "./ansi.ts"
import { editorBodyLines } from "./editor-frame.ts"
import { color } from "./format.ts"

type WorkingStatus = Parameters<CustomEditor["setWorkingStatusIndicator"]>[0]

function fill(text: string, width: number): string {
  const content = truncateToWidth(text, Math.max(0, width), "")
  return `${content}${" ".repeat(Math.max(0, width - visibleWidth(content)))}`
}

class OpenCodeEditor extends CustomEditor {
  readonly embedWorkingStatus = true
  private status: WorkingStatus = undefined
  private readonly metadata: () => string
  private contentEnd = 0
  private autocompleteStart = Number.POSITIVE_INFINITY

  constructor(
    tui: TUI,
    editorTheme: EditorTheme,
    keybindings: KeybindingsManager,
    metadata: () => string,
  ) {
    super(tui, editorTheme, keybindings, { paddingX: 0, embedWorkingStatus: true })
    this.metadata = metadata
  }

  override setPaddingX(_padding: number): void {
    super.setPaddingX(0)
  }

  override setWorkingStatusIndicator(status: WorkingStatus): void {
    this.status = status
    super.setWorkingStatusIndicator(status)
  }

  override render(width: number): string[] {
    if (width < 6) return super.render(width)

    const innerWidth = width - 5
    const layout = editorBodyLines(super.render(innerWidth), this.metadata())
    this.contentEnd = layout.panel.length - 3
    this.autocompleteStart = layout.panel.length + 1
    const panelWidth = width - 1
    const rail = foreground(color.pink, "│")
    const panel = layout.panel.map((line, index) => {
      const status = index === 1 && this.status ? this.status.renderInBorder(Math.max(1, innerWidth)) : line
      return `${rail}${background(color.element, fill(`  ${status}  `, panelWidth))}`
    })
    const shadow = `${foreground(color.pink, "╹")}${foreground(color.element, "▀".repeat(panelWidth))}`
    const autocomplete = layout.autocomplete.map((line) => `   ${truncateToWidth(line, width - 3, "")}`)
    return [...panel, shadow, ...autocomplete]
  }

  override handleMouse(event: TuiMouseEvent): ReturnType<CustomEditor["handleMouse"]> {
    if (event.x < 3) return undefined
    if (event.y < 2) return undefined
    if (event.y > this.contentEnd && event.y < this.autocompleteStart) return undefined
    return super.handleMouse({
      ...event,
      x: event.x - 3,
      y: event.y >= this.autocompleteStart ? event.y - 3 : event.y - 1,
      width: Math.max(1, event.width - 5),
    })
  }
}

export function installEditor(pi: ExtensionAPI, ctx: ExtensionContext): () => void {
  ctx.ui.setEditorComponent((tui, editorTheme, keybindings) => new OpenCodeEditor(
    tui,
    editorTheme,
    keybindings,
    () => {
      const model = ctx.model?.name || ctx.model?.id || "no model"
      const provider = ctx.model?.provider === "openai-codex"
        ? "OpenAI"
        : ctx.model?.provider || ""
      const thinking = pi.getThinkingLevel()
      const mode = foreground(color.pink, "Build")
      const separator = foreground(color.overlay, "·")
      const modelLabel = foreground(color.text, model)
      const providerLabel = provider ? ` ${foreground(color.overlay, provider)}` : ""
      const thinkingLabel = thinking === "off"
        ? ""
        : ` ${separator} ${bold(foreground(color.yellow, thinking))}`
      return `${mode} ${separator} ${modelLabel}${providerLabel}${thinkingLabel}`
    },
  ))
  return () => ctx.ui.setEditorComponent(undefined)
}
