import sqlite3


def connect():
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE orders (id INTEGER PRIMARY KEY, customer TEXT, total_cents INTEGER)")
    conn.executemany(
        "INSERT INTO orders VALUES (?, ?, ?)",
        [(i, f"customer-{i:03d}", 1000 + i * 37) for i in range(1, 26)],
    )
    return conn
