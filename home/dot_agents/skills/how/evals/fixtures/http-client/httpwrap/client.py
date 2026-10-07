import logging
import time
import urllib.error
import urllib.request

from httpwrap import config
from httpwrap.backoff import delay_for

log = logging.getLogger("httpwrap")


class RequestFailed(Exception):
    def __init__(self, status, attempts):
        super().__init__(f"request failed with status {status} after {attempts} attempts")
        self.status = status
        self.attempts = attempts


class Response:
    def __init__(self, status, headers, body):
        self.status = status
        self.headers = headers
        self.body = body


def urllib_transport(method, url, body, timeout):
    req = urllib.request.Request(url, data=body, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return Response(r.status, dict(r.headers), r.read())
    except urllib.error.HTTPError as e:
        return Response(e.code, dict(e.headers), e.read())


class HttpClient:
    def __init__(self, transport=urllib_transport, sleep=time.sleep):
        self._transport = transport
        self._sleep = sleep

    def request(self, method, url, body=None):
        retry_number = 0
        while True:
            try:
                resp = self._transport(method, url, body, config.TIMEOUT_SECONDS)
            except (ConnectionError, TimeoutError) as e:
                if retry_number >= config.MAX_RETRIES:
                    raise
                delay = delay_for(retry_number)
                log.warning("retrying %s %s after %s, sleeping %.2fs", method, url, type(e).__name__, delay)
            else:
                if resp.status not in config.RETRYABLE_STATUS:
                    if resp.status >= 400:
                        raise RequestFailed(resp.status, retry_number + 1)
                    return resp
                if retry_number >= config.MAX_RETRIES:
                    raise RequestFailed(resp.status, retry_number + 1)
                delay = delay_for(retry_number, resp.headers.get("Retry-After"))
                log.warning("retrying %s %s after status %d, sleeping %.2fs", method, url, resp.status, delay)
            self._sleep(delay)
            retry_number += 1

    def get(self, url):
        return self.request("GET", url)

    def post(self, url, body):
        return self.request("POST", url, body)
