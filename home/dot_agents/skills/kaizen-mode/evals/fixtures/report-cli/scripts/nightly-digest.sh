#!/usr/bin/env bash
set -euo pipefail
node cli/main.ts report data/usage.json | awk 'NR > 1 && NR <= 3 { print $1 ": " $4 "% errors" }'
