import logging

from httpwrap import HttpClient, RequestFailed
from httpwrap.client import Response

logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s %(message)s")

calls = []
slept = []


def always_503(method, url, body, timeout):
    calls.append(timeout)
    return Response(503, {}, b"")


client = HttpClient(transport=always_503, sleep=slept.append)
try:
    client.get("https://inventory.internal/items")
except RequestFailed as e:
    print("error:", e)
print("transport calls:", len(calls), "timeout per call:", calls[0])
print("sleeps:", slept)
