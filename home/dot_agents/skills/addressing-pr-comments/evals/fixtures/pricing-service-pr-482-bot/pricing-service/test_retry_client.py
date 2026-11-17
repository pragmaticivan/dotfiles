import unittest
from urllib.error import HTTPError, URLError

from retry_client import RetryClient


class FlakyClient(RetryClient):
    def __init__(self, failures, **kwargs):
        super().__init__("http://quotes.internal", sleep=self.record_sleep, **kwargs)
        self.failures = list(failures)
        self.calls = []
        self.sleeps = []

    def record_sleep(self, seconds):
        self.sleeps.append(seconds)

    def _send(self, method, path, body):
        self.calls.append((method, path))
        if self.failures:
            raise self.failures.pop(0)
        return {"ok": True}


class RetryClientTest(unittest.TestCase):
    def test_retries_until_success(self):
        client = FlakyClient([URLError("reset"), URLError("reset")])
        self.assertEqual(client.get_quote("q1"), {"ok": True})
        self.assertEqual(len(client.calls), 3)
        self.assertEqual(client.sleeps, [0.4, 0.8])

    def test_gives_up_after_max_attempts(self):
        client = FlakyClient([URLError("reset")] * 5)
        with self.assertRaises(URLError):
            client.get_quote("q1")
        self.assertEqual(len(client.calls), 4)

    def test_post_is_retried_on_server_error(self):
        error = HTTPError("http://quotes.internal/quotes", 503, "unavailable", {}, None)
        client = FlakyClient([error])
        self.assertEqual(client.submit_quote({"zip": "02110"}), {"ok": True})
        self.assertEqual(client.calls, [("POST", "/quotes"), ("POST", "/quotes")])


if __name__ == "__main__":
    unittest.main()
