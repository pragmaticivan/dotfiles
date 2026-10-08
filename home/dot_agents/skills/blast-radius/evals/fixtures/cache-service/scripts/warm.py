"""Reads the cache snapshot at deploy time and reports which parents to prefetch."""
import json
import sys

snap = json.load(open(sys.argv[1]))
live = {k for k, _ in snap["entries"]}
for parent, children in snap["deps"]:
    missing = [c for c in children if c not in live]
    print(f"{parent}: {len(children)} deps, {len(missing)} cold")
