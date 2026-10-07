"""Nightly order export. Cron runs: python3 reports/export_csv.py --out /var/exports/orders.csv"""
import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from source import connect

PAGE_SIZE = 10


def fetch_all(conn):
    total = conn.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    offset = 0
    while offset < total:
        end = min(offset + PAGE_SIZE, total - 1)
        yield from conn.execute(
            "SELECT id, customer, total_cents FROM orders ORDER BY id LIMIT ? OFFSET ?",
            (end - offset, offset),
        )
        offset += PAGE_SIZE


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    with open(args.out, "w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["id", "customer", "total_cents"])
        count = 0
        for row in fetch_all(connect()):
            writer.writerow(row)
            count += 1
    print(f"exported {count} rows to {args.out}")


if __name__ == "__main__":
    main()
