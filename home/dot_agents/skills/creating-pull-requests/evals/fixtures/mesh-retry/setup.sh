#!/usr/bin/env bash
set -euo pipefail
export GIT_AUTHOR_NAME="Sam Okafor" GIT_AUTHOR_EMAIL="sam@example.com"
export GIT_COMMITTER_NAME="Sam Okafor" GIT_COMMITTER_EMAIL="sam@example.com"
commit() {
  GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -q -m "$2"
}

git init -q -b main
printf "pr-482.json\nsetup.sh\n" >> .git/info/exclude
mkdir -p mesh tests config

cat > mesh/__init__.py <<'PY'
PY

cat > mesh/config.py <<'PY'
from dataclasses import dataclass


@dataclass(frozen=True)
class RetryPolicy:
    max_attempts: int = 3
    backoff_ms: int = 100


@dataclass(frozen=True)
class HealthCheck:
    interval_s: int = 30
    unhealthy_after: int = 3


@dataclass(frozen=True)
class UpstreamConfig:
    name: str
    retry: RetryPolicy = RetryPolicy()
    health: HealthCheck = HealthCheck()
PY

cat > mesh/client.py <<'PY'
from mesh.config import UpstreamConfig


class UpstreamError(Exception):
    pass


class Client:
    def __init__(self, config: UpstreamConfig, send):
        self.config = config
        self.send = send

    def call(self, request):
        last = None
        for _ in range(self.config.retry.max_attempts):
            try:
                return self.send(request)
            except UpstreamError as err:
                last = err
        raise last
PY

cat > config/payments.yaml <<'YAML'
name: payments
retry:
  max_attempts: 3
  backoff_ms: 100
health:
  interval_s: 30
  unhealthy_after: 3
YAML

cat > tests/test_client.py <<'PY'
import unittest

from mesh.client import Client, UpstreamError
from mesh.config import UpstreamConfig


def flaky(failures):
    calls = {"n": 0}

    def send(request):
        calls["n"] += 1
        if calls["n"] <= failures:
            raise UpstreamError("503")
        return "ok"

    return send, calls


class ClientTest(unittest.TestCase):
    def test_retries_until_success(self):
        send, calls = flaky(2)
        self.assertEqual(Client(UpstreamConfig("payments"), send).call("r"), "ok")
        self.assertEqual(calls["n"], 3)


if __name__ == "__main__":
    unittest.main()
PY

git add -A
commit "2026-08-20T09:00:00Z" "feat: add mesh upstream client with retries"

git checkout -q -b service-mesh-retry-budgets

cat > mesh/budget.py <<'PY'
from collections import deque


class RetryBudget:
    """Allow retries only while they stay under `ratio` of recent requests."""

    def __init__(self, ratio: float, min_retries_per_s: int, window_s: int, clock):
        self.ratio = ratio
        self.min_retries_per_s = min_retries_per_s
        self.window_s = window_s
        self.clock = clock
        self.requests = deque()
        self.retries = deque()

    def _trim(self, events):
        cutoff = self.clock() - self.window_s
        while events and events[0] < cutoff:
            events.popleft()

    def record_request(self):
        self.requests.append(self.clock())

    def try_retry(self) -> bool:
        self._trim(self.requests)
        self._trim(self.retries)
        allowed = max(
            self.ratio * len(self.requests),
            self.min_retries_per_s * self.window_s,
        )
        if len(self.retries) >= allowed:
            return False
        self.retries.append(self.clock())
        return True
PY

cat > mesh/config.py <<'PY'
from dataclasses import dataclass


@dataclass(frozen=True)
class RetryPolicy:
    max_attempts: int = 3
    backoff_ms: int = 100


@dataclass(frozen=True)
class RetryBudgetConfig:
    ratio: float = 0.2
    min_retries_per_s: int = 10
    window_s: int = 10


@dataclass(frozen=True)
class HealthCheck:
    interval_s: int = 30
    unhealthy_after: int = 3


@dataclass(frozen=True)
class UpstreamConfig:
    name: str
    retry: RetryPolicy = RetryPolicy()
    budget: RetryBudgetConfig = RetryBudgetConfig()
    health: HealthCheck = HealthCheck()
PY

cat > mesh/client.py <<'PY'
from mesh.config import UpstreamConfig


class UpstreamError(Exception):
    pass


class Client:
    def __init__(self, config: UpstreamConfig, send, budget):
        self.config = config
        self.send = send
        self.budget = budget

    def call(self, request):
        self.budget.record_request()
        last = None
        for attempt in range(self.config.retry.max_attempts):
            if attempt and not self.budget.try_retry():
                break
            try:
                return self.send(request)
            except UpstreamError as err:
                last = err
        raise last
PY

cat > config/payments.yaml <<'YAML'
name: payments
retry:
  max_attempts: 3
  backoff_ms: 100
budget:
  ratio: 0.2
  min_retries_per_s: 10
  window_s: 10
health:
  interval_s: 30
  unhealthy_after: 3
YAML

cat > tests/test_client.py <<'PY'
import unittest

from mesh.budget import RetryBudget
from mesh.client import Client, UpstreamError
from mesh.config import UpstreamConfig


def flaky(failures):
    calls = {"n": 0}

    def send(request):
        calls["n"] += 1
        if calls["n"] <= failures:
            raise UpstreamError("503")
        return "ok"

    return send, calls


def budget(ratio=0.2, floor=10):
    return RetryBudget(ratio, floor, 10, clock=lambda: 0.0)


class ClientTest(unittest.TestCase):
    def test_retries_until_success(self):
        send, calls = flaky(2)
        client = Client(UpstreamConfig("payments"), send, budget())
        self.assertEqual(client.call("r"), "ok")
        self.assertEqual(calls["n"], 3)

    def test_exhausted_budget_stops_retries(self):
        send, calls = flaky(99)
        client = Client(UpstreamConfig("payments"), send, budget(0.0, 0))
        with self.assertRaises(UpstreamError):
            client.call("r")
        self.assertEqual(calls["n"], 1)


if __name__ == "__main__":
    unittest.main()
PY

git add -A
commit "2026-09-10T11:00:00Z" "feat: cap mesh retries with a per-upstream budget"

cat > mesh/breaker.py <<'PY'
class CircuitBreaker:
    """Open after `failure_threshold` consecutive failures for `open_s` seconds."""

    def __init__(self, failure_threshold: int, open_s: float, clock):
        self.failure_threshold = failure_threshold
        self.open_s = open_s
        self.clock = clock
        self.failures = 0
        self.opened_at = None

    def allow(self) -> bool:
        if self.opened_at is None:
            return True
        if self.clock() - self.opened_at >= self.open_s:
            self.opened_at = None
            self.failures = self.failure_threshold - 1
            return True
        return False

    def record(self, ok: bool):
        if ok:
            self.failures = 0
            return
        self.failures += 1
        if self.failures >= self.failure_threshold:
            self.opened_at = self.clock()
PY

sed -i.bak 's/^class HealthCheck:/class BreakerConfig:\
    failure_threshold: int = 5\
    open_s: int = 30\
\
\
@dataclass(frozen=True)\
class HealthCheck:/' mesh/config.py
sed -i.bak 's/^    budget: RetryBudgetConfig = RetryBudgetConfig()$/&\
    breaker: BreakerConfig = BreakerConfig()/' mesh/config.py
rm mesh/config.py.bak

cat >> config/payments.yaml <<'YAML'
breaker:
  failure_threshold: 5
  open_s: 30
YAML

cat > tests/test_breaker.py <<'PY'
import unittest

from mesh.breaker import CircuitBreaker


class BreakerTest(unittest.TestCase):
    def test_opens_after_threshold_then_half_opens(self):
        now = {"t": 0.0}
        breaker = CircuitBreaker(3, 30, clock=lambda: now["t"])
        for _ in range(3):
            breaker.record(False)
        self.assertFalse(breaker.allow())
        now["t"] = 30.0
        self.assertTrue(breaker.allow())
        breaker.record(False)
        self.assertFalse(breaker.allow())


if __name__ == "__main__":
    unittest.main()
PY

git add -A
commit "2026-09-14T16:20:00Z" "feat: add circuit breaker thresholds to mesh config"

sed -i.bak 's/interval_s: int = 30/interval_s: int = 10/; s/unhealthy_after: int = 3/unhealthy_after: int = 2/' mesh/config.py
sed -i.bak 's/interval_s: 30/interval_s: 10/; s/unhealthy_after: 3/unhealthy_after: 2/' config/payments.yaml
rm mesh/config.py.bak config/payments.yaml.bak
cat > mesh/health.py <<'PY'
from mesh.config import HealthCheck


def is_unhealthy(check: HealthCheck, recent_results: list[bool]) -> bool:
    tail = recent_results[-check.unhealthy_after:]
    return len(tail) == check.unhealthy_after and not any(tail)


def detection_time_s(check: HealthCheck) -> int:
    return check.interval_s * check.unhealthy_after
PY

git add -A
commit "2026-09-18T10:05:00Z" "fix: detect dead payments hosts in 20s instead of 90s"
