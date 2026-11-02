#!/usr/bin/env bash
# Run the benchmark for each task: 3 decider runs from an empty Ollama cache, the LLM prompts, then the score table.
set -euo pipefail

cd "$(dirname "$0")"
out="${DECIDER_BENCH_OUT:-$HOME/.cache/decider-bench}"
if (($#)); then
	tasks=("$@")
else
	tasks=(commit_type docs_only test_failures grep_relevance review_comments playbook_routing)
fi

for task in "${tasks[@]}"; do
	for run in 1 2 3; do
		ollama stop strands-decider
		python3 -I bench.py prepare "$task" --run "$run"
	done
	./run_llm.sh "$out/$task" >/dev/null
done
python3 -I bench.py score "${tasks[@]}" | tee "$out/table.md"
