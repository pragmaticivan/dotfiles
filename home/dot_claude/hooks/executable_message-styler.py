"""MessageDisplay hook: restyles Claude's replies for a Catppuccin Macchiato terminal.

Display-only. The transcript and Claude's own context keep the original text, thus
nothing here costs tokens and nothing here can change what Claude sees.

Claude Code calls this once per batch of newly completed lines while a message
streams, and renders the returned `displayContent` in place of that batch. Four
constraints came out of testing against the live renderer:

1. ANSI truecolor passes through, but the harness re-emits its own style state per
    line, thus a colour must be applied to every line and never wrapped around a
    multi-line block.
2. An escape may precede a markdown delimiter but must never immediately follow a
    closing one. `**Label:**\x1b[0m` stops the emphasis from closing, and the failure
    cascades to the enclosing block, so list markers go literal too.
3. The harness assembles block constructs across batch boundaries only when the
    lines come back byte-identical. Anything inserted ahead of a leading `|` defeats
    table detection.
4. Because of 3, a block this script renders itself has to be buffered until it
    closes. Tables accumulate in a state file and flush on the first non-table line
    or on the final batch, thus a table ending a batch renders one batch late.

Fences and indented code are left to the harness, which already highlights them.
Known gap: a wrapped bullet has no hanging indent, because replacing `- ` with `• `
hands list layout to this script and it does not yet wrap list items.
"""

import sys, json, re, os, textwrap

try:
    payload = json.load(sys.stdin)
except Exception:
    sys.exit(0)

delta = payload.get("delta", "")
final = bool(payload.get("final"))
mid = re.sub(r"[^A-Za-z0-9_-]", "", str(payload.get("message_id", "x")))[:64]
statef = "/tmp/.msgdisp-" + mid + ".json"

# Catppuccin Macchiato, measured against herdr's panel_bg #1e2030.
HEAD = "\x1b[38;2;138;173;244m"  # blue      7.18:1  headings, table frame
BORD = HEAD
ACC = "\x1b[38;2;240;198;198m"  # flamingo  10.42:1  labels, bullets, aside rule
DIM = "\x1b[38;2;128;135;162m"  # overlay1   4.53:1  aside text
WARN = "\x1b[38;2;245;169;127m"  # peach      8.33:1  warn-word labels
CODE = "\x1b[38;2;139;213;202m"  # teal       9.56:1  inline code
BDIM = "\x1b[38;2;73;77;100m"  # surface1   1.94:1  inner table rules only
B = "\x1b[1m"
R = "\x1b[0m"

WARNWORDS = ("warning", "caution", "caveat", "careful", "do not")
WIDTH = int(os.environ.get("CLAUDE_STYLER_WIDTH", "100"))

try:
    state = json.load(open(statef))
except Exception:
    state = {"fences": 0, "pending": []}


def plain(text):
    """Visible text: markdown markers and escapes removed, for width arithmetic."""
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    return re.sub(r"\x1b\[[0-9;]*m", "", text)


def inline(text, base=""):
    """Style code and bold spans. Inner spans close by restoring `base`, never by a
    bare reset, which would cancel the colour of the line they sit inside."""
    close = R + base
    text = re.sub(r"`([^`]+)`", lambda m: CODE + m.group(1) + close, text)
    return re.sub(r"\*\*([^*]+)\*\*", lambda m: B + m.group(1) + close, text)


def is_separator(cells):
    return all(re.fullmatch(r":?-{2,}:?", c.strip()) for c in cells if c.strip())


def colour_code_spans(text, source):
    for match in re.finditer(r"`([^`]+)`", source):
        if match.group(1) in text:
            text = text.replace(match.group(1), CODE + match.group(1) + R, 1)
    return text


def column_widths(grid, count):
    natural = [max(len(plain(row[i])) for row in grid) for i in range(count)]
    available = WIDTH - 3 * count - 1
    if sum(natural) <= available:
        return natural
    # Share the available space by each column's claim on it, but never crush a
    # narrow column below ten characters to feed a wide neighbour.
    widths = [max(min(natural[i], 10), int(available * natural[i] / sum(natural))) for i in range(count)]
    while sum(widths) > available and max(widths) > 10:
        widths[widths.index(max(widths))] -= 1
    return widths


def render_table(rows):
    grid = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows]
    grid = [row for row in grid if not is_separator(row)]
    if not grid:
        return []
    count = max(len(row) for row in grid)
    grid = [row + [""] * (count - len(row)) for row in grid]
    widths = column_widths(grid, count)

    def rule(left, mid_, right, colour=BORD):
        return colour + left + mid_.join("─" * (w + 2) for w in widths) + right + R

    pipe = BORD + "│" + R
    out = [rule("╭", "┬", "╮")]
    for index, row in enumerate(grid):
        wrapped = [textwrap.wrap(plain(cell), widths[i]) or [""] for i, cell in enumerate(row)]
        for line_no in range(max(len(cell) for cell in wrapped)):
            cells = []
            for i, segments in enumerate(wrapped):
                text = segments[line_no] if line_no < len(segments) else ""
                body = B + HEAD + text + R if index == 0 else colour_code_spans(text, row[i])
                cells.append(" " + body + " " * (widths[i] - len(text)) + " ")
            out.append(pipe + pipe.join(cells) + pipe)
        if index == 0:
            out.append(rule("├", "┼", "┤"))
        elif index < len(grid) - 1:
            out.append(rule("├", "┼", "┤", BDIM))
    out.append(rule("╰", "┴", "╯"))
    return out


def style_line(line):
    stripped = line.lstrip()
    if re.match(r"^#{1,6}\s", stripped):
        return B + HEAD + "▍ " + plain(re.sub(r"^#{1,6}\s+", "", stripped)) + R
    if re.fullmatch(r"(-{3,}|\*{3,}|_{3,})", stripped):
        return BORD + "─" * WIDTH + R
    if stripped.startswith(">"):
        text = plain(re.sub(r"^>\s?", "", stripped))
        return "\n".join(ACC + "┃ " + R + DIM + seg + R for seg in textwrap.wrap(text, WIDTH - 2) or [""])

    match = re.match(r"^(\s*(?:[-*+]\s+|\d+\.\s+)?)(.*)$", line)
    prefix, rest = match.group(1), match.group(2)
    if prefix.strip():
        prefix = re.sub(r"^(\s*)([-*+])(\s+)", lambda m: m.group(1) + ACC + "•" + R + m.group(3), prefix)
        prefix = re.sub(r"^(\s*)(\d+\.)(\s+)", lambda m: m.group(1) + ACC + m.group(2) + R + m.group(3), prefix)

    label = re.match(r"^(\*\*[^*]{1,44}:\*\*)(\s*)(.*)$", rest)
    if label:
        colour = WARN if any(word in label.group(1).lower() for word in WARNWORDS) else ACC
        # The reset lands after the whitespace that follows the label, never against
        # the closing asterisks. See constraint 2 in the module docstring.
        return prefix + colour + B + plain(label.group(1)) + R + label.group(2) + inline(label.group(3))
    return prefix + inline(rest)


lines = delta.split("\n")
trailing_newline = bool(lines) and lines[-1] == ""
if trailing_newline:
    lines = lines[:-1]

out = []
for line in lines:
    stripped = line.lstrip()
    if stripped.startswith("```"):
        if state["pending"]:
            out += render_table(state["pending"])
            state["pending"] = []
        state["fences"] += 1
        out.append(line)
        continue
    if state["fences"] % 2 == 1 or line.startswith("    "):
        out.append(line)
        continue
    if stripped.startswith("|"):
        state["pending"].append(line)
        continue
    if state["pending"]:
        out += render_table(state["pending"])
        state["pending"] = []
    out.append(line if stripped == "" else style_line(line))

if final and state["pending"]:
    out += render_table(state["pending"])
    state["pending"] = []

try:
    if final:
        os.path.exists(statef) and os.remove(statef)
    else:
        json.dump(state, open(statef, "w"))
except Exception:
    pass

body = "\n".join(out) + ("\n" if trailing_newline else "")
print(json.dumps({"hookSpecificOutput": {"hookEventName": "MessageDisplay", "displayContent": body}}))
