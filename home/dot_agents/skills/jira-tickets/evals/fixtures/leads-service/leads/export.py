import csv
import io

MAX_ROWS = 10_000
COLUMNS = ["id", "agency_id", "status", "created_at"]


def export_csv(leads):
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=COLUMNS)
    writer.writeheader()
    for lead in leads[:MAX_ROWS]:
        writer.writerow({c: lead[c] for c in COLUMNS})
    return out.getvalue()
