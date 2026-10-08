import unittest
from datetime import date

from src.billing.prorate import compute_proration_credit


class ProrateTest(unittest.TestCase):
    def test_half_cycle_downgrade(self):
        credit = compute_proration_credit(6000, 3000, date(2026, 9, 1), date(2026, 10, 1), date(2026, 9, 16))
        self.assertEqual(credit, 1500)

    def test_change_on_last_day_gives_no_credit(self):
        credit = compute_proration_credit(6000, 3000, date(2026, 9, 1), date(2026, 10, 1), date(2026, 10, 1))
        self.assertEqual(credit, 0)

    def test_change_outside_cycle_is_rejected(self):
        with self.assertRaises(ValueError):
            compute_proration_credit(6000, 3000, date(2026, 9, 1), date(2026, 10, 1), date(2026, 10, 2))


if __name__ == "__main__":
    unittest.main()
