import {
  AssistantMessageComponent,
  ToolExecutionComponent,
  UserMessageComponent,
  VERSION,
} from "@earendil-works/pi-coding-agent"
import {
  TuiAltScreen,
  type Component,
  type TuiMouseEvent,
} from "@earendil-works/pi-tui"
import { background, foreground } from "./ansi.ts"
import { color } from "./format.ts"
import { replaceBackgroundColor } from "./hover.ts"
import { indentTranscriptLines, styleUserMessageLines } from "./messages.ts"
import type { MessageTarget } from "./rewind-interaction.ts"

export const supportedPiVersion = "0.85.1"
const transcriptIndent = "   "
const patchKey = "__piOpenCodeTranscriptStyle0851"

type TranscriptStyleOptions = {
  targetFor(component: object, text: string): MessageTarget | undefined
  request(target: MessageTarget): void
}

function componentText(component: object): string | undefined {
  const value: unknown = Reflect.get(component, "text")
  return typeof value === "string" ? value : undefined
}

function insetMouseEvent(event: TuiMouseEvent): TuiMouseEvent | undefined {
  if (event.x < transcriptIndent.length) return undefined
  return {
    ...event,
    x: event.x - transcriptIndent.length,
    width: Math.max(1, event.width - transcriptIndent.length),
  }
}

function mouseResult(
  component: Component,
  event: TuiMouseEvent,
  render?: boolean,
) {
  return {
    handled: true as const,
    target: {
      component,
      originX: event.screenX - event.x,
      originY: event.screenY - event.y,
      width: event.width,
      height: event.height,
    },
    ...(render === undefined ? {} : { render }),
  }
}

function isMotionEvent(value: unknown): value is { button: number } {
  if (typeof value !== "object" || value === null) return false
  const button: unknown = Reflect.get(value, "button")
  return typeof button === "number" && (button & 32) !== 0
}

export function supportsTranscriptStyle(version = VERSION): boolean {
  return version === supportedPiVersion
}

export function installTranscriptStyle(options: TranscriptStyleOptions): (() => void) | undefined {
  if (!supportsTranscriptStyle()) return undefined
  if (Reflect.get(globalThis, patchKey) === true) return undefined
  Reflect.set(globalThis, patchKey, true)

  const userRender = UserMessageComponent.prototype.render
  const userMouse = UserMessageComponent.prototype.handleMouse
  const assistantRender = AssistantMessageComponent.prototype.render
  const assistantMouse = AssistantMessageComponent.prototype.handleMouse
  const toolRender = ToolExecutionComponent.prototype.render
  const toolMouse = ToolExecutionComponent.prototype.handleMouse
  const altScreenPrototype = TuiAltScreen.prototype
  const altScreenMouse: unknown = Reflect.get(altScreenPrototype, "handleMouseEvent")
  let hoveredUser: object | undefined
  let hoverBeforeDispatch: object | undefined

  if (typeof altScreenMouse === "function") {
    Reflect.set(altScreenPrototype, "handleMouseEvent", function handleOpenCodeMouse(
      this: TuiAltScreen,
      event: unknown,
    ) {
      if (!isMotionEvent(event)) return Reflect.apply(altScreenMouse, this, [event])
      hoverBeforeDispatch = hoveredUser
      hoveredUser = undefined
      const result = Reflect.apply(altScreenMouse, this, [event])
      const changed = hoverBeforeDispatch !== hoveredUser
      hoverBeforeDispatch = undefined
      if (changed) this.requestRender()
      return result
    })
  }

  UserMessageComponent.prototype.render = function renderOpenCodeUserMessage(width: number): string[] {
    const text = componentText(this)
    if (text) options.targetFor(this, text)
    let content = userRender.call(this, Math.max(1, width - transcriptIndent.length))
    const hovered = hoveredUser === this
    if (hovered) {
      content = content.map((line) => replaceBackgroundColor(line, color.panel, color.element))
    }
    return styleUserMessageLines(
      content,
      foreground(color.pink, "│"),
      background(hovered ? color.element : color.panel, "  "),
    )
  }

  UserMessageComponent.prototype.handleMouse = function handleOpenCodeUserMouse(event: TuiMouseEvent) {
    if (event.type === "move") {
      hoveredUser = this
      return mouseResult(this, event, true)
    }
    if (event.type === "click" && event.button === "left") {
      const text = componentText(this)
      const target = text ? options.targetFor(this, text) : undefined
      if (target) {
        options.request(target)
        return mouseResult(this, event)
      }
    }
    return userMouse.call(this, event)
  }

  AssistantMessageComponent.prototype.render = function renderOpenCodeAssistantMessage(width: number): string[] {
    const content = assistantRender.call(this, Math.max(1, width - transcriptIndent.length))
    return indentTranscriptLines(content, transcriptIndent)
  }

  AssistantMessageComponent.prototype.handleMouse = function handleOpenCodeAssistantMouse(event: TuiMouseEvent) {
    const inset = insetMouseEvent(event)
    return inset ? assistantMouse.call(this, inset) : undefined
  }

  ToolExecutionComponent.prototype.render = function renderOpenCodeTool(width: number): string[] {
    const content = toolRender.call(this, Math.max(1, width - transcriptIndent.length))
    return indentTranscriptLines(content, transcriptIndent)
  }

  ToolExecutionComponent.prototype.handleMouse = function handleOpenCodeToolMouse(event: TuiMouseEvent) {
    const inset = insetMouseEvent(event)
    return inset ? toolMouse.call(this, inset) : undefined
  }

  return () => {
    UserMessageComponent.prototype.render = userRender
    UserMessageComponent.prototype.handleMouse = userMouse
    AssistantMessageComponent.prototype.render = assistantRender
    AssistantMessageComponent.prototype.handleMouse = assistantMouse
    ToolExecutionComponent.prototype.render = toolRender
    ToolExecutionComponent.prototype.handleMouse = toolMouse
    if (typeof altScreenMouse === "function") {
      Reflect.set(altScreenPrototype, "handleMouseEvent", altScreenMouse)
    }
    hoveredUser = undefined
    Reflect.deleteProperty(globalThis, patchKey)
  }
}
