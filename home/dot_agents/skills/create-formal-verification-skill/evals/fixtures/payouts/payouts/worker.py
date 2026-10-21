"""Payout worker. Several worker processes run this loop against one SQLite file."""

import sqlite3

from payouts.bank import send_transfer


def connect(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path, isolation_level=None)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS payouts ("
        " id INTEGER PRIMARY KEY, account TEXT, cents INTEGER,"
        " status TEXT NOT NULL DEFAULT 'pending', worker TEXT)"
    )
    return conn


def claim(conn: sqlite3.Connection, payout_id: int, worker: str) -> bool:
    row = conn.execute("SELECT status FROM payouts WHERE id = ?", (payout_id,)).fetchone()
    if row is None or row[0] != "pending":
        return False
    conn.execute("UPDATE payouts SET status = 'claimed', worker = ? WHERE id = ?", (worker, payout_id))
    return True


def finish(conn: sqlite3.Connection, payout_id: int, ok: bool) -> None:
    conn.execute("UPDATE payouts SET status = ? WHERE id = ?", ("paid" if ok else "pending", payout_id))


def run_once(conn: sqlite3.Connection, worker: str) -> int:
    paid = 0
    for (payout_id, account, cents) in conn.execute(
        "SELECT id, account, cents FROM payouts WHERE status = 'pending' ORDER BY id"
    ).fetchall():
        if not claim(conn, payout_id, worker):
            continue
        ok = send_transfer(account, cents, idempotency_key=f"{payout_id}-{worker}")
        finish(conn, payout_id, ok)
        paid += ok
    return paid
