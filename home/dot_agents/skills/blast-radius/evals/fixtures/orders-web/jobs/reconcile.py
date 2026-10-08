"""Nightly job. Loads the order export and the ledger rows and matches them by timestamp."""
import json
import sys
from datetime import datetime

FMT = "%Y-%m-%dT%H:%M:%S.%fZ"

for line in open(sys.argv[1]):
    row = json.loads(line)
    placed = datetime.strptime(row["placed_at"], FMT)
    due = datetime.strptime(row["due_at"], FMT)
    print(row["id"], placed.isoformat(), (due - placed).days, "days")
