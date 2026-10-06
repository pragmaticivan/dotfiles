import json
import sys

import requests

BILLING_URL = "https://billing.example.com/api/invoices"


def main() -> int:
    payload = json.load(open(sys.argv[1]))
    response = requests.post(BILLING_URL, json=payload, timeout=30)
    print(response.status_code, response.text)
    return 0 if response.ok else 1


if __name__ == "__main__":
    sys.exit(main())
