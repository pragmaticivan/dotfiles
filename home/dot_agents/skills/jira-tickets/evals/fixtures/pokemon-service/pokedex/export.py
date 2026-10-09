import csv
import io

MAX_ROWS = 151
COLUMNS = ["id", "name", "type", "generation"]


def export_csv(pokemon):
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=COLUMNS)
    writer.writeheader()
    for p in pokemon[:MAX_ROWS]:
        writer.writerow({c: p[c] for c in COLUMNS})
    return out.getvalue()
