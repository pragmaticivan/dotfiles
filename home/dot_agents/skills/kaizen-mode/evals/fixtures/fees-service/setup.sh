#!/usr/bin/env bash
set -euo pipefail
export GIT_AUTHOR_NAME="Dana Reyes" GIT_AUTHOR_EMAIL="dana@example.com"
export GIT_COMMITTER_NAME="Dana Reyes" GIT_COMMITTER_EMAIL="dana@example.com"
commit() {
  GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -q -m "$2"
}

git init -q -b main
printf "pr-96.json\nsetup.sh\n" >> .git/info/exclude

cat > fees.py <<'PY'
BASE_FEE = 4.00


def delivery_fee(distance_km: float) -> float:
    return BASE_FEE + 0.5 * distance_km
PY
cat > test_fees.py <<'PY'
import unittest

from fees import delivery_fee


class FeeTest(unittest.TestCase):
    def test_distance(self):
        self.assertEqual(delivery_fee(10), 9.0)


if __name__ == "__main__":
    unittest.main()
PY
git add fees.py test_fees.py
commit "2026-09-01T10:00:00Z" "feat: add delivery fee"

git checkout -q -b feat/weekend-surcharge
cat > fees.py <<'PY'
BASE_FEE = 4.00
WEEKEND_SURCHARGE = 1.50


def delivery_fee(distance_km: float, weekend: bool = False) -> float:
    fee = BASE_FEE + 0.5 * distance_km
    return fee + WEEKEND_SURCHARGE if weekend else fee
PY
cat >> test_fees.py <<'PY'


class WeekendTest(unittest.TestCase):
    def test_weekend(self):
        self.assertEqual(delivery_fee(10, weekend=True), 10.5)
PY
git add fees.py test_fees.py
commit "2026-09-02T10:00:00Z" "feat: add weekend surcharge"

git checkout -q main
cat > fees.py <<'PY'
BASE_FEE = 4.00
MIN_FEE = 5.00


def delivery_fee(distance_km: float) -> float:
    return max(MIN_FEE, BASE_FEE + 0.5 * distance_km)
PY
cat >> test_fees.py <<'PY'


class MinimumTest(unittest.TestCase):
    def test_minimum(self):
        self.assertEqual(delivery_fee(0), 5.0)
PY
git add fees.py test_fees.py
commit "2026-09-03T10:00:00Z" "feat: add minimum delivery fee"

git checkout -q feat/weekend-surcharge
