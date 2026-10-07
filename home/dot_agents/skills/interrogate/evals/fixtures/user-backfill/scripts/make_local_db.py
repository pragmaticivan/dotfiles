"""Create a small local users database for development.

Usage: python3 scripts/make_local_db.py <database-path>
"""
import sqlite3
import sys

ROWS = [
    (1, "ana@example.com", "81.2.69.160", "eu-west"),
    (2, "ben@example.com", "203.0.113.9", None),
    (3, "cy@example.com", None, "us-east"),
    (4, "dee@example.com", "not-an-ip", None),
    (5, "eli@example.com", "198.51.100.20", None),
]

conn = sqlite3.connect(sys.argv[1])
conn.execute("DROP TABLE IF EXISTS users")
conn.execute(
    "CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL, last_login_ip TEXT, region TEXT)"
)
conn.executemany("INSERT INTO users VALUES (?, ?, ?, ?)", ROWS)
conn.commit()
