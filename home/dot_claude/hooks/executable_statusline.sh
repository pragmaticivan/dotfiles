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
C_PINK=$'\033[38;2;245;140;174m'
C_TEXT=$'\033[38;2;202;211;245m'
C_OVERLAY=$'\033[38;2;110;115;141m'

SEP=" ${C_OVERLAY}│${R} "

jqr() { printf '%s' "$INPUT" | jq -r "$1" 2>/dev/null; }

is_num()  { [[ "$1" =~ ^[0-9]+$ ]]; }
is_real() { [[ "$1" =~ ^-?[0-9]+(\.[0-9]+)?$ ]]; }

truncate_str() {
  local s=$1 max=$2
  if [ "${#s}" -gt "$max" ]; then
    printf '%s…' "${s:0:$((max - 1))}"
  else
    printf '%s' "$s"
  fi
}

fmt_k() {
  local n=$1
  is_num "$n" || { printf '%s' "$n"; return; }
  if [ "$n" -ge 1000 ]; then
    awk "BEGIN { printf \"%.1fk\", $n / 1000 }"
  else
    printf '%s' "$n"
  fi
}

fmt_duration() {
  local ms=$1
  is_num "$ms" || return
  local s=$(( ms / 1000 ))
  [ "$s" -lt 5 ] && return
  if   [ "$s" -lt 60 ];   then printf '%ds' "$s"
  elif [ "$s" -lt 3600 ]; then printf '%dm' "$((s / 60))"
  else printf '%dh%02dm' "$((s / 3600))" "$(((s % 3600) / 60))"
  fi
}

# Smooth 8-cell bar with sub-block partials (≈1.5% resolution)
ctx_bar() {
  local pct=${1:-0}
  local width=8
  local eighths=$(( pct * width * 8 / 100 ))
  [ "$eighths" -lt 0 ] && eighths=0
  [ "$eighths" -gt $((width * 8)) ] && eighths=$((width * 8))
  local full=$(( eighths / 8 ))
  local partial=$(( eighths % 8 ))

  local color
  if   [ "$pct" -ge 90 ]; then color="$C_RED"
  elif [ "$pct" -ge 75 ]; then color="$C_PEACH"
  elif [ "$pct" -ge 50 ]; then color="$C_YELLOW"
  else                         color="$C_GREEN"
  fi

  printf '%s' "$color"
  local i
  for ((i = 0; i < full; i++)); do printf '█'; done
  if [ "$full" -lt "$width" ] && [ "$partial" -gt 0 ]; then
    case "$partial" in
      1) printf '▏' ;; 2) printf '▎' ;; 3) printf '▍' ;; 4) printf '▌' ;;
      5) printf '▋' ;; 6) printf '▊' ;; 7) printf '▉' ;;
    esac
    full=$((full + 1))
  fi
  printf '%s' "$C_OVERLAY"
  for ((i = full; i < width; i++)); do printf '░'; done
  printf '%s' "$R"
}

# Model (official schema: object with id/display_name; defensive against plain string)
raw_model=$(jqr 'if (.model | type) == "object" then (.model.display_name // .model.id // "") else (.model // "") end')
shorten_model() {
  case "$1" in
    *opus-4*)     printf 'Opus 4' ;;
    *sonnet-4*)   printf 'Sonnet 4' ;;
    *haiku-4*)    printf 'Haiku 4' ;;
    *opus-3-5*)   printf 'Opus 3.5' ;;
    *sonnet-3-5*) printf 'Sonnet 3.5' ;;
    *haiku-3-5*)  printf 'Haiku 3.5' ;;
    *opus-3*)     printf 'Opus 3' ;;
    *sonnet-3*)   printf 'Sonnet 3' ;;
    *haiku-3*)    printf 'Haiku 3' ;;
    *)            printf '%s' "$1" ;;
  esac
}
MODEL=$(shorten_model "$raw_model")

# Context window
CTX_PCT=$(jqr '(.context_window.used_percentage // 0) | floor')
CTX_USED=$(jqr '.context_window.current_tokens // .context_window.used // 0')
is_num "$CTX_PCT"  || CTX_PCT=0
is_num "$CTX_USED" || CTX_USED=0

EXCEEDS_200K=$(jqr '.exceeds_200k_tokens // false')

# Cost (official schema: cost.total_cost_usd; fall back to flat fields for other versions)
COST_RAW=$(jqr '.cost.total_cost_usd // .cost_usd // .session_cost_usd // 0')
is_real "$COST_RAW" || COST_RAW=0

# Session duration (API time, from cost.total_duration_ms)
DURATION_MS=$(jqr '.cost.total_duration_ms // 0')
is_num "$DURATION_MS" || DURATION_MS=0

# Lines diff (official path first)
LINES_ADDED=$(jqr '(.cost.total_lines_added // .total_lines_added // 0) | if type == "number" then . else 0 end')
LINES_REMOVED=$(jqr '(.cost.total_lines_removed // .total_lines_removed // 0) | if type == "number" then . else 0 end')
is_num "$LINES_ADDED"   || LINES_ADDED=0
is_num "$LINES_REMOVED" || LINES_REMOVED=0

TURNS=$(jqr '.num_turns // .turns // 0')
is_num "$TURNS" || TURNS=0

AGENT=$(jqr '.agent.name // .subagent_name // ""')
VIM_MODE=$(jqr '.vim_mode // .vim.mode // ""')

OUTPUT_STYLE=$(jqr '.output_style.name // ""')
[ "$OUTPUT_STYLE" = "default" ] && OUTPUT_STYLE=""

# Rate-limit warnings (only show >70%)
RATE=$(jqr '
  if .rate_limits then [
    if ((.rate_limits.five_hour.used_percentage // .rate_limits["5h"].used_percentage // 0) > 70)
    then "5h:" + ((.rate_limits.five_hour.used_percentage // .rate_limits["5h"].used_percentage) | floor | tostring) + "%"
    else empty end,
    if ((.rate_limits.seven_day.used_percentage // .rate_limits["7d"].used_percentage // 0) > 70)
    then "7d:" + ((.rate_limits.seven_day.used_percentage // .rate_limits["7d"].used_percentage) | floor | tostring) + "%"
    else empty end
  ] | join(" ")
  else "" end
')

# Working directory → project + branch + dirty
CWD=$(jqr '.cwd // .workspace.current_dir // .workspace.project_dir // ""')
PROJECT=""
[ -n "$CWD" ] && PROJECT=$(basename "$CWD")

BRANCH=$(jqr '.git_branch // .worktree.branch // ""')
if [ -z "$BRANCH" ] && [ -n "$CWD" ]; then
  BRANCH=$(git -C "$CWD" rev-parse --abbrev-ref HEAD 2>/dev/null)
fi

# Detached HEAD → short SHA (or suppress if not resolvable)
if [ "$BRANCH" = "HEAD" ]; then
  short_sha=""
  [ -n "$CWD" ] && short_sha=$(git -C "$CWD" rev-parse --short HEAD 2>/dev/null)
  BRANCH="${short_sha:+@$short_sha}"
fi

# Dirty tree (staged or unstaged vs HEAD; single git call)
DIRTY=""
if [ -n "$CWD" ] && [ -n "$BRANCH" ]; then
  if ! git -C "$CWD" diff --quiet HEAD --ignore-submodules 2>/dev/null; then
    DIRTY="${C_PEACH}*${R}"
  fi
fi

PARTS=()

[ -n "$MODEL" ] && PARTS+=("${B}${C_MAUVE}${MODEL}${R}")

# Vim mode (single-letter badge, uppercase-insensitive)
if [ -n "$VIM_MODE" ]; then
  case "$(printf '%s' "$VIM_MODE" | tr '[:lower:]' '[:upper:]')" in
    INSERT)  PARTS+=("${B}${C_GREEN}I${R}") ;;
    NORMAL)  PARTS+=("${B}${C_BLUE}N${R}") ;;
    VISUAL)  PARTS+=("${B}${C_MAUVE}V${R}") ;;
    REPLACE) PARTS+=("${B}${C_RED}R${R}") ;;
    *)       PARTS+=("${C_LAVENDER}${VIM_MODE}${R}") ;;
  esac
fi

# Output style (only when non-default)
[ -n "$OUTPUT_STYLE" ] && PARTS+=("${C_PINK}${OUTPUT_STYLE}${R}")

# Context window
if [ "$EXCEEDS_200K" = "true" ]; then
  PARTS+=("${B}${C_RED}████████ 200k+${R}")
elif [ "$CTX_PCT" -ge 95 ]; then
  PARTS+=("${B}${C_RED}████████ ${CTX_PCT}%${R}")
else
  suffix=""
  [ "$CTX_USED" -gt 0 ] && suffix=" ${C_OVERLAY}$(fmt_k "$CTX_USED")${R}"
  PARTS+=("$(ctx_bar "$CTX_PCT") ${C_TEXT}${CTX_PCT}%${R}${suffix}")
fi

# Cost
if awk "BEGIN { exit !(${COST_RAW} + 0 > 0.001) }" 2>/dev/null; then
  COST_FMT=$(awk "BEGIN { printf \"%.2f\", ${COST_RAW} }")
  PARTS+=("${C_YELLOW}\$${COST_FMT}${R}")
fi

# Lines diff
if [ "$LINES_ADDED" -gt 0 ] || [ "$LINES_REMOVED" -gt 0 ]; then
  PARTS+=("${C_GREEN}+${LINES_ADDED}${R}${C_OVERLAY}/${R}${C_RED}-${LINES_REMOVED}${R}")
fi

# Turn count
[ "$TURNS" -gt 0 ] && PARTS+=("${C_OVERLAY}${TURNS}t${R}")

# Session duration
DUR=$(fmt_duration "$DURATION_MS")
[ -n "$DUR" ] && PARTS+=("${C_OVERLAY}${DUR}${R}")

# Rate limit warning
[ -n "$RATE" ] && PARTS+=("${C_PEACH}⚠ ${RATE}${R}")

# Active subagent
[ -n "$AGENT" ] && PARTS+=("${C_TEAL}⊕ $(truncate_str "$AGENT" 20)${R}")

# Project (basename of cwd)
[ -n "$PROJECT" ] && PARTS+=("${C_LAVENDER}$(truncate_str "$PROJECT" 24)${R}")

# Git branch + dirty marker
[ -n "$BRANCH" ] && PARTS+=("${C_BLUE}⎇ $(truncate_str "$BRANCH" 24)${R}${DIRTY}")

out=""
for i in "${!PARTS[@]}"; do
  [ "$i" -eq 0 ] && { out="${PARTS[$i]}"; continue; }
  out+="${SEP}${PARTS[$i]}"
done
printf '%s\n' "$out"
