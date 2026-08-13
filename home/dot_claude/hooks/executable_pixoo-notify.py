#!/usr/bin/python3
"""Show the Claude Code state on a Divoom Pixoo 64, and alert the Mac.

The script draws the full 64x64 frame here, then sends one picture to the
device. Thus the layout does not depend on the fonts of the device.

The device stays quiet. `terminal-notifier` shows a macOS notification with
the state, the project, and the message, and it plays a system sound.
Install it with `brew install terminal-notifier`.

The script uses the system Python, and not `env python3`. A Python that mise
installs can have no permission for the local network, thus it cannot reach
the device. The system Python has the permission, and it is always available.

Usage:
    pixoo-notify.py <event> [--host HOST] [--preview] [--dry-run]

Events: notification, stop, prompt, end, test
Hook data comes from stdin as JSON. The script exits 0 if the device is off.
"""

import argparse
import base64
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.request
from datetime import datetime

SIZE = 64
REQUEST_TIMEOUT = 1.2
NOTIFIER_PATHS = (
    "/opt/homebrew/bin/terminal-notifier",
    "/usr/local/bin/terminal-notifier",
)

BACKGROUND = (8, 8, 10)
DIVIDER = (38, 38, 46)
PRIMARY = (245, 245, 245)
MESSAGE = (128, 128, 138)

STATES = {
    "notification": {
        "words": ["NEEDS", "YOU"],
        "icon": "bell",
        "accent": (255, 159, 10),
        "notice": "Claude needs you",
        "fallback": "waiting for your answer",
        "sound": "Sosumi",
    },
    "stop": {
        "words": ["DONE"],
        "icon": "check",
        "accent": (48, 209, 88),
        "notice": "Claude is done",
        "fallback": "the turn is complete",
        "sound": "Glass",
    },
    "prompt": {
        "words": ["WORKING"],
        "icon": "hourglass",
        "accent": (10, 132, 255),
        "notice": None,
        "fallback": "",
        "sound": None,
    },
    "test": {
        "words": ["TEST"],
        "icon": "diamond",
        "accent": (191, 90, 242),
        "notice": "Pixoo notify test",
        "fallback": "the hook can reach the device",
        "sound": "Tink",
    },
}

# Each glyph is 3 pixels wide and 5 pixels high. The 5 groups are the rows.
GLYPHS_SMALL = {
    " ": "... ... ... ... ...",
    "A": ".#. #.# ### #.# #.#",
    "B": "##. #.# ##. #.# ##.",
    "C": ".## #.. #.. #.. .##",
    "D": "##. #.# #.# #.# ##.",
    "E": "### #.. ##. #.. ###",
    "F": "### #.. ##. #.. #..",
    "G": ".## #.. #.# #.# .##",
    "H": "#.# #.# ### #.# #.#",
    "I": "### .#. .#. .#. ###",
    "J": "..# ..# ..# #.# .#.",
    "K": "#.# #.# ##. #.# #.#",
    "L": "#.. #.. #.. #.. ###",
    "M": "#.# ### ### #.# #.#",
    "N": "##. #.# #.# #.# #.#",
    "O": ".#. #.# #.# #.# .#.",
    "P": "##. #.# ##. #.. #..",
    "Q": ".#. #.# #.# ##. .##",
    "R": "##. #.# ##. #.# #.#",
    "S": ".## #.. .#. ..# ##.",
    "T": "### .#. .#. .#. .#.",
    "U": "#.# #.# #.# #.# ###",
    "V": "#.# #.# #.# #.# .#.",
    "W": "#.# #.# ### ### #.#",
    "X": "#.# #.# .#. #.# #.#",
    "Y": "#.# #.# .#. .#. .#.",
    "Z": "### ..# .#. #.. ###",
    "0": "### #.# #.# #.# ###",
    "1": ".#. ##. .#. .#. ###",
    "2": "##. ..# .#. #.. ###",
    "3": "### ..# .## ..# ###",
    "4": "#.# #.# ### ..# ..#",
    "5": "### #.. ### ..# ###",
    "6": ".## #.. ### #.# ###",
    "7": "### ..# .#. .#. .#.",
    "8": "### #.# ### #.# ###",
    "9": "### #.# ### ..# ##.",
    ".": "... ... ... ... .#.",
    ",": "... ... ... .#. #..",
    ":": "... .#. ... .#. ...",
    ";": "... .#. ... .#. #..",
    "-": "... ... ### ... ...",
    "_": "... ... ... ... ###",
    "=": "... ### ... ### ...",
    "+": "... .#. ### .#. ...",
    "*": "#.# .#. #.# ... ...",
    "/": "..# ..# .#. #.. #..",
    "\\": "#.. #.. .#. ..# ..#",
    "!": ".#. .#. .#. ... .#.",
    "?": "##. ..# .#. ... .#.",
    "'": ".#. .#. ... ... ...",
    '"': "#.# #.# ... ... ...",
    "(": "..# .#. .#. .#. ..#",
    ")": "#.. .#. .#. .#. #..",
    "[": "### #.. #.. #.. ###",
    "]": "### ..# ..# ..# ###",
    "<": "..# .#. #.. .#. ..#",
    ">": "#.. .#. ..# .#. #..",
    "#": "#.# ### #.# ### #.#",
    "%": "#.# ..# .#. #.. #.#",
    "@": ".#. #.# ### #.. .##",
    "&": ".#. #.# .#. #.# .##",
    "$": ".## ##. .## ##. .#.",
}

# Each glyph is 5 pixels wide and 7 pixels high. The 7 groups are the rows.
GLYPHS_LARGE = {
    " ": "..... ..... ..... ..... ..... ..... .....",
    "A": ".###. #...# #...# ##### #...# #...# #...#",
    "B": "####. #...# #...# ####. #...# #...# ####.",
    "C": ".###. #...# #.... #.... #.... #...# .###.",
    "D": "####. #...# #...# #...# #...# #...# ####.",
    "E": "##### #.... #.... ####. #.... #.... #####",
    "F": "##### #.... #.... ####. #.... #.... #....",
    "G": ".###. #...# #.... #.### #...# #...# .###.",
    "H": "#...# #...# #...# ##### #...# #...# #...#",
    "I": "##### ..#.. ..#.. ..#.. ..#.. ..#.. #####",
    "J": "..### ...#. ...#. ...#. ...#. #..#. .##..",
    "K": "#...# #..#. #.#.. ##... #.#.. #..#. #...#",
    "L": "#.... #.... #.... #.... #.... #.... #####",
    "M": "#...# ##.## #.#.# #.#.# #...# #...# #...#",
    "N": "#...# ##..# #.#.# #.#.# #..## #...# #...#",
    "O": ".###. #...# #...# #...# #...# #...# .###.",
    "P": "####. #...# #...# ####. #.... #.... #....",
    "Q": ".###. #...# #...# #...# #.#.# #..#. .##.#",
    "R": "####. #...# #...# ####. #.#.. #..#. #...#",
    "S": ".#### #.... #.... .###. ....# ....# ####.",
    "T": "##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..",
    "U": "#...# #...# #...# #...# #...# #...# .###.",
    "V": "#...# #...# #...# #...# #...# .#.#. ..#..",
    "W": "#...# #...# #...# #.#.# #.#.# ##.## #...#",
    "X": "#...# #...# .#.#. ..#.. .#.#. #...# #...#",
    "Y": "#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..",
    "Z": "##### ....# ...#. ..#.. .#... #.... #####",
    "0": ".###. #...# #..## #.#.# ##..# #...# .###.",
    "1": "..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.",
    "2": ".###. #...# ....# ...#. ..#.. .#... #####",
    "3": "##### ...#. ..#.. ...#. ....# #...# .###.",
    "4": "...#. ..##. .#.#. #..#. ##### ...#. ...#.",
    "5": "##### #.... ####. ....# ....# #...# .###.",
    "6": "..##. .#... #.... ####. #...# #...# .###.",
    "7": "##### ....# ...#. ..#.. .#... .#... .#...",
    "8": ".###. #...# #...# .###. #...# #...# .###.",
    "9": ".###. #...# #...# .#### ....# ...#. .##..",
    ":": "..... ..#.. ..#.. ..... ..#.. ..#.. .....",
    "-": "..... ..... ..... ##### ..... ..... .....",
    ".": "..... ..... ..... ..... ..... .##.. .##..",
}

SMALL = {"glyphs": GLYPHS_SMALL, "advance": 4}
LARGE = {"glyphs": GLYPHS_LARGE, "advance": 6}

# Each icon is 16 by 16 pixels. It carries the state at a glance, from far away.
ICONS = {
    "bell": """
.......##.......
......####......
.....######.....
....########....
....########....
...##########...
...##########...
..############..
..############..
.##############.
.##############.
################
................
......####......
......####......
................
""",
    "check": """
................
................
..............##
.............###
............###.
...........###..
..........###...
.##......###....
.###....###.....
.####..###......
..########......
...######.......
....####........
.....##.........
................
................
""",
    "hourglass": """
################
.##############.
.##############.
..############..
...##########...
....########....
.....######.....
......####......
......####......
.....#....#.....
....#......#....
...#........#...
..#..........#..
.#............#.
.##############.
################
""",
    "diamond": """
.......##.......
......####......
.....######.....
....########....
...##########...
..############..
.##############.
################
################
.##############.
..############..
...##########...
....########....
.....######.....
......####......
.......##.......
""",
}

COLUMNS = 15
HEADLINE_X = 20
DETAIL_TOP = 25
DETAIL_HEIGHT = 27
DETAIL_STEP = 7


class Canvas:
    """Hold one 64x64 RGB frame."""

    def __init__(self, color):
        self.pixels = bytearray(bytes(color) * SIZE * SIZE)

    def rect(self, x, y, width, height, color):
        for row in range(max(y, 0), min(y + height, SIZE)):
            for column in range(max(x, 0), min(x + width, SIZE)):
                offset = (row * SIZE + column) * 3
                self.pixels[offset : offset + 3] = bytes(color)

    def text(self, x, y, value, color, font=SMALL):
        cursor = x
        for character in value.upper():
            glyph = font["glyphs"].get(character) or font["glyphs"][" "]
            for row, bits in enumerate(glyph.split(" ")):
                for column, bit in enumerate(bits):
                    if bit == "#":
                        self.rect(cursor + column, y + row, 1, 1, color)
            cursor += font["advance"]

    def icon(self, x, y, name, color):
        for row, bits in enumerate(ICONS[name].strip().splitlines()):
            for column, bit in enumerate(bits):
                if bit == "#":
                    self.rect(x + column, y + row, 1, 1, color)

    def encode(self):
        return base64.b64encode(bytes(self.pixels)).decode()

    def preview(self):
        """Return the frame as terminal half blocks, to check it without a device."""
        lines = []
        for row in range(0, SIZE, 2):
            line = ""
            for column in range(SIZE):
                top = (row * SIZE + column) * 3
                bottom = ((row + 1) * SIZE + column) * 3
                line += "\x1b[38;2;{};{};{}m\x1b[48;2;{};{};{}m▀".format(
                    *self.pixels[top : top + 3], *self.pixels[bottom : bottom + 3]
                )
            lines.append(line + "\x1b[0m")
        return "\n".join(lines)


def wrap(value, width, limit):
    """Cut text into at most `limit` lines of `width` characters."""
    words = value.split()
    lines = []
    current = ""
    for word in words:
        while len(word) > width:
            if current:
                lines.append(current)
                current = ""
            lines.append(word[:width])
            word = word[width:]
        candidate = f"{current} {word}".strip()
        if len(candidate) > width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines[:limit]


def git_branch(path):
    """Read the branch from .git/HEAD. A worktree keeps .git as a file."""
    directory = os.path.abspath(path)
    while True:
        marker = os.path.join(directory, ".git")
        if os.path.isdir(marker):
            head = os.path.join(marker, "HEAD")
            break
        if os.path.isfile(marker):
            head = os.path.join(read_gitdir(marker, directory), "HEAD")
            break
        parent = os.path.dirname(directory)
        if parent == directory:
            return ""
        directory = parent
    try:
        with open(head, encoding="utf-8") as handle:
            content = handle.read().strip()
    except OSError:
        return ""
    if content.startswith("ref: refs/heads/"):
        return content[len("ref: refs/heads/") :]
    return content[:7]


def read_gitdir(marker, directory):
    try:
        with open(marker, encoding="utf-8") as handle:
            content = handle.read().strip()
    except OSError:
        return ""
    if not content.startswith("gitdir: "):
        return ""
    path = content[len("gitdir: ") :]
    return path if os.path.isabs(path) else os.path.join(directory, path)


def read_hook_input():
    if sys.stdin.isatty():
        return {}
    try:
        raw = sys.stdin.read()
    except OSError:
        return {}
    if not raw.strip():
        return {}
    try:
        data = json.loads(raw)
    except ValueError:
        return {}
    return data if isinstance(data, dict) else {}


def dim(color, factor=0.62):
    return tuple(int(channel * factor) for channel in color)


def detail_text(hook_input):
    """Keep the useful part of the message. The headline gives the state."""
    message = str(hook_input.get("message") or "")
    permission = re.search(r"permission to use (\w+)", message, re.IGNORECASE)
    if permission:
        return f"allow {permission.group(1)}?"
    return re.sub(r"^claude\s+(is\s+)?", "", message, flags=re.IGNORECASE)


def project_name(cwd):
    return os.path.basename(cwd.rstrip("/")) or "/"


def detail_lines(hook_input, accent):
    cwd = hook_input.get("cwd") or os.getcwd()
    project = project_name(cwd)
    lines = [(project[:COLUMNS], PRIMARY)]
    branch = git_branch(cwd)
    if branch:
        lines.append((branch[:COLUMNS], dim(accent)))
    for line in wrap(detail_text(hook_input), COLUMNS, 2):
        lines.append((line, MESSAGE))
    return lines


def build_frame(event, hook_input, now):
    state = STATES[event]
    accent = state["accent"]
    canvas = Canvas(BACKGROUND)

    canvas.rect(0, 0, SIZE, 2, accent)
    canvas.icon(2, 4, state["icon"], accent)

    words = state["words"]
    if len(words) == 1:
        canvas.text(HEADLINE_X, 9, words[0], accent, LARGE)
    else:
        canvas.text(HEADLINE_X, 4, words[0], accent, LARGE)
        canvas.text(HEADLINE_X, 13, words[1], accent, LARGE)

    canvas.rect(2, 22, SIZE - 4, 1, DIVIDER)

    lines = detail_lines(hook_input, accent)
    block = DETAIL_STEP * len(lines) - 2
    top = DETAIL_TOP + max(DETAIL_HEIGHT - block, 0) // 2
    for index, (line, color) in enumerate(lines):
        canvas.text(1, top + index * DETAIL_STEP, line, color)

    canvas.rect(2, 53, SIZE - 4, 1, DIVIDER)
    canvas.text(2, 56, now.strftime("%H:%M"), PRIMARY, LARGE)
    canvas.rect(58, 57, 4, 4, accent)
    return canvas


def post(host, payload):
    request = urllib.request.Request(
        f"http://{host}/post",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
        return response.read().decode(errors="replace")


def notifier():
    """Find terminal-notifier. The hook can run with a short PATH."""
    found = shutil.which("terminal-notifier")
    if found:
        return found
    return next((path for path in NOTIFIER_PATHS if os.path.exists(path)), "")


def notify(event, hook_input):
    """Show a macOS notification and play a system sound."""
    state = STATES[event]
    if not state["notice"]:
        return
    path = notifier()
    if not path:
        print("no terminal-notifier: brew install terminal-notifier", file=sys.stderr)
        return
    cwd = hook_input.get("cwd") or os.getcwd()
    project = project_name(cwd)
    branch = git_branch(cwd)
    command = [
        path,
        "-title",
        state["notice"],
        "-subtitle",
        f"{project} · {branch}" if branch else project,
        "-message",
        detail_text(hook_input).strip() or state["fallback"],
        "-sound",
        state["sound"],
        "-group",
        f"pixoo-notify.{project}",
    ]
    try:
        subprocess.Popen(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except OSError as error:
        print(f"cannot notify: {error}", file=sys.stderr)


def send(host, canvas):
    post(host, {"Command": "Draw/ResetHttpGifId"})
    post(
        host,
        {
            "Command": "Draw/SendHttpGif",
            "PicNum": 1,
            "PicWidth": SIZE,
            "PicOffset": 0,
            "PicID": 1,
            "PicSpeed": 1000,
            "PicData": canvas.encode(),
        },
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("event", choices=sorted(STATES) + ["end"])
    parser.add_argument("--host", default=os.environ.get("PIXOO_HOST", ""))
    parser.add_argument("--preview", action="store_true", help="print the frame")
    parser.add_argument("--dry-run", action="store_true", help="do not touch the device")
    arguments = parser.parse_args()

    strict = arguments.event == "test"
    if os.environ.get("PIXOO_NOTIFY_DISABLE") and not strict:
        return 0
    hook_input = read_hook_input()
    if arguments.event != "end" and not arguments.dry_run:
        notify(arguments.event, hook_input)
    if not arguments.host:
        print("no Pixoo host: set --host or PIXOO_HOST", file=sys.stderr)
        return 1 if strict else 0

    if arguments.event == "end":
        if not arguments.dry_run:
            try:
                post(arguments.host, {"Command": "Channel/SetIndex", "SelectIndex": 0})
            except Exception:
                return 0
        return 0

    canvas = build_frame(arguments.event, hook_input, datetime.now())
    if arguments.preview:
        print(canvas.preview())
    if arguments.dry_run:
        return 0

    try:
        send(arguments.host, canvas)
    except Exception as error:
        print(f"pixoo {arguments.host} unreachable: {error}", file=sys.stderr)
        return 1 if strict else 0
    if strict:
        print(f"pixoo {arguments.host}: frame sent")
    return 0


if __name__ == "__main__":
    sys.exit(main())
