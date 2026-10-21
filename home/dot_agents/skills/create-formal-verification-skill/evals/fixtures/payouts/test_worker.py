import unittest

from payouts import bank
from payouts.worker import connect, run_once


class WorkerTest(unittest.TestCase):
    def setUp(self):
        bank.SENT.clear()
        self.conn = connect(":memory:")
        self.conn.execute("INSERT INTO payouts (account, cents) VALUES ('acct-1', 500), ('acct-2', 900)")

    def test_pays_each_pending_payout(self):
        self.assertEqual(run_once(self.conn, "w1"), 2)
        self.assertEqual(len(bank.SENT), 2)

    def test_second_pass_pays_nothing(self):
        run_once(self.conn, "w1")
        self.assertEqual(run_once(self.conn, "w2"), 0)
        self.assertEqual(len(bank.SENT), 2)


if __name__ == "__main__":
    unittest.main()
