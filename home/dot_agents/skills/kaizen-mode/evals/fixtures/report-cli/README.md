# usage-tools

Command-line tools for the per-team request usage export.

## report

```
node cli/main.ts report [file]
```

Prints one row for each team, sorted by error rate. The default file is `data/usage.json`.
The output is a plain text table. `scripts/nightly-digest.sh` reads the table, so keep the column order stable.
