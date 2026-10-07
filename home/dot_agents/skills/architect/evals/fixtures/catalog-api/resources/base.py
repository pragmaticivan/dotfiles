import re
from dataclasses import dataclass


class NotFound(Exception):
    pass


class ValidationError(Exception):
    pass


@dataclass
class Response:
    status: int
    body: object


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
