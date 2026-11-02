#!/usr/bin/env bash
# Send each prompt file in a results directory to the LLM, and keep the JSON reply and the wall time beside it.
set -euo pipefail

dir="$1"
model="${2:-haiku}"

for prompt in "$dir"/r*-*.txt; do
	[[ -e "$prompt.json" ]] && continue
	start=$(python3 -c 'import time; print(time.time())')
	claude -p --model "$model" \
		--system-prompt "You classify items. Reply with only JSON." \
		--tools "" --setting-sources "" --strict-mcp-config --no-session-persistence \
		--output-format json <"$prompt" >"$prompt.json.tmp"
	end=$(python3 -c 'import time; print(time.time())')
	python3 -c "print(round(($end - $start) * 1000))" >"$prompt.wall"
	mv "$prompt.json.tmp" "$prompt.json"
	echo "$(basename "$prompt") done"
done
