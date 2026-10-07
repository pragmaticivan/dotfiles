#!/usr/bin/env bash
set -euo pipefail

export GIT_AUTHOR_NAME="Dana Reyes" GIT_AUTHOR_EMAIL="dana@example.com"
export GIT_COMMITTER_NAME="Dana Reyes" GIT_COMMITTER_EMAIL="dana@example.com"

save() {
  export GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1"
  git add -A -- . ':!setup.sh'
  git commit -q -m "$2"
}

git init -q -b main
mkdir -p webhooks tests

cat > README.md <<'EOF'
# webhook-service

Receives Stripe events and forwards them to internal subscribers.
Failed deliveries retry with exponential backoff.

Run the tests with `python3 -m unittest`.
EOF

: > webhooks/__init__.py
: > tests/__init__.py

cat > webhooks/retry.py <<'EOF'
import time

MAX_ATTEMPTS = 5
BASE_DELAY = 1.0
MAX_DELAY = 60.0


class DeliveryError(Exception):
    def __init__(self, status, retry_after=None):
        super().__init__(f"delivery failed with status {status}")
        self.status = status
        self.retry_after = retry_after


def backoff_delay(attempt):
    return min(MAX_DELAY, BASE_DELAY * (2 ** attempt))


def deliver_with_retry(send, event, sleep=time.sleep):
    for attempt in range(MAX_ATTEMPTS):
        try:
            return send(event)
        except DeliveryError as err:
            if 400 <= err.status < 500 and err.status != 429:
                raise
            if attempt == MAX_ATTEMPTS - 1:
                raise
            sleep(backoff_delay(attempt))
EOF

cat > webhooks/handler.py <<'EOF'
from webhooks.retry import DeliveryError, deliver_with_retry


def handle_stripe_event(event, send, store):
    try:
        deliver_with_retry(send, event)
    except DeliveryError as err:
        store.mark_failed(event["id"], err.status)
        return False
    store.mark_delivered(event["id"])
    return True
EOF

cat > tests/test_retry.py <<'EOF'
import unittest

from webhooks.retry import DeliveryError, deliver_with_retry


def flaky(failures, status=503):
    calls = {"n": 0}

    def send(event):
        calls["n"] += 1
        if calls["n"] <= failures:
            raise DeliveryError(status)
        return "ok"

    return send, calls


class RetryTest(unittest.TestCase):
    def test_succeeds_after_transient_failures(self):
        send, calls = flaky(2)
        self.assertEqual(deliver_with_retry(send, {"id": "evt_1"}, sleep=lambda s: None), "ok")
        self.assertEqual(calls["n"], 3)

    def test_client_error_is_not_retried(self):
        send, calls = flaky(1, status=400)
        with self.assertRaises(DeliveryError):
            deliver_with_retry(send, {"id": "evt_2"}, sleep=lambda s: None)
        self.assertEqual(calls["n"], 1)


if __name__ == "__main__":
    unittest.main()
EOF

save "2026-09-01T10:00:00-04:00" "feat(webhooks): retry failed deliveries with backoff"

git checkout -q -b fix/retry-webhook-delivery

cat > webhooks/retry.py <<'EOF'
import random
import time

MAX_ATTEMPTS = 5
BASE_DELAY = 1.0


class DeliveryError(Exception):
    def __init__(self, status, retry_after=None):
        super().__init__(f"delivery failed with status {status}")
        self.status = status
        self.retry_after = retry_after


def backoff_delay(attempt, retry_after=None):
    if retry_after is not None:
        return float(retry_after)
    delay = BASE_DELAY * (2 ** attempt)
    return random.uniform(0, delay)
EOF
save "2026-10-06T23:41:00-04:00" "fix(webhooks): add full jitter to retry backoff"

cat >> webhooks/retry.py <<'EOF'


def deliver_with_retry(send, event, sleep=time.sleep):
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            return send(event)
        except DeliveryError as err:
            if 400 <= err.status < 500 and err.status != 429:
                raise
            if attempt == MAX_ATTEMPTS - 1:
                raise
            sleep(backoff_delay(attempt, err.retry_after))
EOF
save "2026-10-07T00:52:00-04:00" "fix(webhooks): honor Retry-After on 429 and count attempts from 1"
