"""Client for the bank transfer API. The bank dedupes on idempotency_key only."""

SENT: list[tuple[str, int, str]] = []


def send_transfer(account: str, cents: int, idempotency_key: str) -> bool:
    if any(key == idempotency_key for (_, _, key) in SENT):
        return True
    SENT.append((account, cents, idempotency_key))
    return True
