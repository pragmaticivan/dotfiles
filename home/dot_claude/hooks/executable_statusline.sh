#!/bin/bash
INPUT=$(cat)

command -v jq >/dev/null 2>&1 || exit 0

# Catppuccin Macchiato — true-color ANSI
R=$'\033[0m'
B=$'\033[1m'
C_MAUVE=$'\033[38;2;198;160;246m'
C_BLUE=$'\033[38;2;138;173;244m'
C_LAVENDER=$'\033[38;2;183;192;247m'
C_TEAL=$'\033[38;2;139;213;202m'
C_GREEN=$'\033[38;2;166;218;149m'
C_YELLOW=$'\033[38;2;238;212;159m'
C_PEACH=$'\033[38;2;245;169;127m'
C_RED=$'\033[38;2;237;135;150m'
C_TEXT=$'\033[38;2;202;211;245m'
C_OVERLAY=$'\033[38;2;110;115;141m'

SEP=" ${C_OVERLAY}·${R} "

MODEL=$(printf '%s' "$INPUT" | jq -r '.model.display_name // .model.id // ""')
CTX_PCT=$(printf '%s' "$INPUT" | jq -r '(.context_window.used_percentage // 0) | floor' 2>/dev/null || echo 0)
EXCEEDS=$(printf '%s' "$INPUT" | jq -r '.exceeds_200k_tokens // false' 2>/dev/null)
COST_RAW=$(printf '%s' "$INPUT" | jq -r '.cost.total_cost_usd // 0' 2>/dev/null)
LINES_ADDED=$(printf '%s' "$INPUT" | jq -r '.cost.total_lines_added // 0' 2>/dev/null)
LINES_REMOVED=$(printf '%s' "$INPUT" | jq -r '.cost.total_lines_removed // 0' 2>/dev/null)
AGENT=$(printf '%s' "$INPUT" | jq -r '.agent.name // ""' 2>/dev/null)
VIM_MODE=$(printf '%s' "$INPUT" | jq -r '.vim.mode // ""' 2>/dev/null)
RATE=$(printf '%s' "$INPUT" | jq -r '
  if .rate_limits then [
    if (.rate_limits.five_hour.used_percentage // 0) > 70
    then ("5h:" + (.rate_limits.five_hour.used_percentage | floor | tostring) + "%")
    else empty end,
    if (.rate_limits.seven_day.used_percentage // 0) > 70
    then ("7d:" + (.rate_limits.seven_day.used_percentage | floor | tostring) + "%")
    else empty end
  ] | join(" ")
  else "" end
' 2>/dev/null)

BRANCH=$(printf '%s' "$INPUT" | jq -r '.worktree.branch // ""' 2>/dev/null)
if [ -z "$BRANCH" ]; then
  WS=$(printf '%s' "$INPUT" | jq -r '.workspace.current_dir // .workspace.project_dir // ""' 2>/dev/null)
  [ -n "$WS" ] && BRANCH=$(git -C "$WS" rev-parse --abbrev-ref HEAD 2>/dev/null || true)
fi

ctx_bar() {
  local pct=${1:-0}
  local filled=$(( pct / 10 ))
  local bar_color
  if   [ "$pct" -ge 90 ]; then bar_color="$C_RED"
  elif [ "$pct" -ge 75 ]; then bar_color="$C_PEACH"
  elif [ "$pct" -ge 50 ]; then bar_color="$C_YELLOW"
  else bar_color="$C_GREEN"
  fi
  printf '%s' "$bar_color"
  for ((i=0; i<filled; i++)); do printf '█'; done
  printf '%s' "$C_OVERLAY"
  for ((i=filled; i<10; i++)); do printf '░'; done
  printf '%s' "$R"
}

PARTS=()

[ -n "$MODEL" ] && PARTS+=("${B}${C_MAUVE}${MODEL}${R}")

if [ "$EXCEEDS" = "true" ]; then
  PARTS+=("${C_RED}██████████${R} ${B}${C_RED}100%!${R}")
else
  PARTS+=("$(ctx_bar "$CTX_PCT") ${C_TEXT}${CTX_PCT}%${R}")
fi

if awk "BEGIN { exit !($COST_RAW > 0.001) }" 2>/dev/null; then
  COST=$(awk "BEGIN { printf \"%.2f\", $COST_RAW }")
  PARTS+=("${C_YELLOW}\$${COST}${R}")
fi

if [ "${LINES_ADDED:-0}" -gt 0 ] || [ "${LINES_REMOVED:-0}" -gt 0 ]; then
  PARTS+=("${C_GREEN}+${LINES_ADDED}${R}${C_OVERLAY}/${R}${C_RED}-${LINES_REMOVED}${R}")
fi

[ -n "$RATE" ]     && PARTS+=("${C_PEACH}⚠ ${RATE}${R}")
[ -n "$AGENT" ]    && PARTS+=("${C_TEAL}⊕ ${AGENT}${R}")
[ -n "$VIM_MODE" ] && PARTS+=("${C_LAVENDER}[${VIM_MODE}]${R}")
[ -n "$BRANCH" ] && [ "$BRANCH" != "HEAD" ] && PARTS+=("${C_BLUE}⎇ ${BRANCH}${R}")

out=""
for i in "${!PARTS[@]}"; do
  [ "$i" -eq 0 ] && { out="${PARTS[$i]}"; continue; }
  out+="${SEP}${PARTS[$i]}"
done
printf '%s\n' "$out"
