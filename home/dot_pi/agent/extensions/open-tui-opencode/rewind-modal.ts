import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent"
import {
  getKeybindings,
  type Component,
  type TuiMouseEvent,
  type TuiMouseEventResult,
} from "@earendil-works/pi-tui"
import type { RewindAction } from "./rewind-interaction.ts"
import {
  renderRewindMenu,
  rewindMenuIndexAtRow,
  type RewindMenuItem,
} from "./rewind-menu.ts"

class RewindMenuComponent implements Component {
  private selectedIndex = 0

  constructor(
    private readonly items: readonly RewindMenuItem[],
    private readonly done: (result: RewindAction | undefined) => void,
  ) {}

  render(width: number): string[] {
    return renderRewindMenu(this.items, this.selectedIndex, width)
  }

  invalidate(): void {}

  handleInput(data: string): void {
    const keybindings = getKeybindings()
    if (keybindings.matches(data, "tui.select.up")) {
      this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length
      return
    }
    if (keybindings.matches(data, "tui.select.down")) {
      this.selectedIndex = (this.selectedIndex + 1) % this.items.length
      return
    }
    if (keybindings.matches(data, "tui.select.confirm")) {
      this.done(this.items[this.selectedIndex]?.value)
      return
    }
    if (keybindings.matches(data, "tui.select.cancel")) this.done(undefined)
  }

  handleMouse(event: TuiMouseEvent): TuiMouseEventResult | undefined {
    const index = rewindMenuIndexAtRow(event.y, this.items.length)
    if (index === undefined) return undefined
    if (event.type === "move") {
      const changed = this.selectedIndex !== index
      this.selectedIndex = index
      return { handled: true, render: changed }
    }
    if (event.button !== "left") return undefined
    if (event.type === "press") {
      const changed = this.selectedIndex !== index
      this.selectedIndex = index
      return { handled: true, focus: true, render: changed }
    }
    if (event.type === "click") {
      this.selectedIndex = index
      this.done(this.items[index]?.value)
      return { handled: true }
    }
    return undefined
  }
}

export function selectRewindAction(
  ctx: ExtensionCommandContext,
  items: readonly RewindMenuItem[],
): Promise<RewindAction | undefined> {
  return ctx.ui.custom<RewindAction | undefined>(
    (_tui, _theme, _keybindings, done) => new RewindMenuComponent(items, done),
    {
      overlay: true,
      overlayOptions: {
        anchor: "center",
        width: 62,
        maxHeight: 7,
        margin: 2,
      },
    },
  )
}
