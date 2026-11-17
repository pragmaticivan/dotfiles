import json
import random
import time
import urllib.request
from urllib.error import HTTPError, URLError

DEFAULT_TIMEOUT = 5.0
MAX_ATTEMPTS = 4


class RetryClient:
    """HTTP client for the quote API that retries failed requets with exponential backoff."""

    def __init__(self, base_url, max_attempts=MAX_ATTEMPTS, base_delay=0.2, sleep=time.sleep):
        self.base_url = base_url.rstrip("/")
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.sleep = sleep

    def get_quote(self, quote_id):
        return self._request("GET", f"/quotes/{quote_id}")

    def submit_quote(self, quote):
        return self._request("POST", "/quotes", body=quote)

    def _request(self, method, path, body=None):
        attempt = 0
        while True:
            attempt += 1
            try:
                return self._send(method, path, body)
            except (HTTPError, URLError):
                if attempt >= self.max_attempts:
                    raise
                self.sleep(self.base_delay * 2 ** attempt)

    def _send(self, method, path, body):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(
            self.base_url + path,
            data=data,
            method=method,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=DEFAULT_TIMEOUT) as resp:
            return json.loads(resp.read())
