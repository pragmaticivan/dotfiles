# payouts

Pays out pending payouts through the bank transfer API. We run three worker
processes against the same SQLite file, each calling `run_once` on a timer.

Promise to finance: each payout is sent to the bank at most once.

Run the tests with `python3 -m unittest`.
