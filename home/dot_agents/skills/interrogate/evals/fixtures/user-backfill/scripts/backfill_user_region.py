"""Backfill users.region from the last login IP.

Usage: python3 scripts/backfill_user_region.py <database-path>
"""
import csv
import ipaddress
import sqlite3
import sys

GEO_TABLE = "data/ip_regions.csv"
BATCH_SIZE = 1000


def load_ranges(path):
    with open(path, newline="") as fh:
        return [(ipaddress.ip_network(row["cidr"]), row["region"]) for row in csv.DictReader(fh)]


def lookup_region(ranges, ip):
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return None
    for network, region in ranges:
        if addr in network:
            return region
    return None


def main(db_path):
    ranges = load_ranges(GEO_TABLE)
    conn = sqlite3.connect(db_path)
    users = conn.execute("SELECT id, last_login_ip FROM users").fetchall()
    updated = 0
    for user_id, ip in users:
        region = lookup_region(ranges, ip)
        conn.execute("UPDATE users SET region = ? WHERE id = ?", (region, user_id))
        updated += 1
        if updated % BATCH_SIZE == 0:
            conn.commit()
    conn.commit()
    print(f"updated {updated} users")


if __name__ == "__main__":
    main(sys.argv[1])
